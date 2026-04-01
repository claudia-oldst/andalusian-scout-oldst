

# Firecrawl OSINT Pipeline — Full Implementation

## Overview
Connect Firecrawl, create edge functions for search and scrape, build a frontend discovery workflow that auto-locates contacts using Google Dorking and website crawling, and logs all results to `activity_logs`.

---

## Step 1: Connect Firecrawl
Link the existing Firecrawl connection (`std_01kkekkwc3ey9trfj4rrq0a1nd`) to the project so the `FIRECRAWL_API_KEY` secret is available in edge functions.

## Step 2: Create Edge Functions

**`supabase/functions/firecrawl-search/index.ts`** — Google Dorking
- Accepts `{ query: string, limit?: number }` 
- Calls Firecrawl Search API (`https://api.firecrawl.dev/v1/search`) with the query
- Returns search results (title, URL, description, optional markdown)
- Used for queries like `"John Smith" site:linkedin.com location`

**`supabase/functions/firecrawl-scrape/index.ts`** — Website/Page Scrape
- Accepts `{ url: string, formats?: string[] }`
- Calls Firecrawl Scrape API (`https://api.firecrawl.dev/v1/scrape`)
- Returns markdown content from a specific URL
- Used to extract location info from company websites or LinkedIn profiles

Both functions include CORS headers, input validation, and proper error handling.

## Step 3: Frontend API Layer

**`src/lib/api/firecrawl.ts`** — Client-side wrapper
- `firecrawlApi.search(query, options)` — invokes the search edge function
- `firecrawlApi.scrape(url, options)` — invokes the scrape edge function
- Both return typed `{ success, data?, error? }` responses

## Step 4: Discovery Workflow in Index.tsx

Replace the "Find Contacts" placeholder with a real OSINT pipeline:

1. User clicks **Find Contacts** — iterates through contacts with `designation_id === 4` (Pending)
2. For each pending contact, runs two searches via the search edge function:
   - `"[name]" "[company]" location` — Google Dorking for person location
   - `"[company]" headquarters office location` — company location lookup
3. Updates `person_location_raw` and `company_location_raw` on the contact with snippets from results
4. Recalculates `confidence_id` based on whether person/company locations match
5. Logs each search to `activity_logs` with event_type_id 1 (Google Dorking) including query, source URL, and result snippet
6. Shows a progress toast as it processes contacts
7. Reloads data when complete

## Step 5: Add Discovery Button to Activity Log Modal

Add a "Run Discovery" button inside the contact detail modal that triggers the same search flow for a single contact, so users can re-run OSINT on individual records.

---

## Technical Details

- Firecrawl is **not** a gateway connector — we call the API directly using `FIRECRAWL_API_KEY` from `Deno.env.get()`
- Edge functions use `Deno.serve()` with CORS headers from `@supabase/supabase-js/cors`
- The search query construction uses Google Dorking patterns (site filters, quoted names)
- `supabase-queries.ts` will get a new `updateContactLocations()` function for batch-updating raw location fields
- Rate limiting: sequential processing with a small delay between contacts to avoid hitting Firecrawl limits

