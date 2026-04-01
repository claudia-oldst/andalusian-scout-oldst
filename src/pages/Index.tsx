import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ContactTable } from '@/components/ContactTable';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ManualLocationDialog } from '@/components/ManualLocationDialog';
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
} from '@/lib/supabase-queries';
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

  const handleFetchContacts = useCallback(() => {
    toast({ title: 'Affinity Fetch', description: 'Fetching contacts from Affinity CRM… (placeholder)' });
  }, [toast]);

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
                company_location_raw: companyLoc,
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
          case DESIGNATION.COMPANY: finalLocation = c.company_location_raw; break;
          case DESIGNATION.MANUAL: finalLocation = c.manual_location; break;
        }
        return {
          name: c.name,
          company: c.company_name,
          email: c.email_address,
          person_location: c.person_location_raw,
          company_location: c.company_location_raw,
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
          onUploadCSV={handleUploadCSV}
          onPushToAffinity={handlePushToAffinity}
          onExportCSV={handleExportCSV}
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
      />

      <ManualLocationDialog
        open={!!manualDialogContactId}
        onOpenChange={(open) => { if (!open) setManualDialogContactId(null); }}
        contactName={manualDialogContact?.name || ''}
        onSubmit={handleManualSubmit}
      />
    </div>
  );
};

export default Index;
