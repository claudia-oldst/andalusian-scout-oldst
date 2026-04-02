// Lookup types matching Supabase tables
export interface ConfidenceLevelLookup {
  id: number;
  label: string;
  color_hex: string | null;
}

export interface DesignationTypeLookup {
  id: number;
  label: string;
}

export interface LogEventTypeLookup {
  id: number;
  label: string;
  icon_name: string | null;
}

// Designation IDs
export const DESIGNATION = {
  PERSON: 1,
  COMPANY: 2,
  MANUAL: 3,
  PENDING: 4,
} as const;

// Confidence IDs
export const CONFIDENCE = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

export interface ActivityLog {
  id: string;
  contact_id: string;
  event_type_id: number;
  query_used: string;
  source_url: string;
  result_snippet: string;
  created_at: string;
  // Joined from lookup
  event_type?: LogEventTypeLookup;
}

export interface Company {
  id: string;
  domain: string;
  name: string | null;
  hq_locations: string[];
  website_url: string | null;
  last_scraped_at: string | null;
}

export interface Contact {
  id: string;
  affinity_id: string | null;
  name: string;
  company_name: string;
  email_address: string;
  person_location_raw: string;
  company_location_raw: string[];
  company_id: string | null;
  confidence_id: number;
  designation_id: number;
  manual_location: string;
  manual_source_note: string;
  is_approved: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined from lookups
  confidence_level?: ConfidenceLevelLookup;
  designation_type?: DesignationTypeLookup;
  // Joined from companies
  company?: { website_url: string | null } | null;
  // Nested activity logs (loaded separately)
  activity_logs?: ActivityLog[];
}

export interface Lookups {
  confidenceLevels: ConfidenceLevelLookup[];
  designationTypes: DesignationTypeLookup[];
  logEventTypes: LogEventTypeLookup[];
}
