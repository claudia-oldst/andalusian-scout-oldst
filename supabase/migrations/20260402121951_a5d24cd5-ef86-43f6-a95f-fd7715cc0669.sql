
-- Drop overly permissive anon policies on contacts
DROP POLICY IF EXISTS "Allow anon all contacts" ON public.contacts;

-- Drop overly permissive anon policies on companies
DROP POLICY IF EXISTS "Allow anon all companies" ON public.companies;

-- Drop overly permissive anon policies on activity_logs
DROP POLICY IF EXISTS "Allow anon all activity_logs" ON public.activity_logs;

-- Contacts: authenticated users can read all records
CREATE POLICY "Allow authenticated read contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (true);

-- Contacts: authenticated users can insert/update/delete
CREATE POLICY "Allow authenticated write contacts"
  ON public.contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Companies: authenticated users can read all records
CREATE POLICY "Allow authenticated read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

-- Companies: authenticated users can write
CREATE POLICY "Allow authenticated write companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Activity logs: authenticated users can read all records
CREATE POLICY "Allow authenticated read activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- Activity logs: authenticated users can write
CREATE POLICY "Allow authenticated write activity_logs"
  ON public.activity_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
