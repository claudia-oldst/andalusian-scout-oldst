import { useState, useCallback } from 'react';
import { Contact, DESIGNATION, CONFIDENCE } from '@/types/contact';
import {
  insertActivityLog,
  updateContactLocations,
  updateContactDesignation,
  fetchCompanyByDomain,
  upsertCompany,
  fetchContactsByIds,
  fetchAllContactIds,
  fetchActivityLogs,
} from '@/lib/supabase-queries';
import { firecrawlApi, extractLocationsViaLLM } from '@/lib/api/firecrawl';
import { extractCompanyLocationsFromMarkdown, extractLocationFromDescription, extractLocationFromGoogleHtml } from '@/lib/extract-location';
import { extractDomainFromEmail, extractRawDomain } from '@/lib/extract-domain';
import { useToast } from '@/hooks/use-toast';
import type { ActivityLog } from '@/types/contact';

export function useDiscovery(invalidateContacts: () => void) {
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const { toast } = useToast();

  const runDiscoveryForContact = useCallback(async (contact: Contact) => {
    const personQuery = `site:linkedin.com "${contact.name}" "${contact.company_name}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(personQuery)}`;

    let personLoc = contact.person_location_raw || '';
    let companyLocs: string[] = contact.company_location_raw || [];
    let companySourceUrl = '';
    let personSnippet = 'No results found.';
    let companySnippet = 'No results found.';
    let companyId: string | undefined;

    // ── Person location: Google SERP → YrbPuc extraction ──
    try {
      const scrapeResult = await firecrawlApi.scrape(googleSearchUrl, {
        formats: ['html'],
        onlyMainContent: false,
      });

      if (scrapeResult.success) {
        const html = scrapeResult.data?.html || '';
        const locFromHtml = extractLocationFromGoogleHtml(html);
        if (locFromHtml) {
          personLoc = locFromHtml;
          personSnippet = locFromHtml;
        } else {
          personSnippet = 'Google SERP scraped but YrbPuc element not found.';
        }
      } else {
        console.warn('Google SERP scrape failed, falling back to search API:', scrapeResult.error);
        const personResult = await firecrawlApi.search(personQuery, { limit: 3 });
        if (personResult.success && personResult.data?.length > 0) {
          const linkedInResult = personResult.data.find((r: any) =>
            r.url && r.url.includes('linkedin.com/in/')
          ) || personResult.data[0];
          const description = linkedInResult.description || '';
          const extracted = extractLocationFromDescription(description);
          personLoc = extracted || personLoc;
          personSnippet = description.slice(0, 500);
        }
      }
    } catch (err) {
      console.error('Person location discovery failed:', err);
    }

    await insertActivityLog({
      contact_id: contact.id,
      event_type_id: 1,
      query_used: personQuery,
      source_url: googleSearchUrl,
      result_snippet: personSnippet,
    });

    // ── Company location: Domain Map → Scrape → Extract pipeline ──
    const rawDomain = extractRawDomain(contact.email_address);
    const domainUrl = extractDomainFromEmail(contact.email_address);

    if (rawDomain && domainUrl) {
      try {
        const existingCompany = await fetchCompanyByDomain(rawDomain);
        const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
        const isStale = !existingCompany?.last_scraped_at ||
          (Date.now() - new Date(existingCompany.last_scraped_at).getTime()) > SIX_MONTHS_MS;

        if (existingCompany && !isStale) {
          companyLocs = existingCompany.hq_locations;
          companySourceUrl = existingCompany.website_url || domainUrl;
          companyId = existingCompany.id;
          companySnippet = `Location from Company Master Record (cached). ${companyLocs.join('; ')}`;
        } else {
          const mapResult = await firecrawlApi.map(domainUrl, {
            search: 'contact about locations office headquarters',
            limit: 20,
          });

          let candidateUrls: string[] = [];
          const allLinks: string[] = (mapResult as any).links || mapResult.data?.links || [];
          if (mapResult.success && allLinks.length > 0) {
            const p1 = allLinks.filter((u: string) => /\/contact(\/|$|\?)/i.test(u));
            const p2 = allLinks.filter((u: string) => /locations|offices/i.test(u));
            const p3 = allLinks.filter((u: string) => /reach-us|find-us|about|headquarters/i.test(u));
            candidateUrls = [...new Set([...p1, ...p2, ...p3])];
          }

          if (candidateUrls.length === 0) {
            candidateUrls = [domainUrl];
          }

          const toScrape = candidateUrls.slice(0, 2);
          let mergedMarkdown = '';
          const scrapedUrls: string[] = [];

          for (const pageUrl of toScrape) {
            try {
              const scrapeRes = await firecrawlApi.scrape(pageUrl, { formats: ['markdown'] });
              if (scrapeRes.success) {
                mergedMarkdown += (scrapeRes.data?.markdown || scrapeRes.data?.data?.markdown || '') + '\n\n';
                scrapedUrls.push(pageUrl);
              }
            } catch (err) {
              console.warn('Scrape failed for', pageUrl, err);
            }
          }

          companySourceUrl = scrapedUrls[0] || domainUrl;

          let extractedLocs = await extractLocationsViaLLM(mergedMarkdown);
          if (extractedLocs.length === 0) {
            extractedLocs = extractCompanyLocationsFromMarkdown(mergedMarkdown);
          }
          if (extractedLocs.length > 0) {
            companyLocs = extractedLocs;
          }

          const mappedCount = allLinks.length;
          companySnippet = `Mapped ${mappedCount} pages; scraped ${scrapedUrls.join(', ') || 'homepage'}. Extracted ${companyLocs.length} location(s): ${companyLocs.join('; ') || 'none found'}.`;

          const company = await upsertCompany({
            domain: rawDomain,
            name: contact.company_name,
            hq_locations: companyLocs,
            website_url: companySourceUrl,
          });
          companyId = company.id;
        }
      } catch (err) {
        console.error('Company discovery pipeline failed:', err);
        companySnippet = `Pipeline error: ${err instanceof Error ? err.message : 'Unknown'}`;
      }
    } else {
      companySnippet = rawDomain
        ? 'Domain extraction failed.'
        : 'Free email provider — skipped company discovery.';
    }

    await insertActivityLog({
      contact_id: contact.id,
      event_type_id: 1,
      query_used: rawDomain ? `map+scrape: ${domainUrl}` : 'N/A (free email)',
      source_url: companySourceUrl,
      result_snippet: companySnippet,
    });

    // Compute confidence & find matching company location
    let confId: number = CONFIDENCE.LOW;
    let autoDesignation: number = DESIGNATION.PENDING;

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
    } else {
      confId = CONFIDENCE.LOW;
    }

    await updateContactLocations(contact.id, personLoc, companyLocs, confId, companyId);

    if (autoDesignation !== DESIGNATION.PENDING) {
      await updateContactDesignation(contact.id, autoDesignation);
    }

    return { personLoc, companyLocs, confId };
  }, []);

  const handleBulkDiscovery = useCallback(async () => {
    try {
      const pendingIds = await fetchAllContactIds(DESIGNATION.PENDING);
      if (pendingIds.length === 0) {
        toast({ title: 'No Pending', description: 'All contacts already have a designation.' });
        return;
      }

      setDiscoveryRunning(true);
      toast({ title: 'Discovery Started', description: `Running OSINT on ${pendingIds.length} pending contact(s)…` });

      // Fetch full contact objects for pending contacts
      const pendingContacts = await fetchContactsByIds(pendingIds);

      let processed = 0;
      for (const contact of pendingContacts) {
        try {
          await runDiscoveryForContact(contact);
          processed++;
        } catch (err) {
          console.error(`Discovery failed for ${contact.name}:`, err);
        }
        if (pendingContacts.indexOf(contact) < pendingContacts.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      invalidateContacts();
      setDiscoveryRunning(false);
      toast({ title: 'Discovery Complete', description: `Processed ${processed}/${pendingContacts.length} contacts.` });
    } catch (err) {
      setDiscoveryRunning(false);
      toast({ title: 'Error', description: 'Discovery failed.', variant: 'destructive' });
    }
  }, [toast, invalidateContacts, runDiscoveryForContact]);

  const handleSingleDiscovery = useCallback(async (contact: Contact): Promise<ActivityLog[]> => {
    setDiscoveryRunning(true);
    try {
      await runDiscoveryForContact(contact);
      invalidateContacts();
      const logs = await fetchActivityLogs(contact.id);
      toast({ title: 'Discovery Complete', description: `Updated location data for ${contact.name}.` });
      return logs;
    } catch {
      toast({ title: 'Error', description: 'Discovery failed.', variant: 'destructive' });
      return [];
    } finally {
      setDiscoveryRunning(false);
    }
  }, [toast, invalidateContacts, runDiscoveryForContact]);

  return {
    discoveryRunning,
    handleBulkDiscovery,
    handleSingleDiscovery,
  };
}
