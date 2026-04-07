import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const AFFINITY_BASE = "https://api.affinity.co/v2";

interface AffinityRequestBody {
  listId: string;
  savedViewId?: string;
  userId?: string;
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "2", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    return res;
  }
  throw new Error("Affinity API rate limit exceeded after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AFFINITY_API_KEY = Deno.env.get("AFFINITY_API_KEY");
    if (!AFFINITY_API_KEY) {
      return new Response(JSON.stringify({ error: "AFFINITY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AffinityRequestBody = await req.json();
    if (!body.listId || typeof body.listId !== "string") {
      return new Response(JSON.stringify({ error: "listId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const affinityHeaders: Record<string, string> = {
      Authorization: `Bearer ${AFFINITY_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Build base URL
    let baseUrl: string;
    if (body.savedViewId) {
      baseUrl = `${AFFINITY_BASE}/lists/${encodeURIComponent(body.listId)}/saved-views/${encodeURIComponent(body.savedViewId)}/list-entries`;
    } else {
      baseUrl = `${AFFINITY_BASE}/lists/${encodeURIComponent(body.listId)}/list-entries`;
    }

    // Paginate through all entries
    const allEntries: unknown[] = [];
    let cursor: string | null = null;

    do {
      const params = new URLSearchParams({
        limit: "100",
        fieldTypes: "enriched",
      });
      params.append("fieldTypes", "global");
      params.append("fieldTypes", "list");
      if (cursor) params.set("cursor", cursor);

      const url = `${baseUrl}?${params.toString()}`;
      const res = await fetchWithRetry(url, affinityHeaders);

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `Affinity API error [${res.status}]: ${errText}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const entries = data.data || data;
      if (Array.isArray(entries)) {
        allEntries.push(...entries);
      }

      cursor = data.pagination?.nextCursor || null;
    } while (cursor);

    return new Response(JSON.stringify({ entries: allEntries, count: allEntries.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("affinity-sync error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
