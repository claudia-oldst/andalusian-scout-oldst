import { useCallback, useRef } from 'react';
import { Contact, CONFIDENCE } from '@/types/contact';
import { bulkUpsertContacts } from '@/lib/supabase-queries';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export function useCSVImport(contacts: Contact[], invalidateContacts: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          const skippedCount = (results.data as any[]).length - rows.length;

          const batchRows = rows.map((row) => {
            const personLoc = row.person_location || '';
            const companyLoc = row.company_location || '';
            let confId: number = CONFIDENCE.LOW;
            if (personLoc && companyLoc) {
              confId = personLoc === companyLoc ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
            }
            return {
              affinity_id: row.affinity_id || crypto.randomUUID(),
              name: row.name,
              company_name: row.company || '',
              email_address: row.email,
              person_location_raw: personLoc,
              company_location_raw: companyLoc ? [companyLoc] : [],
              confidence_id: confId,
            };
          });

          try {
            const chunkSize = 100;
            for (let i = 0; i < batchRows.length; i += chunkSize) {
              await bulkUpsertContacts(batchRows.slice(i, i + chunkSize));
            }
            invalidateContacts();
            const skippedMsg = skippedCount > 0 ? ` (${skippedCount} rows skipped — missing name or email)` : '';
            toast({ title: 'CSV Imported', description: `${batchRows.length} contacts upserted.${skippedMsg}` });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            toast({ title: 'Import Failed', description: `CSV import failed: ${msg}`, variant: 'destructive' });
          }
        },
      });
      e.target.value = '';
    },
    [toast, invalidateContacts]
  );

  const handleExportCSV = useCallback(() => {
    const approved = contacts.filter((c) => c.is_approved);
    if (approved.length === 0) {
      toast({ title: 'No Approved Records', description: 'Approve at least one contact before exporting.', variant: 'destructive' });
      return;
    }
    const csv = Papa.unparse(
      approved.map((c) => {
        let finalLocation = '';
        switch (c.designation_id) {
          case 1: finalLocation = c.person_location_raw; break;
          case 2: finalLocation = c.company_location_raw.join(', '); break;
          case 3: finalLocation = c.manual_location; break;
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

  const handleAddContact = useCallback(
    async (data: { affinity_id: string; name: string; company_name: string; email_address: string }) => {
      try {
        await bulkUpsertContacts([{
          affinity_id: data.affinity_id,
          name: data.name,
          company_name: data.company_name,
          email_address: data.email_address,
          person_location_raw: '',
          company_location_raw: [],
          confidence_id: CONFIDENCE.LOW,
        }]);
        invalidateContacts();
        toast({ title: 'Contact Added', description: `${data.name} has been added.` });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: 'Failed to Add Contact', description: `Could not add ${data.name}: ${msg}`, variant: 'destructive' });
        return false;
      }
    },
    [invalidateContacts, toast]
  );

  return {
    fileInputRef,
    handleUploadCSV,
    handleFileChange,
    handleExportCSV,
    handleAddContact,
  };
}
