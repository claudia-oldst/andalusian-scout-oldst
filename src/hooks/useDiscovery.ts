import { useState, useCallback } from "react";
import { Contact, DESIGNATION, CONFIDENCE, EVENT_TYPE } from "@/types/contact";
import {
  insertActivityLog,
  updateContactLocations,
  updateContactDesignation,
  fetchCompanyByDomain,
  upsertCompany,
  fetchContactsByIds,
  fetchAllContactIds,
  fetchActivityLogs,
} from "@/lib/supabase-queries";
import { firecrawlApi, extractLocationsViaLLM } from "@/lib/api/firecrawl";
import {
  extractCompanyLocationsFromMarkdown,
  extractPersonLocationCandidatesFromSerpHtml,
} from "@/lib/extract-location";
import { extractDomainFromEmail, extractRawDomain } from "@/lib/extract-domain";
import { extractCity } from "@/lib/location-matching";
import { useToast } from "@/hooks/use-toast";
import type { ActivityLog } from "@/types/contact";

/** Staleness threshold for company cache (6 months) */
const COMPANY_CACHE_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export function useDiscovery(invalidateContacts: () => void) {
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveringContactId, setDiscoveringContactId] = useState<string | null>(null);
  const { toast } = useToast();

  const runDiscoveryForContact = useCallback(async (contact: Contact) => {
    const personQuery = `site:linkedin.com/in/ ${contact.name} ${contact.company_name} Location`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(personQuery)}`;

    let personLoc = "";
    const personLocationCandidates: { location: string; method: string; url: string; score: number }[] = [];
    let personLocMethod = "";
    let companyLocs: string[] = contact.company_location_raw || [];
    let companySourceUrl = "";
    let personSnippet = "No results found.";
    let companySnippet = "No results found.";
    let companyId: string | undefined;

    /** Score a candidate location string. Higher = better. */
    const scoreLocation = (value: string, sourceMethod: string): number => {
      const commaCount = (value.match(/,/g) || []).length;
      if (sourceMethod.includes("leading geo segment")) {
        if (commaCount >= 2) return 100; // City, Region, Country
        if (commaCount === 1) return 70; // City, Region/Country
        return 40;
      }
      if (sourceMethod.includes("Location: label")) {
        if (commaCount >= 2) return 90;
        if (commaCount === 1) return 75;
        return 60; // single token like "Short Hills" — still trustworthy from explicit label
      }
      if (sourceMethod.includes("YrbPuc")) {
        if (commaCount >= 2) return 85;
        if (commaCount === 1) return 65;
        return 50;
      }
      if (sourceMethod.includes("subdomain")) return 20;
      return 10;
    };

    // ── Person location: scrape Google SERP HTML, extract via 3 methods ──
    try {
      const personResult = await firecrawlApi.scrape(googleSearchUrl, {
        formats: ["html"],
        onlyMainContent: false,
      });

      const html: string =
        (personResult as any).data?.html ||
        (personResult as any).data?.data?.html ||
        (personResult as any).html ||
        "";

      if (personResult.success && html) {
        const serpCandidates = extractPersonLocationCandidatesFromSerpHtml(html);

        for (const c of serpCandidates) {
          // Map SERP method strings to scoreLocation's expected tags
          let scoreTag = "";
          if (c.method.includes("Location: label")) scoreTag = "Location: label";
          else if (c.method.includes("YrbPuc")) scoreTag = "YrbPuc";
          else if (c.method.includes("subdomain")) scoreTag = "subdomain";

          personLocationCandidates.push({
            location: c.value,
            method: c.method,
            url: c.url || googleSearchUrl,
            score: scoreLocation(c.value, scoreTag),
          });
        }

        if (personLocationCandidates.length > 0) {
          personLocationCandidates.sort((a, b) => b.score - a.score);
          const winner = personLocationCandidates[0];
          personLoc = winner.location;
          personLocMethod = winner.method;
        }

        const rankedList = personLocationCandidates
          .map((c, i) => `${i + 1}. [${c.score}] ${c.location} (${c.method})`)
          .join(" | ");
        const methodNote = personLoc
          ? `Method: ${personLocMethod}. Location: ${personLoc}.`
          : "No location extracted from any SERP method (<em>Location, .YrbPuc, URL subdomain).";

        // Capture the exact HTML fragments each method inspected — for debugging
        const m1Fragments = Array.from(
          html.matchAll(/.{0,40}<em>Location<\/em>\s*:[^<]{0,120}(?:<[^>]+>[^<]{0,40}){0,2}/gi),
        )
          .slice(0, 5)
          .map((m, i) => `M1[${i + 1}]: ${m[0].replace(/\s+/g, " ").trim()}`)
          .join("\n");

        const m2Fragments = Array.from(
          html.matchAll(/<div[^>]*class="[^"]*YrbPuc[^"]*"[^>]*>[\s\S]{0,300}?<\/div>/gi),
        )
          .slice(0, 5)
          .map((m, i) => `M2[${i + 1}]: ${m[0].replace(/\s+/g, " ").trim()}`)
          .join("\n");

        const htmlDebug = [
          m1Fragments ? `--- Method 1 (<em>Location</em>) HTML matches ---\n${m1Fragments}` : "Method 1: no <em>Location</em> matches in HTML.",
          m2Fragments ? `--- Method 2 (.YrbPuc) HTML matches ---\n${m2Fragments}` : "Method 2: no .YrbPuc blocks in HTML.",
        ].join("\n\n");

        personSnippet = `${methodNote} | Ranked candidates: ${rankedList || "none"} | SERP HTML length: ${html.length}\n\n${htmlDebug}`;
      } else {
        personSnippet = personResult.success
          ? "SERP scrape returned no HTML."
          : `SERP scrape failed: ${personResult.error || "unknown"}`;
      }
    } catch (err) {
      console.error("Person location discovery failed:", err);
      personSnippet = `Person discovery error: ${err instanceof Error ? err.message : "Unknown"}`;
    }

    await insertActivityLog({
      contact_id: contact.id,
      event_type_id: EVENT_TYPE.OSINT_DISCOVERY,
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
        const isStale =
          !existingCompany?.last_scraped_at ||
          Date.now() - new Date(existingCompany.last_scraped_at).getTime() > COMPANY_CACHE_TTL_MS;

        if (existingCompany && !isStale) {
          companyLocs = existingCompany.hq_locations;
          companySourceUrl = existingCompany.website_url || domainUrl;
          companyId = existingCompany.id;
          companySnippet = `Location from Company Master Record (cached). ${companyLocs.join("; ")}`;
        } else {
          // Add delay before map to avoid rate limiting
          await new Promise((r) => setTimeout(r, 1200));
          const mapResult = await firecrawlApi.map(domainUrl, {
            search: "contact about locations office headquarters",
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
          let mergedMarkdown = "";
          const scrapedUrls: string[] = [];

          for (const pageUrl of toScrape) {
            try {
              // Add delay between scrape requests
              await new Promise((r) => setTimeout(r, 1500));
              const scrapeRes = await firecrawlApi.scrape(pageUrl, { formats: ["markdown"] });
              if (scrapeRes.success) {
                mergedMarkdown += (scrapeRes.data?.markdown || scrapeRes.data?.data?.markdown || "") + "\n\n";
                scrapedUrls.push(pageUrl);
              }
            } catch (err) {
              console.warn("Scrape failed for", pageUrl, err);
            }
          }

          companySourceUrl = scrapedUrls[0] || domainUrl;

          let companyLocMethod = "";
          let extractedLocs = await extractLocationsViaLLM(mergedMarkdown);
          if (extractedLocs.length > 0) {
            companyLocMethod = "LLM extraction (Gemini)";
          } else {
            extractedLocs = extractCompanyLocationsFromMarkdown(mergedMarkdown);
            if (extractedLocs.length > 0) {
              companyLocMethod = "Regex extraction (fallback — LLM found nothing)";
            }
          }
          if (extractedLocs.length > 0) {
            companyLocs = extractedLocs;
          }

          const mappedCount = allLinks.length;
          const methodNote = companyLocMethod
            ? `Method: ${companyLocMethod}.`
            : "Method: None — no locations found by LLM or regex.";
          companySnippet = `${methodNote} Mapped ${mappedCount} pages; scraped ${scrapedUrls.join(", ") || "homepage"}. Extracted ${companyLocs.length} location(s): ${companyLocs.join("; ") || "none found"}.`;

          const company = await upsertCompany({
            domain: rawDomain,
            name: contact.company_name,
            hq_locations: companyLocs,
            website_url: companySourceUrl,
          });
          companyId = company.id;
        }
      } catch (err) {
        console.error("Company discovery pipeline failed:", err);
        companySnippet = `Pipeline error: ${err instanceof Error ? err.message : "Unknown"}`;
      }
    } else {
      companySnippet = rawDomain ? "Domain extraction failed." : "Free email provider — skipped company discovery.";
    }

    await insertActivityLog({
      contact_id: contact.id,
      event_type_id: EVENT_TYPE.OSINT_DISCOVERY,
      query_used: rawDomain ? `map+scrape: ${domainUrl}` : "N/A (free email)",
      source_url: companySourceUrl,
      result_snippet: companySnippet,
    });

    // Compute confidence & find matching company location
    let confId: number = CONFIDENCE.LOW;
    let autoDesignation: number = DESIGNATION.PENDING;

    if (personLoc) {
      const pNorm = personLoc.toLowerCase().trim();
      const pCity = extractCity(personLoc);
      const matchingLoc = companyLocs.find((loc) => {
        const cNorm = loc.toLowerCase().trim();
        const cCity = extractCity(loc);
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

    await updateContactLocations(contact.id, personLoc, companyLocs, confId, companyId, personLocationCandidates);

    if (autoDesignation !== DESIGNATION.PENDING) {
      await updateContactDesignation(contact.id, autoDesignation);
    }

    return { personLoc, companyLocs, confId };
  }, []);

  const handleBulkDiscovery = useCallback(async () => {
    try {
      const pendingIds = await fetchAllContactIds(DESIGNATION.PENDING);
      if (pendingIds.length === 0) {
        toast({ title: "No Pending Contacts", description: "All contacts already have a designation assigned." });
        return;
      }

      setDiscoveryRunning(true);
      toast({ title: "Discovery Started", description: `Running OSINT on ${pendingIds.length} pending contact(s)…` });

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
          // Increase delay between contacts to allow for internal per-request delays
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      invalidateContacts();
      setDiscoveryRunning(false);
      toast({
        title: "Discovery Complete",
        description: `Processed ${processed}/${pendingContacts.length} contacts successfully.`,
      });
    } catch (err) {
      setDiscoveryRunning(false);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      toast({
        title: "Discovery Failed",
        description: `Could not complete bulk discovery: ${msg}`,
        variant: "destructive",
      });
    }
  }, [toast, invalidateContacts, runDiscoveryForContact]);

  const handleSingleDiscovery = useCallback(
    async (contact: Contact): Promise<ActivityLog[]> => {
      setDiscoveringContactId(contact.id);
      setDiscoveryRunning(true);
      try {
        await runDiscoveryForContact(contact);
        invalidateContacts();
        const logs = await fetchActivityLogs(contact.id);
        toast({ title: "Discovery Complete", description: `Updated location data for ${contact.name}.` });
        return logs;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred";
        toast({
          title: "Discovery Failed",
          description: `Could not run discovery for ${contact.name}: ${msg}`,
          variant: "destructive",
        });
        return [];
      } finally {
        setDiscoveringContactId(null);
        setDiscoveryRunning(false);
      }
    },
    [toast, invalidateContacts, runDiscoveryForContact],
  );

  return {
    discoveryRunning,
    discoveringContactId,
    handleBulkDiscovery,
    handleSingleDiscovery,
  };
}
