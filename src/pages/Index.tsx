import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ContactTable } from '@/components/ContactTable';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ManualLocationDialog } from '@/components/ManualLocationDialog';
import { AddContactDialog } from '@/components/AddContactDialog';
import { Contact, ActivityLog, Lookups, DESIGNATION, CONFIDENCE } from '@/types/contact';
import {
  fetchContacts,
  fetchLookups,
  fetchActivityLogs,
  updateContactDesignation,
  toggleApproval,
  bulkSetApproval,
  insertActivityLog,
  upsertContactFromCSV,
  updateContactLocations,
  fetchCompanyByDomain,
  upsertCompany,
} from '@/lib/supabase-queries';
import { firecrawlApi, extractLocationsViaLLM } from '@/lib/api/firecrawl';
import { extractCompanyLocationsFromMarkdown, extractLocationFromDescription, extractLocationFromGoogleHtml } from '@/lib/extract-location';
import { extractDomainFromEmail, extractRawDomain } from '@/lib/extract-domain';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ActivityLog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [manualDialogContactId, setManualDialogContactId] = useState<string | null>(null);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [contactsData, lookupsData] = await Promise.all([fetchContacts(), fetchLookups()]);
      setContacts(contactsData);
      setLookups(lookupsData);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company_name.toLowerCase().includes(q) ||
          c.email_address.toLowerCase().includes(q)
      );
    }
    if (confidenceFilter !== 'all') {
      result = result.filter((c) => c.confidence_id === Number(confidenceFilter));
    }
    if (approvalFilter === 'approved') {
      result = result.filter((c) => c.is_approved);
    } else if (approvalFilter === 'pending') {
      result = result.filter((c) => !c.is_approved);
    }
    return result;
  }, [contacts, searchTerm, confidenceFilter, approvalFilter]);

  const allVisibleApproved = useMemo(
    () => filteredContacts.length > 0 && filteredContacts.every((c) => c.is_approved),
    [filteredContacts]
  );

  const handleToggleApproval = useCallback(
    async (id: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      if (contact.designation_id === DESIGNATION.PENDING && !contact.is_approved) {
        toast({ title: 'Designation Required', description: 'Select a designation before approving.', variant: 'destructive' });
        return;
      }
      const newVal = !contact.is_approved;
      try {
        await toggleApproval(id, newVal);
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, is_approved: newVal } : c)));
        setSelectedContact((prev) => (prev?.id === id ? { ...prev, is_approved: newVal } : prev));
      } catch {
        toast({ title: 'Error', description: 'Failed to update approval.', variant: 'destructive' });
      }
    },
    [contacts, toast]
  );

  const handleApproveAll = useCallback(
    async (checked: boolean) => {
      const eligible = filteredContacts.filter((c) => c.designation_id !== DESIGNATION.PENDING || !checked);
      const ids = eligible.map((c) => c.id);
      try {
        await bulkSetApproval(ids, checked);
        const idSet = new Set(ids);
        setContacts((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, is_approved: checked } : c)));
        if (checked) {
          const skipped = filteredContacts.filter((c) => c.designation_id === DESIGNATION.PENDING).length;
          if (skipped > 0) {
            toast({ title: 'Some Skipped', description: `${skipped} contact(s) need a designation before approval.` });
          }
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to bulk update.', variant: 'destructive' });
      }
    },
    [filteredContacts, toast]
  );

  const handleHILChange = useCallback(
    async (id: string, designationId: number) => {
      if (String(designationId) === 'manual_new' || isNaN(designationId)) {
        setManualDialogContactId(id);
        return;
      }
      try {
        await updateContactDesignation(id, designationId);
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, designation_id: designationId } : c)));
        setSelectedContact((prev) => (prev?.id === id ? { ...prev, designation_id: designationId } : prev));
      } catch {
        toast({ title: 'Error', description: 'Failed to update designation.', variant: 'destructive' });
      }
    },
    [toast]
  );

  const handleManualSubmit = useCallback(
    async (city: string, country: string, source: string) => {
      if (!manualDialogContactId) return;
      const location = `${city}, ${country}`;
      try {
        await updateContactDesignation(manualDialogContactId, DESIGNATION.MANUAL, location, source);
        await insertActivityLog({
          contact_id: manualDialogContactId,
          event_type_id: 5, // Manual Entry
          query_used: source || 'No source provided',
          source_url: '',
          result_snippet: `Manual location set to "${location}". Source: ${source || 'Not specified'}.`,
        });
        setContacts((prev) =>
          prev.map((c) =>
            c.id === manualDialogContactId
              ? { ...c, designation_id: DESIGNATION.MANUAL, manual_location: location, manual_source_note: source }
              : c
          )
        );
        setManualDialogContactId(null);
      } catch {
        toast({ title: 'Error', description: 'Failed to save manual location.', variant: 'destructive' });
      }
    },
    [manualDialogContactId, toast]
  );

  const handleRowClick = useCallback(async (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
    try {
      const logs = await fetchActivityLogs(contact.id);
      setSelectedLogs(logs);
    } catch {
      setSelectedLogs([]);
    }
  }, []);

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
        // Cache-first: check companies table
        const existingCompany = await fetchCompanyByDomain(rawDomain);
        const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
        const isStale = !existingCompany?.last_scraped_at ||
          (Date.now() - new Date(existingCompany.last_scraped_at).getTime()) > SIX_MONTHS_MS;

        if (existingCompany && !isStale) {
          // Use cached data
          companyLocs = existingCompany.hq_locations;
          companySourceUrl = existingCompany.website_url || domainUrl;
          companyId = existingCompany.id;
          companySnippet = `Location from Company Master Record (cached). ${companyLocs.join('; ')}`;
        } else {
          // Map → Scrape → Extract
          const mapResult = await firecrawlApi.map(domainUrl, {
            search: 'contact about locations office headquarters',
            limit: 20,
          });

          let candidateUrls: string[] = [];
          const allLinks: string[] = (mapResult as any).links || mapResult.data?.links || [];
          if (mapResult.success && allLinks.length > 0) {
            // Priority-weighted filtering
            const p1 = allLinks.filter((u: string) => /\/contact(\/|$|\?)/i.test(u));
            const p2 = allLinks.filter((u: string) => /locations|offices/i.test(u));
            const p3 = allLinks.filter((u: string) => /reach-us|find-us|about|headquarters/i.test(u));
            candidateUrls = [...p1, ...p2, ...p3];

            // Deduplicate
            candidateUrls = [...new Set(candidateUrls)];
          }

          // Fallback to homepage
          if (candidateUrls.length === 0) {
            candidateUrls = [domainUrl];
          }

          // Scrape top 2 candidates and merge markdown
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

          // Extract locations: LLM-first, regex fallback
          let extractedLocs = await extractLocationsViaLLM(mergedMarkdown);
          if (extractedLocs.length === 0) {
            extractedLocs = extractCompanyLocationsFromMarkdown(mergedMarkdown);
          }
          if (extractedLocs.length > 0) {
            companyLocs = extractedLocs;
          }

          const mappedCount = allLinks.length;
          companySnippet = `Mapped ${mappedCount} pages; scraped ${scrapedUrls.join(', ') || 'homepage'}. Extracted ${companyLocs.length} location(s): ${companyLocs.join('; ') || 'none found'}.`;

          // Upsert into companies cache
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
      // Check each company location for a match against person location
      const matchingLoc = companyLocs.find((loc) => {
        const cNorm = loc.toLowerCase().trim();
        return pNorm === cNorm || pNorm.includes(cNorm) || cNorm.includes(pNorm);
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

    // Auto-set HIL designation when there's a HIGH confidence match
    if (autoDesignation !== DESIGNATION.PENDING) {
      await updateContactDesignation(contact.id, autoDesignation);
    }

    return { personLoc, companyLocs, confId };
  }, []);

  const handleFetchContacts = useCallback(async () => {
    const pending = contacts.filter((c) => c.designation_id === DESIGNATION.PENDING);
    if (pending.length === 0) {
      toast({ title: 'No Pending', description: 'All contacts already have a designation.' });
      return;
    }

    setDiscoveryRunning(true);
    toast({ title: 'Discovery Started', description: `Running OSINT on ${pending.length} pending contact(s)…` });

    let processed = 0;
    for (const contact of pending) {
      try {
        await runDiscoveryForContact(contact);
        processed++;
      } catch (err) {
        console.error(`Discovery failed for ${contact.name}:`, err);
      }
      // Small delay between contacts to avoid rate limits
      if (pending.indexOf(contact) < pending.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await loadData();
    setDiscoveryRunning(false);
    toast({ title: 'Discovery Complete', description: `Processed ${processed}/${pending.length} contacts.` });
  }, [contacts, toast, loadData, runDiscoveryForContact]);

  const handleRunSingleDiscovery = useCallback(async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    setDiscoveryRunning(true);
    try {
      await runDiscoveryForContact(contact);
      await loadData();
      // Reload logs for the modal
      const logs = await fetchActivityLogs(contactId);
      setSelectedLogs(logs);
      toast({ title: 'Discovery Complete', description: `Updated location data for ${contact.name}.` });
    } catch {
      toast({ title: 'Error', description: 'Discovery failed.', variant: 'destructive' });
    } finally {
      setDiscoveryRunning(false);
    }
  }, [contacts, loadData, toast, runDiscoveryForContact]);

  const handleUploadCSV = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const rows = (results.data as any[]).filter((row) => row.name && row.email);
          let count = 0;
          for (const row of rows) {
            const personLoc = row.person_location || '';
            const companyLoc = row.company_location || '';
            let confId: number = CONFIDENCE.LOW;
            if (personLoc && companyLoc) {
              confId = personLoc === companyLoc ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
            }
            try {
              await upsertContactFromCSV({
                affinity_id: row.affinity_id || `csv-${Date.now()}-${count}`,
                name: row.name,
                company_name: row.company || '',
                email_address: row.email,
                person_location_raw: personLoc,
                company_location_raw: companyLoc ? [companyLoc] : [],
                confidence_id: confId,
              });
              count++;
            } catch { /* skip row */ }
          }
          await loadData();
          toast({ title: 'CSV Imported', description: `${count} contacts upserted.` });
        },
      });
      e.target.value = '';
    },
    [toast, loadData]
  );

  const handlePushToAffinity = useCallback(() => {
    const approved = contacts.filter((c) => c.is_approved);
    toast({
      title: 'Push to Affinity',
      description: `${approved.length} approved contacts ready to push. (placeholder)`,
    });
  }, [contacts, toast]);

  const handleAddContact = useCallback(
    async (data: { affinity_id: string; name: string; company_name: string; email_address: string }) => {
      try {
        await upsertContactFromCSV({
          affinity_id: data.affinity_id,
          name: data.name,
          company_name: data.company_name,
          email_address: data.email_address,
          person_location_raw: '',
          company_location_raw: [],
          confidence_id: CONFIDENCE.LOW,
        });
        await loadData();
        setAddContactOpen(false);
        toast({ title: 'Contact Added', description: `${data.name} has been added.` });
      } catch {
        toast({ title: 'Error', description: 'Failed to add contact.', variant: 'destructive' });
      }
    },
    [loadData, toast]
  );

  const handleExportCSV = useCallback(() => {
    const approved = contacts.filter((c) => c.is_approved);
    if (approved.length === 0) {
      toast({ title: 'No Records', description: 'Approve at least one contact to export.', variant: 'destructive' });
      return;
    }
    const csv = Papa.unparse(
      approved.map((c) => {
        let finalLocation = '';
        switch (c.designation_id) {
          case DESIGNATION.PERSON: finalLocation = c.person_location_raw; break;
          case DESIGNATION.COMPANY: finalLocation = c.company_location_raw.join(', '); break;
          case DESIGNATION.MANUAL: finalLocation = c.manual_location; break;
        }
        return {
          name: c.name,
          company: c.company_name,
          email: c.email_address,
          person_location: c.person_location_raw,
          company_location: c.company_location_raw.join(', '),
          final_location: finalLocation,
          confidence: c.confidence_level?.label || '',
          designation: c.designation_type?.label || '',
          affinity_id: c.affinity_id || '',
        };
      })
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verified-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${approved.length} contacts exported.` });
  }, [contacts, toast]);

  const currentSelectedContact = useMemo(
    () => (selectedContact ? contacts.find((c) => c.id === selectedContact.id) || selectedContact : null),
    [contacts, selectedContact]
  );

  const manualDialogContact = manualDialogContactId
    ? contacts.find((c) => c.id === manualDialogContactId)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center text-muted-foreground text-sm">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <main className="container py-6 space-y-4">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          confidenceFilter={confidenceFilter}
          onConfidenceFilterChange={setConfidenceFilter}
          approvalFilter={approvalFilter}
          onApprovalFilterChange={setApprovalFilter}
          onFetchContacts={handleFetchContacts}
          onAddContact={() => setAddContactOpen(true)}
          onUploadCSV={handleUploadCSV}
          onPushToAffinity={handlePushToAffinity}
          onExportCSV={handleExportCSV}
          onRunBulkDiscovery={handleFetchContacts}
          discoveryRunning={discoveryRunning}
        />

        <p className="text-[11px] text-muted-foreground tracking-wider uppercase">
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} ·{' '}
          {contacts.filter((c) => c.is_approved).length} approved
        </p>

        <ContactTable
          contacts={filteredContacts}
          onToggleApproval={handleToggleApproval}
          onApproveAll={handleApproveAll}
          onHILChange={handleHILChange}
          onRowClick={handleRowClick}
          onRunDiscovery={handleRunSingleDiscovery}
          discoveryRunning={discoveryRunning}
          allVisibleApproved={allVisibleApproved}
        />
      </main>

      <ActivityLogModal
        contact={currentSelectedContact}
        activityLogs={selectedLogs}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onApprove={handleToggleApproval}
        onHILChange={handleHILChange}
        onRunDiscovery={handleRunSingleDiscovery}
        discoveryRunning={discoveryRunning}
      />

      <ManualLocationDialog
        open={!!manualDialogContactId}
        onOpenChange={(open) => { if (!open) setManualDialogContactId(null); }}
        contactName={manualDialogContact?.name || ''}
        onSubmit={handleManualSubmit}
      />

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onSubmit={handleAddContact}
      />
    </div>
  );
};

export default Index;
