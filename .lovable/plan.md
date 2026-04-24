
## Goal

Replace the Firecrawl `/search` call for person location with a single `firecrawl.scrape` against a Google SERP URL, then run all three extraction methods on that one HTML response.

## Google SERP URL (already constructed)

`useDiscovery.ts` already builds:
```ts
const personQuery = `site:linkedin.com/in/ ${contact.name} ${contact.company_name} Location`;
const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(personQuery)}`;
```
e.g. → `https://www.google.com/search?q=site%3Alinkedin.com%2Fin%2F+Don+Becker+Garden+Homes+Location`

No URL change needed — it already matches your example.

## Changes

### 1. `src/lib/extract-location.ts` — add SERP parser

Add a new function `extractPersonLocationCandidatesFromSerpHtml(html)` that returns an array of `{ value, method, url }`:

- **Method 1 — `<em>Location</em>: XXX ·`**
  Regex over the raw HTML, walking each match within its enclosing result block to also pick up the nearest result URL (anchor `href` to `linkedin.com/in/...`). Captures everything between `</em>: ` and the next ` ·` (or `<` if no bullet).

- **Method 2 — `div.YrbPuc span` text**
  DOMParse the HTML, query all `div.YrbPuc span`, pair each with the nearest ancestor result block's anchor href.

- **Method 3 — URL subdomain**
  For every anchor href matching `^https?://([a-z]{2})\.linkedin\.com/in/`, emit a low-score candidate `LinkedIn country: XX`.

All three return a unified candidate list. Existing `cleanLocation()` is reused.

### 2. `src/hooks/useDiscovery.ts` — swap search → scrape

Replace the `firecrawlApi.search(personQuery, ...)` block (lines 67–143) with:

```ts
const personResult = await firecrawlApi.scrape(googleSearchUrl, {
  formats: ["html"],
  onlyMainContent: false,
});
```

Then:
- Read `personResult.data?.html` (or `.data?.data?.html` per existing normalization pattern)
- Call `extractPersonLocationCandidatesFromSerpHtml(html)` once
- Push each candidate into `personLocationCandidates` with the existing `scoreLocation()` (the method strings already cover `Location: label`, `YrbPuc`, and `subdomain`)
- Keep the existing winner-selection, `personSnippet` formatting, and activity log unchanged

Remove the now-unused per-result loop, `result.description` parsing, and the `extractLocationCandidatesFromDescription` import (kept in `extract-location.ts` for tests / company use, but no longer imported here).

### 3. `src/test/extract-location.test.ts` — add SERP fixture tests

Add a `describe('extractPersonLocationCandidatesFromSerpHtml')` block with synthetic HTML:
- Fixture with `<em>Location</em>: Short Hills, New Jersey, United States · …` → returns Method 1 candidate
- Fixture with `<div class="YrbPuc"><span>London, England, United Kingdom</span></div>` → returns Method 2 candidate
- Fixture with `<a href="https://uk.linkedin.com/in/jane-doe">…</a>` → returns Method 3 `LinkedIn country: UK` candidate
- Combined fixture → returns all three

## Out of scope (per your prior "No")

- No splitter regex change
- No fallback to `firecrawl.search`
- No company-pipeline changes

## Files touched

- `src/lib/extract-location.ts` — add one exported function
- `src/hooks/useDiscovery.ts` — swap search → scrape, simplify candidate-collection block
- `src/test/extract-location.test.ts` — add SERP parser tests

## Cost impact

Person step: 1 `search` + up to 10 result scrapes (~11 credits) → 1 `scrape` of the Google SERP (1 credit). ~10× reduction per contact.
