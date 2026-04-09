

# Update Location Discovery: Firecrawl Search with HTML Scraping

## Problem
Google CAPTCHA blocks are preventing direct SERP scraping. The current flow uses Firecrawl Search but only gets text snippets — it doesn't request HTML from search results, so the `extractLocationFromGoogleHtml` (DOMParser-based `.YrbPuc span` extraction) is never used.

## Architecture

```text
Current:  Firecrawl Search → snippet text → regex "Location: X" → fallback: URL subdomain
Proposed: Firecrawl Search (with scrapeOptions: html) → per-result HTML → DOMParser (.YrbPuc) → fallback: snippet regex → fallback: URL subdomain
```

All Google requests route through Firecrawl's infrastructure (anti-bot, proxies) — no direct Google fetching.

## Changes

### 1. Edge Function: `supabase/functions/firecrawl-search/index.ts`
- Pass `scrapeOptions` from the client options through to the Firecrawl API body — this is already done (line 70: `scrapeOptions: options?.scrapeOptions`), so no change needed here. The edge function already forwards scrapeOptions correctly.

### 2. Frontend API call: `src/hooks/useDiscovery.ts`
- Update the `firecrawlApi.search()` call to include `scrapeOptions: { formats: ['html'] }` so Firecrawl returns HTML content for each search result.
- In the results loop, attempt `extractLocationFromGoogleHtml(result.html)` first (DOMParser for `.YrbPuc span`).
- If that fails, fall back to `extractLocationFromDescription(result.description)` (existing regex).
- If both fail, fall back to LinkedIn URL subdomain extraction (existing).

### 3. Extraction logic: `src/lib/extract-location.ts`
- Already has the DOMParser implementation for `extractLocationFromGoogleHtml`. No changes needed.
- Fallback chain is preserved: DOMParser → description regex → URL subdomain.

## Technical Details

**File: `src/hooks/useDiscovery.ts`** — lines 44-71

Change the search call to:
```typescript
const personResult = await firecrawlApi.search(personQuery, {
  limit: 5,
  scrapeOptions: { formats: ['html'] },
});
```

Update the results loop to try HTML extraction first:
```typescript
for (const result of results) {
  const description = result.description || "";
  snippets.push(`[${result.url || "?"}] ${description.slice(0, 200)}`);
  if (!personLoc) {
    // Try HTML DOM parsing first (Google SERP .YrbPuc span)
    const htmlContent = result.html || result.data?.html || "";
    if (htmlContent) {
      const fromHtml = extractLocationFromGoogleHtml(htmlContent);
      if (fromHtml) personLoc = fromHtml;
    }
    // Fallback to description regex
    if (!personLoc) {
      const extracted = extractLocationFromDescription(description);
      if (extracted) personLoc = extracted;
    }
  }
}
```

No other files need changes. The edge function already passes `scrapeOptions` through, and the extraction function already uses DOMParser.

## Notes
- Firecrawl handles anti-bot/proxy routing internally — no configuration needed on our side.
- Adding `scrapeOptions: { formats: ['html'] }` will use more Firecrawl credits per search (since it scrapes each result page). The `limit: 5` keeps this bounded.
- The `DOMParser` call in `extractLocationFromGoogleHtml` works in the browser environment where this code runs.

