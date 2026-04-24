import { describe, it, expect } from 'vitest';
import {
  extractLocationFromMarkdown,
  extractLocationFromDescription,
  extractLocationFromGoogleHtml,
  extractCompanyLocationsFromMarkdown,
  extractPersonLocationCandidatesFromSerpHtml,
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

describe('extractPersonLocationCandidatesFromSerpHtml', () => {
  it('falls back to <em>Location</em> regex when YrbPuc is missing', () => {
    const html = `<div>Experience: Vikings · <em>Location</em>: Short Hills, New Jersey, United States · 215 connections</div>`;
    const cands = extractPersonLocationCandidatesFromSerpHtml(html);
    const m1 = cands.find((c) => c.method.includes('Location: label'));
    expect(m1?.value).toBe('Short Hills, New Jersey, United States');
  });

  it('uses YrbPuc as the preferred method (top result)', () => {
    const html = `<div class="YrbPuc"><span>London, England, United Kingdom</span></div>`;
    const cands = extractPersonLocationCandidatesFromSerpHtml(html);
    const m2 = cands.find((c) => c.method.includes('YrbPuc'));
    expect(m2?.value).toBe('London, England, United Kingdom');
  });

  it('falls back to subdomain when YrbPuc and <em>Location</em> are absent', () => {
    const html = `<a href="https://uk.linkedin.com/in/jane-doe">Jane Doe</a>`;
    const cands = extractPersonLocationCandidatesFromSerpHtml(html);
    const m3 = cands.find((c) => c.method.includes('subdomain'));
    expect(m3?.value).toBe('LinkedIn country: UK');
  });

  it('stops at YrbPuc when it returns a proper (comma-containing) location', () => {
    const html = `
      <a href="https://uk.linkedin.com/in/jane-doe">Jane Doe</a>
      <div><em>Location</em>: Short Hills · 215 connections</div>
      <div class="YrbPuc"><span>London, England, United Kingdom</span></div>
    `;
    const cands = extractPersonLocationCandidatesFromSerpHtml(html);
    expect(cands).toHaveLength(1);
    expect(cands[0].method).toContain('YrbPuc');
    expect(cands[0].value).toBe('London, England, United Kingdom');
  });

  it('falls through past YrbPuc when its value is a single token (no comma)', () => {
    const html = `
      <div class="YrbPuc"><span>London</span></div>
      <div><em>Location</em>: Short Hills, NJ · 215 connections</div>
    `;
    const cands = extractPersonLocationCandidatesFromSerpHtml(html);
    // Both YrbPuc (rejected as winner) and Method 1 candidate present; method 1 should be there.
    expect(cands.some((c) => c.method.includes('Location: label') && c.value === 'Short Hills, NJ')).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(extractPersonLocationCandidatesFromSerpHtml('')).toEqual([]);
  });
});
