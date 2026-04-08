import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function log(level: string, msg: string, meta?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { markdown } = await req.json();

    if (!markdown || typeof markdown !== 'string') {
      return new Response(
        JSON.stringify({ success: true, locations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      log('error', 'LOVABLE_API_KEY not configured', { reqId });
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured', locations: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const truncated = markdown.length > 8000 ? markdown.slice(0, 8000) : markdown;

    log('info', 'LLM extraction started', { reqId, inputLength: truncated.length });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a location extraction specialist. Given website markdown content, extract ALL physical office/headquarters addresses. Rules:
- Exclude PO Boxes and virtual offices
- Exclude mail forwarding addresses
- Standardize each location to: City, State/Region, Country
- Do NOT include street addresses, just City, State/Region, Country
- If a location only has City and Country (no state/region), that's fine
- If no locations found, return empty array`,
          },
          {
            role: 'user',
            content: `Extract all physical office locations from this website content:\n\n${truncated}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_locations',
              description: 'Report the extracted physical office locations',
              parameters: {
                type: 'object',
                properties: {
                  locations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of locations in "City, State/Region, Country" format',
                  },
                },
                required: ['locations'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'report_locations' } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'AI gateway error', { reqId, status: response.status });
      return new Response(
        JSON.stringify({ success: false, error: `AI gateway error: ${response.status}`, locations: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      log('warn', 'No tool call in response', { reqId });
      return new Response(
        JSON.stringify({ success: true, locations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const locations: string[] = (parsed.locations || []).filter(
      (loc: string) => loc && typeof loc === 'string' && loc.trim().length > 0
    );

    log('info', 'Extraction complete', { reqId, locationCount: locations.length });

    return new Response(
      JSON.stringify({ success: true, locations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log('error', 'Extract-locations failed', { reqId, error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', locations: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
