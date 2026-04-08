

# Fix: Reorder Person Discovery — SERP Scrape First

## Problem
The Firecrawl Search API runs first and `extractLocationFromDescription` captures false positives (e.g. "View Rob Woodhead's profile on LinkedIn,"). Since `personLoc` gets set, the Google SERP scrape with YrbPuc extraction never runs — even though it would correctly extract "London, England, United Kingdom".

## Solution
Single file change in `src/hooks/useDiscovery.ts` (lines 39–73): swap the order.

### New flow
1. **Primary** — Build Google search URL from contact name + company → `firecrawlApi.scrape(googleSearchUrl, { formats: ['html'] })` → `extractLocationFromGoogleHtml` (DOMParser targeting `.YrbPuc span`)
2. **Fallback** — Only if scrape fails, hits CAPTCHA, or no YrbPuc found → `firecrawlApi.search()` → `extractLocationFromDescription`

### Secondary fix
In `src/lib/extract-location.ts`, tighten `extractLocationFromDescription` exclusion filter by adding `LinkedIn|profile|View\s` to prevent false positives even when used as fallback.

### Files changed
- `src/hooks/useDiscovery.ts` — reorder scrape-first, search-fallback (~20 lines rewritten)
- `src/lib/extract-location.ts` — one regex update in `extractLocationFromDescription`

