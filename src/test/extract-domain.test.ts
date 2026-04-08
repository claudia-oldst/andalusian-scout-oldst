import { describe, it, expect } from 'vitest';
import { extractDomainFromEmail, extractRawDomain } from '@/lib/extract-domain';

describe('extractDomainFromEmail', () => {
  it('returns URL for corporate domain', () => {
    expect(extractDomainFromEmail('john@old.st')).toBe('https://www.old.st');
  });

  it('returns URL for multi-part domain', () => {
    expect(extractDomainFromEmail('user@s-rminform.com')).toBe('https://www.s-rminform.com');
  });

  it('returns null for free email providers', () => {
    expect(extractDomainFromEmail('user@gmail.com')).toBeNull();
    expect(extractDomainFromEmail('user@hotmail.com')).toBeNull();
    expect(extractDomainFromEmail('user@yahoo.com')).toBeNull();
    expect(extractDomainFromEmail('user@protonmail.com')).toBeNull();
  });

  it('returns null for invalid inputs', () => {
    expect(extractDomainFromEmail('')).toBeNull();
    expect(extractDomainFromEmail('no-at-sign')).toBeNull();
  });

  it('handles case insensitivity', () => {
    expect(extractDomainFromEmail('User@Gmail.com')).toBeNull();
    expect(extractDomainFromEmail('User@OldSt.COM')).toBe('https://www.oldst.com');
  });
});

describe('extractRawDomain', () => {
  it('extracts raw domain from corporate email', () => {
    expect(extractRawDomain('john@old.st')).toBe('old.st');
  });

  it('returns null for free providers', () => {
    expect(extractRawDomain('user@gmail.com')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(extractRawDomain('')).toBeNull();
  });
});
