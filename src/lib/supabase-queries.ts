import { supabase } from '@/integrations/supabase/client';
import type { Contact, ActivityLog, Lookups } from '@/types/contact';

export async function fetchLookups(): Promise<Lookups> {
  const [conf, desig, events] = await Promise.all([
    supabase.from('confidence_levels').select('*').order('id'),
    supabase.from('designation_types').select('*').order('id'),
    supabase.from('log_event_types').select('*').order('id'),
  ]);

  return {
    confidenceLevels: (conf.data as Lookups['confidenceLevels']) || [],
    designationTypes: (desig.data as Lookups['designationTypes']) || [],
    logEventTypes: (events.data as Lookups['logEventTypes']) || [],
  };
}

export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, confidence_level:confidence_levels(*), designation_type:designation_types(*)')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as unknown as Contact[]) || [];
}

export async function fetchActivityLogs(contactId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, event_type:log_event_types(*)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as unknown as ActivityLog[]) || [];
}

export async function updateContactDesignation(
  id: string,
  designationId: number,
  manualLocation?: string,
  manualSourceNote?: string
) {
  const patch: Record<string, unknown> = { designation_id: designationId };
  if (manualLocation !== undefined) patch.manual_location = manualLocation;
  if (manualSourceNote !== undefined) patch.manual_source_note = manualSourceNote;

  const { error } = await supabase.from('contacts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function toggleApproval(id: string, approved: boolean) {
  const { error } = await supabase.from('contacts').update({ is_approved: approved }).eq('id', id);
  if (error) throw error;
}

export async function bulkSetApproval(ids: string[], approved: boolean) {
  const { error } = await supabase.from('contacts').update({ is_approved: approved }).in('id', ids);
  if (error) throw error;
}

export async function insertActivityLog(log: {
  contact_id: string;
  event_type_id: number;
  query_used: string;
  source_url: string;
  result_snippet: string;
}) {
  const { error } = await supabase.from('activity_logs').insert(log);
  if (error) throw error;
}

export async function upsertContactFromCSV(contact: {
  affinity_id: string;
  name: string;
  company_name: string;
  email_address: string;
  person_location_raw: string;
  company_location_raw: string;
  confidence_id: number;
}) {
  const { error } = await supabase
    .from('contacts')
    .upsert(contact, { onConflict: 'affinity_id' });
  if (error) throw error;
}
