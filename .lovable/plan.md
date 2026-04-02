

# Enhanced Company Location Discovery Pipeline

## What Already Exists
The current pipeline (lines 234-322 of `Index.tsx`) already does: domain parsing → cache check → map → scrape top 2 → regex extraction → upsert. The extraction utility (`extract-location.ts`) uses regex heuristics. The user wants two upgrades:

1. **LLM-based extraction** as primary, regex as fallback
2. **PO Box filtering** and **City, State/Region, Country standardization**

## Plan

### 1. Create LLM extraction edge function
**New file: `supabase/functions/extract-locations/index.ts`**

- Accepts `{ markdown: string }` in the request body
- Uses the `LOVABLE_API_KEY` (already available) to call the AI gateway for structured extraction
- System prompt instructs the LLM to find all physical office addresses, exclude PO Boxes, and standardize to `City, State/Region, Country` format
- Returns `{ success: true, locations: string[] }`
- Falls back to empty array on failure (caller will use regex fallback)

### 2. Add `extractLocationsViaLLM` to `src/lib/api/firecrawl.ts`
New method that invokes the `extract-locations` edge function. Returns `string[]`.

### 3. Update `extractCompanyLocationsFromMarkdown` in `src/lib/extract-location.ts`
- Add PO Box filter: remove any location matching `/\bP\.?O\.?\s*Box\b/i`
- Add basic standardization: strip street-level detail, trim to "City, Region, Country" where possible
- This remains the regex fallback

### 4. Update orchestration in `src/pages/Index.tsx` (lines 296-299)
Replace:
```ts
const extractedLocs = extractCompanyLocationsFromMarkdown(mergedMarkdown);
```
With:
```ts
// Try LLM extraction first
let extractedLocs = await extractLocationsViaLLM(mergedMarkdown);
// Fallback to regex if LLM returns nothing
if (extractedLocs.length === 0) {
  extractedLocs = extractCompanyLocationsFromMarkdown(mergedMarkdown);
}
```

### 5. No database changes needed
Schema already supports `text[]` for `hq_locations` and `company_location_raw`.

## Technical Details

**Edge function prompt design:**
```
You are a location extraction specialist. Given website markdown content, extract ALL physical office/headquarters addresses. Rules:
- Exclude PO Boxes and virtual offices
- Standardize each to: City, State/Region, Country
- Return as JSON array of strings
- If no locations found, return empty array
```

Uses Firecrawl's JSON extraction format or a direct LLM call via the AI gateway. The edge function uses `LOVABLE_API_KEY` which is already configured.

**Credit impact:** +0 Firecrawl credits (LLM call uses Lovable API, not Firecrawl). The map + scrape cost remains unchanged at 2-3 credits per new domain.

**Files changed:**
- `supabase/functions/extract-locations/index.ts` (new)
- `src/lib/api/firecrawl.ts` (add method)
- `src/lib/extract-location.ts` (add PO Box filter + standardization)
- `src/pages/Index.tsx` (use LLM-first extraction)

