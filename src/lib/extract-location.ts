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
  //    Pattern: "defaultLocalizedName":"City of Cape Town, Western Cape, South Africa"
  const jsonMatch = markdown.match(/"defaultLocalizedName"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return cleanLocation(jsonMatch[1]);
  }

  // 2. Try the plain-text span pattern from LinkedIn profiles
  //    The location typically appears as a standalone line with city, region, country
  const spanMatch = markdown.match(/(?:^|\n)\s*((?:City of\s+)?[A-Z][a-zA-Z\s]+,\s+[A-Z][a-zA-Z\s]+(?:,\s+[A-Z][a-zA-Z\s]+)?)\s*(?:\n|$)/m);
  if (spanMatch?.[1]) {
    const candidate = spanMatch[1].trim();
    // Ensure it looks like a location (has comma-separated parts, not too long)
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
 * Extract company headquarters/location from markdown content.
 */
export function extractCompanyLocationFromMarkdown(markdown: string): string {
  if (!markdown) return '';

  // Try defaultLocalizedName (works for company pages too)
  const jsonMatch = markdown.match(/"defaultLocalizedName"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return cleanLocation(jsonMatch[1]);
  }

  // Try headquarters patterns
  const hqMatch = markdown.match(/(?:Headquarters|headquarters|Head Office|head office|HQ|Based in)\s*[:\-–]?\s*(.+)/i);
  if (hqMatch?.[1]) {
    const loc = hqMatch[1].trim().split('\n')[0].trim();
    if (loc.length < 100) {
      return cleanLocation(loc);
    }
  }

  // Try "Registered office address" pattern (Companies House)
  const regMatch = markdown.match(/Registered office address\s*[:\-–]?\s*(.+)/i);
  if (regMatch?.[1]) {
    const loc = regMatch[1].trim().split('\n')[0].trim();
    if (loc.length < 150) {
      return cleanLocation(loc);
    }
  }

  return '';
}

/**
 * Extract location from a LinkedIn search result description.
 * Format: "Name. Company University. City of Cape Town, Western Cape, South Africa. 699 followers..."
 */
export function extractLocationFromDescription(description: string): string {
  if (!description) return '';

  // Split by periods and look for a segment that looks like a location
  // (contains comma-separated parts with capitalized words, not too long)
  const segments = description.split(/\.\s+/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    // Must have a comma (city, region pattern) and look geographic
    if (
      trimmed.includes(',') &&
      trimmed.length < 80 &&
      trimmed.length > 5 &&
      // Should start with a capital letter or "City of"
      /^(?:City of\s+)?[A-Z]/.test(trimmed) &&
      // Should NOT contain typical non-location markers
      !/followers|connections|See |posts|likes/i.test(trimmed)
    ) {
      return cleanLocation(trimmed);
    }
  }

  return '';
}

/**
 * Extract location from Google SERP HTML by finding the YrbPuc div class
 * that Google uses for LinkedIn location metadata.
 * Pattern: <div class="YrbPuc"><span>Cape Town, Western Cape, South Africa</span>
 */
export function extractLocationFromGoogleHtml(html: string): string {
  if (!html) return '';

  // Match the YrbPuc class div containing location span
  const match = html.match(/<div[^>]*class="[^"]*YrbPuc[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
  if (match?.[1]) {
    return cleanLocation(match[1]);
  }

  // Broader fallback: look for any element with YrbPuc class
  const broader = html.match(/YrbPuc[^>]*>([^<]+)</i);
  if (broader?.[1]) {
    return cleanLocation(broader[1]);
  }

  return '';
}

function cleanLocation(raw: string): string {
  // Remove leading "City of " prefix for cleaner display
  let loc = raw.trim();
  // Remove any trailing punctuation or markdown artifacts
  loc = loc.replace(/[*_`#]+/g, '').trim();
  return loc;
}
