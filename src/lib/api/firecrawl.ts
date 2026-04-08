import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

type SearchOptions = {
  limit?: number;
  lang?: string;
  country?: string;
  scrapeOptions?: { formats?: ('markdown' | 'html')[] };
};

type ScrapeOptions = {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links')[];
  onlyMainContent?: boolean;
  waitFor?: number;
};

type MapOptions = {
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
};

export const firecrawlApi = {
  async search(query: string, options?: SearchOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-search', {
      body: { query, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async map(url: string, options?: MapOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-map', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

export async function extractLocationsViaLLM(markdown: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke('extract-locations', {
      body: { markdown },
    });

    if (error) {
      console.warn('LLM extraction invocation failed:', error.message);
      return [];
    }

    if (data?.success && Array.isArray(data.locations)) {
      return data.locations;
    }

    return [];
  } catch (err) {
    console.warn('LLM extraction error:', err);
    return [];
  }
}
