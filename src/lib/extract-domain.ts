const FREE_PROVIDERS = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'yahoo.com',
  'aol.com',
  'live.com',
  'me.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
]);

/**
 * Extract a company domain URL from an email address.
 * Returns null for free/personal email providers.
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  if (FREE_PROVIDERS.has(domain)) return null;
  return `https://www.${domain}`;
}

/**
 * Extract just the raw domain string (e.g. "old.st") from an email.
 */
export function extractRawDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  if (FREE_PROVIDERS.has(domain)) return null;
  return domain;
}
