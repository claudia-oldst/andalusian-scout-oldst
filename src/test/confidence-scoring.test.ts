import { describe, it, expect } from 'vitest';
import { CONFIDENCE, DESIGNATION } from '@/types/contact';

describe('Confidence scoring logic', () => {
  function computeConfidence(personLoc: string, companyLocs: string[]) {
    let confId = CONFIDENCE.LOW;
    let autoDesignation = DESIGNATION.PENDING;

    if (personLoc) {
      const pNorm = personLoc.toLowerCase().trim();
      const pCity = pNorm.split(',')[0].trim();
      const matchingLoc = companyLocs.find((loc) => {
        const cNorm = loc.toLowerCase().trim();
        const cCity = cNorm.split(',')[0].trim();
        return pNorm === cNorm || pNorm.includes(cNorm) || cNorm.includes(pNorm) || pCity === cCity;
      });

      if (matchingLoc) {
        confId = CONFIDENCE.HIGH;
        autoDesignation = DESIGNATION.COMPANY;
      } else if (companyLocs.length > 0) {
        confId = CONFIDENCE.MEDIUM;
      } else {
        confId = CONFIDENCE.MEDIUM;
      }
    }

    return { confId, autoDesignation };
  }

  it('returns HIGH when person location matches a company location exactly', () => {
    const result = computeConfidence('London, United Kingdom', ['London, United Kingdom']);
    expect(result.confId).toBe(CONFIDENCE.HIGH);
    expect(result.autoDesignation).toBe(DESIGNATION.COMPANY);
  });

  it('returns HIGH for city-level fuzzy match', () => {
    const result = computeConfidence('Cape Town, South Africa', ['Cape Town, Western Cape, South Africa']);
    expect(result.confId).toBe(CONFIDENCE.HIGH);
    expect(result.autoDesignation).toBe(DESIGNATION.COMPANY);
  });

  it('returns MEDIUM when person exists but no company match', () => {
    const result = computeConfidence('London, UK', ['New York, USA']);
    expect(result.confId).toBe(CONFIDENCE.MEDIUM);
    expect(result.autoDesignation).toBe(DESIGNATION.PENDING);
  });

  it('returns MEDIUM when person exists but no company locations', () => {
    const result = computeConfidence('London, UK', []);
    expect(result.confId).toBe(CONFIDENCE.MEDIUM);
    expect(result.autoDesignation).toBe(DESIGNATION.PENDING);
  });

  it('returns LOW when no person location', () => {
    const result = computeConfidence('', ['London, UK']);
    expect(result.confId).toBe(CONFIDENCE.LOW);
    expect(result.autoDesignation).toBe(DESIGNATION.PENDING);
  });
});
