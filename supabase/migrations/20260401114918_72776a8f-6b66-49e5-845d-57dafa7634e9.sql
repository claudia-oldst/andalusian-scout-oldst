
-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LOOKUP TABLES
CREATE TABLE public.confidence_levels (
  id smallint PRIMARY KEY,
  label text NOT NULL,
  color_hex text
);

CREATE TABLE public.designation_types (
  id smallint PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE public.log_event_types (
  id smallint PRIMARY KEY,
  label text NOT NULL,
  icon_name text
);

-- 2. MASTER CONTACTS TABLE
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affinity_id text UNIQUE,
  name text NOT NULL,
  company_name text NOT NULL,
  email_address text NOT NULL,
  person_location_raw text DEFAULT '',
  company_location_raw text DEFAULT '',
  confidence_id smallint REFERENCES public.confidence_levels(id) DEFAULT 3,
  designation_id smallint REFERENCES public.designation_types(id) DEFAULT 4,
  manual_location text DEFAULT '',
  manual_source_note text DEFAULT '',
  is_approved boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. ACTIVITY LOGS
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_type_id smallint REFERENCES public.log_event_types(id),
  query_used text DEFAULT '',
  source_url text DEFAULT '',
  result_snippet text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 4. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- 5. RLS POLICIES
ALTER TABLE public.confidence_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read confidence_levels" ON public.confidence_levels FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read designation_types" ON public.designation_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read log_event_types" ON public.log_event_types FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon all contacts" ON public.contacts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all activity_logs" ON public.activity_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. SEED LOOKUP DATA
INSERT INTO public.confidence_levels (id, label, color_hex) VALUES
  (1, 'High', '#10B981'),
  (2, 'Medium', '#F59E0B'),
  (3, 'Low', '#64748B');

INSERT INTO public.designation_types (id, label) VALUES
  (1, 'Person Source'),
  (2, 'Company Source'),
  (3, 'Manual Override'),
  (4, 'Pending');

INSERT INTO public.log_event_types (id, label, icon_name) VALUES
  (1, 'Google Dorking · LinkedIn Scrape', 'search'),
  (2, 'Firecrawl · LinkedIn Scrape', 'linkedin'),
  (3, 'Firecrawl · Website Crawl', 'globe'),
  (4, 'Affinity CRM · Sync', 'refresh'),
  (5, 'Manual Entry · User Provided', 'edit');

-- 7. SEED MOCK CONTACTS
INSERT INTO public.contacts (id, affinity_id, name, company_name, email_address, person_location_raw, company_location_raw, confidence_id, designation_id, is_approved) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'AFF-00142', 'Claudia Fernández', 'Old St Labs', 'claudia@oldstlabs.com', 'London, UK', 'London, UK', 1, 4, false),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'AFF-00287', 'John Doe', 'TechFlow', 'john.doe@techflow.io', 'San Francisco, CA', 'Austin, TX', 2, 4, false),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'AFF-00391', 'Sarah Chen', 'Nexus Venture', 'sarah.chen@nexusventure.co', 'Singapore', 'Hong Kong', 3, 4, false);

-- 8. SEED ACTIVITY LOGS
INSERT INTO public.activity_logs (contact_id, event_type_id, query_used, source_url, result_snippet, created_at) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 1, 'site:linkedin.com/in/ "Claudia Fernández" "Old St Labs"', 'https://linkedin.com/in/claudia-fernandez-oldst', 'LinkedIn profile found. Location listed as "London, United Kingdom". Role: Managing Director.', '2025-03-28T10:15:00Z'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 3, 'https://oldstlabs.com/about', 'https://oldstlabs.com/about', 'Company HQ address: 42 Old Street, London EC1V 9AE. Matches LinkedIn location.', '2025-03-28T10:16:30Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 1, 'site:linkedin.com/in/ "John Doe" "TechFlow"', 'https://linkedin.com/in/johndoe-techflow', 'LinkedIn profile found. Location listed as "San Francisco Bay Area". Role: VP Engineering.', '2025-03-27T14:22:00Z'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 3, 'https://techflow.io/contact', 'https://techflow.io/contact', 'Company HQ address: 200 Congress Ave, Austin, TX 78701. Does NOT match LinkedIn location.', '2025-03-27T14:23:45Z'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 1, 'site:linkedin.com/in/ "Sarah Chen" "Nexus Venture"', 'https://linkedin.com/in/sarahchen-nexus', 'LinkedIn profile found. Location listed as "Singapore". Role: Partner. Profile appears outdated.', '2025-03-26T09:05:00Z'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 3, 'https://nexusventure.co/team', 'https://nexusventure.co/team', 'Company lists offices in Hong Kong and Singapore. Sarah Chen listed under "Hong Kong Office" team page.', '2025-03-26T09:06:15Z'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 4, 'GET /api/persons?email=sarah.chen@nexusventure.co', 'https://api.affinity.co/persons', 'Affinity record shows location as "Hong Kong" — conflicts with LinkedIn. Low confidence.', '2025-03-26T09:07:00Z');
