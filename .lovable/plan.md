

# Fix: Google CAPTCHA Blocking Person Location Discovery

## Problem
Google is returning a 429 CAPTCHA page instead of search results when Firecrawl scrapes the SERP. The scrape technically "succeeds" (Firecrawl returns `success: true` with the CAPTCHA HTML), so the code never falls back to the Firecrawl search API. The YrbPuc element is absent because the page is a CAPTCHA, not real results.

## Root Cause
Line 45 checks `scrapeResult.success`, but Firecrawl reports success even when Google returns a 429 CAPTCHA. The code should detect the CAPTCHA/429 and treat it as a failure.

## Fix

**Edit `src/hooks/useDiscovery.ts`** — after checking `scrapeResult.success`, also check for CAPTCHA indicators before trusting the HTML:

1. Check `scrapeResult.data?.metadata?.statusCode === 429` or if the HTML contains the Google CAPTCHA signature (`/sorry/index` or `g-recaptcha`)
2. If detected, fall through to the Firecrawl search API fallback (same code currently in the `else` branch)
3. Restructure so the fallback runs when scrape fails OR when CAPTCHA is detected

### Technical detail

```text
Before:
  if (scrapeResult.success) {
    // try YrbPuc extraction
    // if not found → dead end, no fallback
  } else {
    // fallback to search API
  }

After:
  let usedScrape = false;
  if (scrapeResult.success) {
    const html = scrapeResult.data?.html || '';
    const statusCode = scrapeResult.data?.metadata?.statusCode;
    const isCaptcha = statusCode === 429 || /google\.com\/sorry/i.test(html);
    if (!isCaptcha) {
      const locFromHtml = extractLocationFromGoogleHtml(html);
      if (locFromHtml) {
        personLoc = locFromHtml;
        personSnippet = locFromHtml;
        usedScrape = true;
      }
    }
  }
  if (!usedScrape) {
    // fallback to Firecrawl search API
  }
```

This is a single-file change (~20 lines modified).

