import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { bulkUpsertContacts } from '@/lib/supabase-queries';
import { CONFIDENCE } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

// Affinity entry shape (simplified)
export interface AffinityField {
  id: string;
  value?: {
    data?: Record<string, string>;
    [key: string]: unknown;
  } | string | null;
}

export interface AffinityEntry {
  id: number;
  entity: {
    id: number;
    type: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    primaryEmailAddress?: string;
    fields?: AffinityField[];
  };
  creatorId?: number;
  createdAt?: string;
}

export interface AffinityFilters {
  onlyMissingLocation: boolean;
  onlyUserId: string;
}

function extractLocation(entry: AffinityEntry): string {
  const fields = entry.entity.fields || [];
  const locField = fields.find((f) => f.id === 'affinity-data-location');
  if (!locField || !locField.value || typeof locField.value === 'string') return '';
  const data = locField.value.data;
  if (!data || Object.keys(data).length === 0) return '';
  return [data.city, data.state, data.country].filter(Boolean).join(', ');
}

function extractName(entry: AffinityEntry): string {
  if (entry.entity.name) return entry.entity.name;
  return [entry.entity.firstName, entry.entity.lastName].filter(Boolean).join(' ') || `Entry ${entry.id}`;
}

function extractEmail(entry: AffinityEntry): string {
  if (entry.entity.primaryEmailAddress) return entry.entity.primaryEmailAddress;
  const fields = entry.entity.fields || [];
  const emailField = fields.find((f) => f.id.includes('email'));
  if (emailField && typeof emailField.value === 'string') return emailField.value;
  return '';
}

function extractCompany(entry: AffinityEntry): string {
  const fields = entry.entity.fields || [];
  const companyField = fields.find(
    (f) => f.id.includes('company') || f.id.includes('organization')
  );
  if (companyField && typeof companyField.value === 'string') return companyField.value;
  return '';
}

export function useAffinityImport(invalidateContacts: () => void) {
  const [entries, setEntries] = useState<AffinityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<AffinityFilters>({
    onlyMissingLocation: false,
    onlyUserId: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const fetchEntries = useCallback(
    async (listId: string, savedViewId?: string) => {
      setLoading(true);
      setEntries([]);
      setSelectedIds(new Set());
      try {
        const { data, error } = await supabase.functions.invoke('affinity-sync', {
          body: { listId, savedViewId: savedViewId || undefined },
        });
        if (error) throw new Error(error.message || 'Failed to fetch from Affinity');
        if (data?.error) throw new Error(data.error);
        const fetched = (data?.entries || []) as AffinityEntry[];
        setEntries(fetched);
        toast({
          title: 'Fetched from Affinity',
          description: `${fetched.length} entries loaded`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Affinity fetch failed', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filters.onlyMissingLocation) {
      result = result.filter((e) => !extractLocation(e));
    }
    if (filters.onlyUserId) {
      result = result.filter((e) => String(e.creatorId) === filters.onlyUserId);
    }
    return result;
  }, [entries, filters]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredEntries.length) return new Set();
      return new Set(filteredEntries.map((e) => e.id));
    });
  }, [filteredEntries]);

  const importSelected = useCallback(async () => {
    const toImport = filteredEntries.filter((e) => selectedIds.has(e.id));
    if (toImport.length === 0) {
      toast({ title: 'No entries selected', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const contacts = toImport.map((entry) => ({
        affinity_id: String(entry.entity.id),
        name: extractName(entry),
        company_name: extractCompany(entry) || 'Unknown',
        email_address: extractEmail(entry) || `unknown-${entry.entity.id}@placeholder.com`,
        person_location_raw: extractLocation(entry),
        company_location_raw: [] as string[],
        confidence_id: CONFIDENCE.LOW,
      }));
      await bulkUpsertContacts(contacts);
      invalidateContacts();
      toast({
        title: 'Import complete',
        description: `${contacts.length} contacts imported from Affinity`,
      });
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast({ title: 'Import failed', description: msg, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [filteredEntries, selectedIds, invalidateContacts, toast]);

  return {
    entries: filteredEntries,
    allEntries: entries,
    loading,
    importing,
    filters,
    setFilters,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    fetchEntries,
    importSelected,
    extractLocation,
    extractName,
    extractEmail,
  };
}
