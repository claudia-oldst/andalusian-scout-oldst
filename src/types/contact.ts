export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type HILDesignation = 'person_location' | 'company_location' | 'manual' | '';

export interface ActivityLog {
  id: string;
  contactId: string;
  eventType: 'google_dork_linkedin' | 'firecrawl_website' | 'affinity_sync';
  queryUsed: string;
  sourceUrl: string;
  resultSummary: string;
  timestamp: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  personLocation: string;
  companyLocation: string;
  confidence: ConfidenceLevel;
  hilDesignation: HILDesignation;
  approved: boolean;
  affinityId: string;
  activityLogs: ActivityLog[];
}
