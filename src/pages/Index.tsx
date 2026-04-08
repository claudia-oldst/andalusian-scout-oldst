import { useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ContactTable } from '@/components/ContactTable';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ManualLocationDialog } from '@/components/ManualLocationDialog';
import { AddContactDialog } from '@/components/AddContactDialog';
import { AffinityImportDialog } from '@/components/AffinityImportDialog';
import { Contact, ActivityLog, DESIGNATION } from '@/types/contact';
import { fetchActivityLogs } from '@/lib/supabase-queries';
import { useContacts } from '@/hooks/useContacts';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useCSVImport } from '@/hooks/useCSVImport';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Index = () => {
  const {
    contacts,
    lookups,
    loading,
    totalCount,
    totalPages,
    page,
    setPage,
    searchTerm,
    setSearchTerm,
    confidenceFilter,
    setConfidenceFilter,
    approvalFilter,
    setApprovalFilter,
    allVisibleApproved,
    handleToggleApproval,
    handleApproveAll,
    handleHILChange,
    handleManualSubmit,
    handleDeleteContact,
    invalidateContacts,
  } = useContacts();

  const { discoveryRunning, handleBulkDiscovery, handleSingleDiscovery } = useDiscovery(invalidateContacts);
  const { fileInputRef, handleUploadCSV, handleFileChange, handleExportCSV, handleAddContact } = useCSVImport(contacts, invalidateContacts);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ActivityLog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [manualDialogContactId, setManualDialogContactId] = useState<string | null>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [affinityOpen, setAffinityOpen] = useState(false);
  const { toast } = useToast();

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

  const handleHILChangeWithManual = useCallback(
    async (id: string, designationId: number) => {
      if (String(designationId) === 'manual_new' || isNaN(designationId)) {
        setManualDialogContactId(id);
        return;
      }
      await handleHILChange(id, designationId);
    },
    [handleHILChange]
  );

  const handleManualDialogSubmit = useCallback(
    async (city: string, country: string, source: string) => {
      if (!manualDialogContactId) return;
      await handleManualSubmit(manualDialogContactId, city, country, source);
      setManualDialogContactId(null);
    },
    [manualDialogContactId, handleManualSubmit]
  );

  const handleRunSingleDiscovery = useCallback(
    async (contactId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const logs = await handleSingleDiscovery(contact);
      setSelectedLogs(logs);
    },
    [contacts, handleSingleDiscovery]
  );

  const handleExportVerified = useCallback(() => {
    handleExportCSV();
  }, [handleExportCSV]);

  const handleAddContactSubmit = useCallback(
    async (data: { affinity_id: string; name: string; company_name: string; email_address: string }) => {
      const success = await handleAddContact(data);
      if (success) setAddContactOpen(false);
    },
    [handleAddContact]
  );

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
        <main className="container py-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-9 w-[140px]" />
          </div>
          <Skeleton className="h-4 w-48" />
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </main>
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
          onAddContact={() => setAddContactOpen(true)}
          onUploadCSV={handleUploadCSV}
          onExportCSV={handleExportVerified}
          onRunBulkDiscovery={handleBulkDiscovery}
          onAffinityImport={() => setAffinityOpen(true)}
          discoveryRunning={discoveryRunning}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            {totalCount} contact{totalCount !== 1 ? 's' : ''} ·{' '}
            Page {page + 1} of {Math.max(totalPages, 1)}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page + 1}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <ContactTable
          contacts={contacts}
          onToggleApproval={handleToggleApproval}
          onApproveAll={handleApproveAll}
          onHILChange={handleHILChangeWithManual}
          onRowClick={handleRowClick}
          onRunDiscovery={handleRunSingleDiscovery}
          onDeleteContact={handleDeleteContact}
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
        onHILChange={handleHILChangeWithManual}
        onRunDiscovery={handleRunSingleDiscovery}
        discoveryRunning={discoveryRunning}
      />

      <ManualLocationDialog
        open={!!manualDialogContactId}
        onOpenChange={(open) => { if (!open) setManualDialogContactId(null); }}
        contactName={manualDialogContact?.name || ''}
        onSubmit={handleManualDialogSubmit}
      />

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onSubmit={handleAddContactSubmit}
      />

      <AffinityImportDialog
        open={affinityOpen}
        onOpenChange={setAffinityOpen}
        invalidateContacts={invalidateContacts}
      />
    </div>
  );
};

export default Index;
