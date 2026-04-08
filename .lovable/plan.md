

# Fix: LinkedIn-Only Person Location Discovery

## Problem
The person search query `"Name" "Company" location city` returns non-LinkedIn results (e.g., RocketReach). The extraction regex for `defaultLocalizedName` never matches because the markdown isn't from LinkedIn. The company search also returns irrelevant results (Companies House descriptions stored as raw location).

## Solution
Two-step pipeline for person location:
1. **Search** with `site:linkedin.com "Name" "Company"` to find the LinkedIn profile URL
2. **Scrape** that LinkedIn URL using `firecrawlApi.scrape()` to get full page markdown
3. **Extract** location from the scraped markdown using the existing `extractLocationFromMarkdown` (which targets `defaultLocalizedName`)

Company search stays as a separate search query (no LinkedIn restriction).

## Changes

### `src/pages/Index.tsx` — `runDiscoveryForContact`

**Person location (lines 180, 190-206):**
- Change query to: `site:linkedin.com "${contact.name}" "${contact.company_name}"`
- After search returns results, find the first result with a `linkedin.com` URL
- Call `firecrawlApi.scrape(linkedinUrl, { formats: ['markdown'] })` on that URL
- Extract location from the **scraped** markdown using `extractLocationFromMarkdown`
- Fall back to search result markdown/description if scrape fails
- Store scraped markdown snippet in activity log

**Company location (lines 216-229):**
- Keep the existing company search query pattern
- Fix the fallback: when `extractCompanyLocationFromMarkdown` returns empty, use the `description` field (which is usually a clean summary) instead of the full markdown. But also add a `Registered office address` regex to the company extractor since Companies House data contains that pattern.

### `src/lib/extract-location.ts` — `extractCompanyLocationFromMarkdown`

Add a pattern for "Registered office address" followed by the address text (covers Companies House results seen in the network data).

## Technical Notes
- The scrape step costs 1 additional Firecrawl credit per contact but ensures we get the actual LinkedIn page content with `defaultLocalizedName`
- Search with `site:linkedin.com` reliably returns LinkedIn profile URLs as top results
- The `firecrawlApi.scrape` function and edge function already exist and work

