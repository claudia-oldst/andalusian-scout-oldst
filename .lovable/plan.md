

# Fix: Extract Clean Location from Firecrawl Search via Markdown

## Problem
The discovery workflow stores raw search `description` text as the location. For LinkedIn results, this includes the person's name, follower count, connections, etc. — not just the location.

## Solution
Use Firecrawl search with `scrapeOptions: { formats: ['markdown'] }` to get markdown content from the top result, then extract the location from the `defaultLocalizedName` field pattern found in LinkedIn's markdown output.

## Changes

### 1. `src/pages/Index.tsx` — `runDiscoveryForContact`

**Person location extraction (lines 189-196):**
- Change the search call to include `scrapeOptions: { formats: ['markdown'] }` so the top result includes markdown content
- After getting the top result, check for `top.markdown` 
- Parse the markdown with a regex to find `defaultLocalizedName` values — pattern: `"defaultLocalizedName"\s*:\s*"([^"]+)"` or the plain-text equivalent that appears in LinkedIn markdown (e.g., the location span text near the person's name)
- Also add a fallback regex for the pattern `City of X, Region, Country` or similar geographic text
- Use the extracted location string as `personLoc` instead of the raw description
- Keep the full description/markdown in `personSnippet` for the activity log audit trail

**Company location extraction (lines 209-219):**
- Same approach: request markdown in scrapeOptions, parse for headquarters/location patterns

### 2. Helper function — `extractLocationFromMarkdown`

Add a utility function (in Index.tsx or a separate util) that:
1. Searches markdown for `defaultLocalizedName` pattern → returns the value if found
2. Falls back to looking for geographic patterns (city/region/country text near location-related keywords)
3. Returns empty string if nothing found

This keeps the extraction logic clean and testable.

### No edge function changes needed
The search edge function already passes `scrapeOptions` through to Firecrawl. The scrape edge function is not used in this flow.

