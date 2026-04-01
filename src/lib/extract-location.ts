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

function cleanLocation(raw: string): string {
  // Remove leading "City of " prefix for cleaner display
  let loc = raw.trim();
  // Remove any trailing punctuation or markdown artifacts
  loc = loc.replace(/[*_`#]+/g, '').trim();
  return loc;
}
