import { Contact, DESIGNATION } from '@/types/contact';

/** Extract city name (first comma-separated segment) for fuzzy matching */
export function extractCity(loc: string): string {
  return loc.split(',')[0].toLowerCase().trim();
}

/** Find the company location that best matches person_location_raw */
export function getMatchingCompanyLocation(contact: Contact): { match: string | null; others: string[] } {
  const personLoc = contact.person_location_raw?.toLowerCase().trim();
  if (!personLoc || contact.company_location_raw.length === 0) {
    return { match: null, others: contact.company_location_raw };
  }

  const personCity = extractCity(contact.person_location_raw || '');

  const matchIdx = contact.company_location_raw.findIndex((loc) => {
    const cNorm = loc.toLowerCase().trim();
    const cCity = extractCity(loc);
    return personLoc === cNorm || personLoc.includes(cNorm) || cNorm.includes(personLoc) || personCity === cCity;
  });

  if (matchIdx === -1) {
    return { match: null, others: contact.company_location_raw };
  }

  const match = contact.company_location_raw[matchIdx];
  const others = contact.company_location_raw.filter((_, i) => i !== matchIdx);
  return { match, others };
}

/** Resolve the display location string based on the contact's designation */
export function resolveDisplayLocation(contact: Contact): string {
  switch (contact.designation_id) {
    case DESIGNATION.PERSON:
      return contact.person_location_raw;
    case DESIGNATION.COMPANY: {
      const { match } = getMatchingCompanyLocation(contact);
      return match || contact.company_location_raw.join(', ');
    }
    case DESIGNATION.MANUAL:
      return contact.manual_location;
    default:
      return 'Select…';
  }
}
