
-- Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  name text,
  hq_locations text[] DEFAULT '{}'::text[],
  website_url text,
  last_scraped_at timestamptz
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all companies" ON public.companies
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add company_id FK to contacts
ALTER TABLE public.contacts ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Change company_location_raw from text to text[]
ALTER TABLE public.contacts
  ALTER COLUMN company_location_raw DROP DEFAULT,
  ALTER COLUMN company_location_raw TYPE text[] USING
    CASE
      WHEN company_location_raw IS NULL OR company_location_raw = '' THEN '{}'::text[]
      ELSE ARRAY[company_location_raw]
    END,
  ALTER COLUMN company_location_raw SET DEFAULT '{}'::text[];
