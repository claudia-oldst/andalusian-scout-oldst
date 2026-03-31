import { useState, useMemo, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ContactTable } from '@/components/ContactTable';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ManualLocationDialog } from '@/components/ManualLocationDialog';
import { mockContacts } from '@/data/mockData';
import { Contact, HILDesignation } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [manualDialogContactId, setManualDialogContactId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const q = searchTerm.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [contacts, searchTerm]);

  const allVisibleApproved = useMemo(
    () => filteredContacts.length > 0 && filteredContacts.every((c) => c.approved),
    [filteredContacts]
  );

  const updateContact = useCallback((id: string, patch: Partial<Contact>) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSelectedContact((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const handleToggleApproval = useCallback(
    (id: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      if (!contact.hilDesignation && !contact.approved) {
        toast({ title: 'Designation Required', description: 'Select a designation before approving.', variant: 'destructive' });
        return;
      }
      updateContact(id, { approved: !contact.approved });
    },
    [contacts, updateContact, toast]
  );

  const handleApproveAll = useCallback(
    (checked: boolean) => {
      const visibleIds = new Set(filteredContacts.map((c) => c.id));
      setContacts((prev) =>
        prev.map((c) =>
          visibleIds.has(c.id) && (c.hilDesignation || !checked)
            ? { ...c, approved: checked }
            : c
        )
      );
      if (checked) {
        const skipped = filteredContacts.filter((c) => !c.hilDesignation).length;
        if (skipped > 0) {
          toast({ title: 'Some Skipped', description: `${skipped} contact(s) need a designation before approval.` });
        }
      }
    },
    [filteredContacts, toast]
  );

  const handleHILChange = useCallback(
    (id: string, value: HILDesignation | 'manual_new') => {
      if (value === 'manual_new') {
        setManualDialogContactId(id);
        return;
      }
      updateContact(id, { hilDesignation: value as HILDesignation });
    },
    [updateContact]
  );

  const handleManualSubmit = useCallback(
    (city: string, country: string, source: string) => {
      if (!manualDialogContactId) return;
      const location = `${city}, ${country}`;
      const newLog = {
        id: `manual-${Date.now()}`,
        contactId: manualDialogContactId,
        eventType: 'manual_entry' as const,
        queryUsed: source || 'No source provided',
        sourceUrl: '',
        resultSummary: `Manual location set to "${location}". Source: ${source || 'Not specified'}.`,
        timestamp: new Date().toISOString(),
      };
      setContacts((prev) =>
        prev.map((c) =>
          c.id === manualDialogContactId
            ? {
                ...c,
                hilDesignation: 'manual' as HILDesignation,
                manualLocation: location,
                manualSource: source,
                activityLogs: [...c.activityLogs, newLog],
              }
            : c
        )
      );
      setManualDialogContactId(null);
    },
    [manualDialogContactId]
  );

  const handleRowClick = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
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
        complete: (results) => {
          const newContacts: Contact[] = (results.data as any[])
            .filter((row) => row.name && row.email)
            .map((row, i) => ({
              id: `csv-${Date.now()}-${i}`,
              name: row.name || '',
              company: row.company || '',
              email: row.email || '',
              personLocation: row.person_location || '',
              companyLocation: row.company_location || '',
              confidence:
                row.person_location && row.company_location
                  ? row.person_location === row.company_location
                    ? 'high'
                    : 'medium'
                  : 'low',
              hilDesignation: '',
              manualLocation: '',
              manualSource: '',
              approved: false,
              affinityId: row.affinity_id || '',
              activityLogs: [],
            }));
          setContacts((prev) => [...prev, ...newContacts]);
          toast({ title: 'CSV Imported', description: `${newContacts.length} contacts added.` });
        },
      });
      e.target.value = '';
    },
    [toast]
  );

  const handlePushToAffinity = useCallback(() => {
    const approved = contacts.filter((c) => c.approved);
    toast({
      title: 'Push to Affinity',
      description: `${approved.length} approved contacts ready to push. (placeholder)`,
    });
  }, [contacts, toast]);

  const handleExportCSV = useCallback(() => {
    const approved = contacts.filter((c) => c.approved);
    if (approved.length === 0) {
      toast({ title: 'No Records', description: 'Approve at least one contact to export.', variant: 'destructive' });
      return;
    }
    const csv = Papa.unparse(
      approved.map((c) => ({
        name: c.name,
        company: c.company,
        email: c.email,
        person_location: c.personLocation,
        company_location: c.companyLocation,
        final_location: c.hilDesignation === 'manual' ? c.manualLocation
          : c.hilDesignation === 'person_location' ? c.personLocation
          : c.hilDesignation === 'company_location' ? c.companyLocation
          : '',
        confidence: c.confidence,
        hil_designation: c.hilDesignation,
        affinity_id: c.affinityId,
      }))
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
          onFetchContacts={handleFetchContacts}
          onUploadCSV={handleUploadCSV}
          onPushToAffinity={handlePushToAffinity}
          onExportCSV={handleExportCSV}
        />

        <p className="text-[11px] text-muted-foreground tracking-wider uppercase">
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} ·{' '}
          {contacts.filter((c) => c.approved).length} approved
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
