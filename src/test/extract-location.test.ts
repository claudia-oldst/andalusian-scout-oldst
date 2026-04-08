import { describe, it, expect } from 'vitest';
import {
  extractLocationFromMarkdown,
  extractLocationFromDescription,
  extractLocationFromGoogleHtml,
  extractCompanyLocationsFromMarkdown,
} from '@/lib/extract-location';

describe('extractLocationFromMarkdown', () => {
  it('extracts from LinkedIn JSON field', () => {
    const md = 'some stuff "defaultLocalizedName": "London, England, United Kingdom" more stuff';
    expect(extractLocationFromMarkdown(md)).toBe('London, England, United Kingdom');
  });

  it('returns empty string for empty input', () => {
    expect(extractLocationFromMarkdown('')).toBe('');
  });

  it('extracts from location label', () => {
    const md = 'Profile info\nLocation: Cape Town, South Africa\nMore text';
    expect(extractLocationFromMarkdown(md)).toBe('Cape Town, South Africa');
  });
});

describe('extractLocationFromDescription', () => {
  it('extracts city-country from description text', () => {
    const desc = 'John Smith. London, United Kingdom. Senior Analyst at Old St Labs.';
    expect(extractLocationFromDescription(desc)).toBe('London, United Kingdom');
  });

  it('returns empty for no location', () => {
    expect(extractLocationFromDescription('Just some random text')).toBe('');
  });

  it('returns empty for empty input', () => {
    expect(extractLocationFromDescription('')).toBe('');
  });
});

describe('extractLocationFromGoogleHtml', () => {
  it('extracts from YrbPuc div class', () => {
    const html = '<div class="YrbPuc"><span>Cape Town, Western Cape, South Africa</span></div>';
    expect(extractLocationFromGoogleHtml(html)).toBe('Cape Town, Western Cape, South Africa');
  });

  it('returns empty for html without YrbPuc', () => {
    expect(extractLocationFromGoogleHtml('<div>No location here</div>')).toBe('');
  });

  it('returns empty for empty input', () => {
    expect(extractLocationFromGoogleHtml('')).toBe('');
  });
});

describe('extractCompanyLocationsFromMarkdown', () => {
  it('extracts headquarters location', () => {
    const md = 'Our company\nHeadquarters: London, United Kingdom\nWe do things';
    const locs = extractCompanyLocationsFromMarkdown(md);
    expect(locs).toContain('London, United Kingdom');
  });

  it('returns empty array for empty input', () => {
    expect(extractCompanyLocationsFromMarkdown('')).toEqual([]);
  });

  it('filters out PO Boxes', () => {
    const md = 'Address: P.O. Box 123, London\nHead Office: New York, NY';
    const locs = extractCompanyLocationsFromMarkdown(md);
    expect(locs.some((l) => l.includes('P.O. Box'))).toBe(false);
  });

  it('deduplicates locations', () => {
    const md = 'Headquarters: London, UK\nHead Office: London, UK';
    const locs = extractCompanyLocationsFromMarkdown(md);
    const londonCount = locs.filter((l) => l.toLowerCase().includes('london')).length;
    expect(londonCount).toBeLessThanOrEqual(1);
  });
});
