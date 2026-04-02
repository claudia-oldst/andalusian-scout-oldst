import { supabase } from '@/integrations/supabase/client';
import type { Contact, ActivityLog, Lookups, Company } from '@/types/contact';

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export interface FetchContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  confidenceFilter?: string;
  approvalFilter?: 'all' | 'approved' | 'pending';
}

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

export async function fetchContacts(params: FetchContactsParams = {}): Promise<PaginatedResult<Contact>> {
  const { page = 0, pageSize = 50, search, confidenceFilter, approvalFilter } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('contacts')
    .select('*, confidence_level:confidence_levels(*), designation_type:designation_types(*), company:companies(website_url)', { count: 'exact' })
    .order('created_at', { ascending: true })
    .range(from, to);

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`name.ilike.${q},company_name.ilike.${q},email_address.ilike.${q}`);
  }

  if (confidenceFilter && confidenceFilter !== 'all') {
    query = query.eq('confidence_id', Number(confidenceFilter));
  }

  if (approvalFilter === 'approved') {
    query = query.eq('is_approved', true);
  } else if (approvalFilter === 'pending') {
    query = query.eq('is_approved', false);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as unknown as Contact[]) || [], count: count ?? 0 };
}

export async function fetchAllContactIds(designationId?: number): Promise<string[]> {
  let query = supabase.from('contacts').select('id');
  if (designationId !== undefined) {
    query = query.eq('designation_id', designationId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((c) => c.id);
}

export async function fetchContactsByIds(ids: string[]): Promise<Contact[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('contacts')
    .select('*, confidence_level:confidence_levels(*), designation_type:designation_types(*), company:companies(website_url)')
    .in('id', ids);
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

export async function bulkUpsertContacts(contacts: {
  affinity_id: string;
  name: string;
  company_name: string;
  email_address: string;
  person_location_raw: string;
  company_location_raw: string[];
  confidence_id: number;
}[]) {
  if (contacts.length === 0) return;
  const { error } = await supabase
    .from('contacts')
    .upsert(contacts, { onConflict: 'affinity_id' });
  if (error) throw error;
}

export async function updateContactLocations(
  id: string,
  personLocation: string,
  companyLocations: string[],
  confidenceId: number,
  companyId?: string
) {
  const patch: Record<string, unknown> = {
    person_location_raw: personLocation,
    company_location_raw: companyLocations,
    confidence_id: confidenceId,
  };
  if (companyId) patch.company_id = companyId;

  const { error } = await supabase
    .from('contacts')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

// ── Company cache queries ──────────────────────────────────────

export async function fetchCompanyByDomain(domain: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('domain', domain)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Company) || null;
}

export async function upsertCompany(company: {
  domain: string;
  name?: string;
  hq_locations: string[];
  website_url?: string;
}): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .upsert(
      {
        domain: company.domain,
        name: company.name || null,
        hq_locations: company.hq_locations,
        website_url: company.website_url || null,
        last_scraped_at: new Date().toISOString(),
      },
      { onConflict: 'domain' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Company;
}

export async function linkContactToCompany(contactId: string, companyId: string) {
  const { error } = await supabase
    .from('contacts')
    .update({ company_id: companyId })
    .eq('id', contactId);
  if (error) throw error;
}
