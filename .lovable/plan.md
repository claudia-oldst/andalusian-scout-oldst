

# Fix: Use DOMParser for YrbPuc Location Extraction

## Problem
The current `extractLocationFromGoogleHtml` in `src/lib/extract-location.ts` uses fragile regex patterns to find the `YrbPuc` div. A proper DOM parser would be more reliable and simpler.

## Change (single file: `src/lib/extract-location.ts`, function `extractLocationFromGoogleHtml`)

Replace the regex-based extraction with `DOMParser`:

```typescript
export function extractLocationFromGoogleHtml(html: string): string {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const span = doc.querySelector('.YrbPuc span');
    const text = span?.textContent?.trim();
    if (text) {
      return cleanLocation(text);
    }
  } catch {
    // fall through
  }

  return '';
}
```

This replaces ~10 lines of regex with 5 lines of reliable DOM querying. The `.YrbPuc span` selector targets the first `<span>` inside the div — exactly `"London, England, United Kingdom"` from the HTML the user showed.

