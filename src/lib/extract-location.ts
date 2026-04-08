/**
 * Extract a clean location string from Firecrawl markdown content.
 *
 * Priority:
 * 1. LinkedIn's `defaultLocalizedName` JSON field embedded in the page
 * 2. LinkedIn's plain-text location pattern (e.g. "City of Cape Town, Western Cape, South Africa")
 * 3. Falls back to empty string
 */
export function extractLocationFromMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Try LinkedIn's JSON-embedded defaultLocalizedName for location
  const jsonMatch = markdown.match(/"defaultLocalizedName"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return cleanLocation(jsonMatch[1]);
  }

  // 2. Try the plain-text span pattern from LinkedIn profiles
  const spanMatch = markdown.match(/(?:^|\n)\s*((?:City of\s+)?[A-Z][a-zA-Z\s]+,\s+[A-Z][a-zA-Z\s]+(?:,\s+[A-Z][a-zA-Z\s]+)?)\s*(?:\n|$)/m);
  if (spanMatch?.[1]) {
    const candidate = spanMatch[1].trim();
    if (candidate.length < 100 && candidate.includes(',')) {
      return cleanLocation(candidate);
    }
  }

  // 3. Try a broader pattern: look for "Location" or "location" label followed by text
  const labelMatch = markdown.match(/(?:Location|location|📍)\s*[:\-–]\s*(.+)/);
  if (labelMatch?.[1]) {
    const loc = labelMatch[1].trim().split('\n')[0].trim();
    if (loc.length < 100) {
      return cleanLocation(loc);
    }
  }

  return '';
}

/**
 * Extract ALL company locations from markdown content.
 * Returns an array of unique location strings.
 */
export function extractCompanyLocationsFromMarkdown(markdown: string): string[] {
  if (!markdown) return [];

  const locations: string[] = [];

  // 1. defaultLocalizedName (works for company pages too)
  const jsonMatches = markdown.matchAll(/"defaultLocalizedName"\s*:\s*"([^"]+)"/g);
  for (const m of jsonMatches) {
    if (m[1]) locations.push(cleanLocation(m[1]));
  }

  // 2. Headquarters patterns
  const hqPatterns = [
    /(?:Headquarters|headquarters|Head Office|head office|HQ|Based in)\s*[:\-–]?\s*(.+)/gi,
    /(?:Registered office address|registered office)\s*[:\-–]?\s*(.+)/gi,
    /(?:Office|Address|Location)\s*[:\-–]\s*(.+)/gi,
  ];
  for (const pattern of hqPatterns) {
    const matches = markdown.matchAll(pattern);
    for (const m of matches) {
      if (m[1]) {
        const loc = m[1].trim().split('\n')[0].trim();
        if (loc.length < 150 && loc.length > 3) {
          locations.push(cleanLocation(loc));
        }
      }
    }
  }

  // 3. Structured address blocks: multi-line with postal/ZIP codes
  // UK postcodes: SW1A 1AA, EC2N 4AY
  const ukPostcodeBlocks = markdown.matchAll(/([A-Z][a-zA-Z\s,]+\n[^,\n]+,?\s*[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2})/g);
  for (const m of ukPostcodeBlocks) {
    if (m[1] && m[1].length < 200) {
      locations.push(cleanLocation(m[1].replace(/\n/g, ', ')));
    }
  }

  // US ZIP codes: 10001, 94105
  const usZipBlocks = markdown.matchAll(/([A-Z][a-zA-Z\s,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/g);
  for (const m of usZipBlocks) {
    if (m[1] && m[1].length < 150) {
      locations.push(cleanLocation(m[1]));
    }
  }

  // 4. City, Region, Country patterns (general)
  const generalPatterns = markdown.matchAll(/(?:^|\n)\s*((?:City of\s+)?[A-Z][a-zA-Z\s]+,\s+[A-Z][a-zA-Z\s]+(?:,\s+[A-Z][a-zA-Z\s]+)?)\s*(?:\n|$)/gm);
  for (const m of generalPatterns) {
    const candidate = m[1]?.trim();
    if (candidate && candidate.length < 100 && candidate.includes(',') && candidate.length > 5) {
      // Exclude obvious non-locations
      if (!/followers|connections|See |posts|likes|employees/i.test(candidate)) {
        locations.push(cleanLocation(candidate));
      }
    }
  }

  // Filter PO Boxes
  const filtered = locations.filter((loc) => !/\bP\.?O\.?\s*Box\b/i.test(loc));

  // Deduplicate
  const seen = new Set<string>();
  return filtered.filter((loc) => {
    const key = loc.toLowerCase().trim();
    if (seen.has(key) || key.length === 0) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Legacy single-location extraction (kept for backward compat).
 */
export function extractCompanyLocationFromMarkdown(markdown: string): string {
  const locs = extractCompanyLocationsFromMarkdown(markdown);
  return locs[0] || '';
}

/**
 * Extract location from a LinkedIn search result description.
 */
export function extractLocationFromDescription(description: string): string {
  if (!description) return '';

  const segments = description.split(/\.\s+/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (
      trimmed.includes(',') &&
      trimmed.length < 80 &&
      trimmed.length > 5 &&
      /^(?:City of\s+)?[A-Z]/.test(trimmed) &&
      !/followers|connections|See |posts|likes|LinkedIn|profile|View\s/i.test(trimmed)
    ) {
      return cleanLocation(trimmed);
    }
  }

  return '';
}

/**
 * Extract location from Google SERP HTML by finding the YrbPuc div class.
 */
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

function cleanLocation(raw: string): string {
  let loc = raw.trim();
  loc = loc.replace(/[*_`#]+/g, '').trim();
  // Remove trailing periods or commas
  loc = loc.replace(/[.,]+$/, '').trim();
  return loc;
}
