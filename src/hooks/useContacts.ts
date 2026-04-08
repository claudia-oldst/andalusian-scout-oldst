import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { fetchContacts, fetchLookups, toggleApproval, bulkSetApproval, updateContactDesignation, insertActivityLog, deleteContact, bulkDeleteContacts, type FetchContactsParams } from '@/lib/supabase-queries';
import { Contact, Lookups, DESIGNATION, EVENT_TYPE } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

export function useContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const pageSize = 50;

  const queryParams: FetchContactsParams = useMemo(() => ({
    page,
    pageSize,
    search: searchTerm,
    confidenceFilter,
    approvalFilter,
  }), [page, pageSize, searchTerm, confidenceFilter, approvalFilter]);

  const { data: contactsResult, isLoading: contactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: ['contacts', queryParams],
    queryFn: () => fetchContacts(queryParams),
    staleTime: 30_000,
  });

  const { data: lookups, isLoading: lookupsLoading } = useQuery({
    queryKey: ['lookups'],
    queryFn: fetchLookups,
    staleTime: 5 * 60_000,
  });

  const contacts = contactsResult?.data ?? [];
  const totalCount = contactsResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const loading = contactsLoading || lookupsLoading;

  const invalidateContacts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient]);

  const allVisibleApproved = useMemo(
    () => contacts.length > 0 && contacts.every((c) => c.is_approved),
    [contacts]
  );

  const handleToggleApproval = useCallback(
    async (id: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      if (contact.designation_id === DESIGNATION.PENDING && !contact.is_approved) {
        toast({ title: 'Designation Required', description: 'Please select a location designation before approving this contact.', variant: 'destructive' });
        return;
      }
      const newVal = !contact.is_approved;
      try {
        await toggleApproval(id, newVal);
        invalidateContacts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Approval Failed', description: `Could not update approval status: ${msg}`, variant: 'destructive' });
      }
    },
    [contacts, toast, invalidateContacts]
  );

  const handleApproveAll = useCallback(
    async (checked: boolean) => {
      const eligible = contacts.filter((c) => c.designation_id !== DESIGNATION.PENDING || !checked);
      const ids = eligible.map((c) => c.id);
      try {
        await bulkSetApproval(ids, checked);
        invalidateContacts();
        if (checked) {
          const skipped = contacts.filter((c) => c.designation_id === DESIGNATION.PENDING).length;
          if (skipped > 0) {
            toast({ title: 'Some Contacts Skipped', description: `${skipped} contact(s) need a designation before they can be approved.` });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Bulk Update Failed', description: `Could not update approval status: ${msg}`, variant: 'destructive' });
      }
    },
    [contacts, toast, invalidateContacts]
  );

  const handleHILChange = useCallback(
    async (id: string, designationId: number) => {
      try {
        await updateContactDesignation(id, designationId);
        invalidateContacts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Designation Update Failed', description: `Could not update designation: ${msg}`, variant: 'destructive' });
      }
    },
    [toast, invalidateContacts]
  );

  const handleManualSubmit = useCallback(
    async (contactId: string, city: string, country: string, source: string) => {
      const location = `${city}, ${country}`;
      try {
        await updateContactDesignation(contactId, DESIGNATION.MANUAL, location, source);
        await insertActivityLog({
          contact_id: contactId,
          event_type_id: EVENT_TYPE.MANUAL_ENTRY,
          query_used: source || 'No source provided',
          source_url: '',
          result_snippet: `Manual location set to "${location}". Source: ${source || 'Not specified'}.`,
        });
        invalidateContacts();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Manual Location Failed', description: `Could not save manual location: ${msg}`, variant: 'destructive' });
      }
    },
    [toast, invalidateContacts]
  );

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setPage(0);
  }, []);

  const handleConfidenceFilterChange = useCallback((val: string) => {
    setConfidenceFilter(val);
    setPage(0);
  }, []);

  const handleApprovalFilterChange = useCallback((val: 'all' | 'approved' | 'pending') => {
    setApprovalFilter(val);
    setPage(0);
  }, []);

  return {
    contacts,
    lookups: lookups ?? null,
    loading,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    searchTerm,
    setSearchTerm: handleSearchChange,
    confidenceFilter,
    setConfidenceFilter: handleConfidenceFilterChange,
    approvalFilter,
    setApprovalFilter: handleApprovalFilterChange,
    allVisibleApproved,
    handleToggleApproval,
    handleApproveAll,
    handleHILChange,
    handleManualSubmit,
    invalidateContacts,
    refetchContacts,
  };
}
