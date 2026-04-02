

# Revised Plan: Company Location Discovery with Multi-Location Support

## Change from Previous Plan
The `companies.hq_location` column becomes `text[]` (array) instead of `text`, storing all locations found on the company website. The `contacts.company_location_raw` also becomes an array to display multiple locations in the UI.

## Database Changes

### New `companies` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| domain | text UNIQUE NOT NULL | e.g. `old.st` |
| name | text | Company name |
| hq_locations | text[] | Array of verified addresses |
| website_url | text | The specific page scraped |
| last_scraped_at | timestamptz | Cache staleness check |

### Modify `contacts` table
- Add `company_id uuid` nullable FK to `companies.id`
- Change `company_location_raw` from `text` to `text[]` (default `'{}'::text[]`)

## New Files

### `supabase/functions/firecrawl-map/index.ts`
Standard edge function calling Firecrawl `/v1/map`. Same CORS pattern as existing functions.

### `src/lib/extract-domain.ts`
- `extractDomainFromEmail(email)` → `https://www.{domain}` or `null`
- Ignore list: gmail.com, outlook.com, hotmail.com, icloud.com, yahoo.com, aol.com

## Modified Files

### `src/lib/api/firecrawl.ts`
Add `map(url, options)` method.

### `src/lib/extract-location.ts`
- Rename/enhance `extractCompanyLocationFromMarkdown` → returns `string[]` (all locations found)
- Add patterns: structured address blocks, postal codes, footer content, "Registered office" labels
- Collect all matches instead of returning first match

### `src/pages/Index.tsx` — company discovery block
Replace search-based lookup with:
1. Parse domain from email (skip free providers)
2. Check `companies` cache table
3. If miss: map domain → filter for high-value pages → scrape top 2 → merge markdown → extract all locations
4. Upsert into `companies`, link contact via `company_id`
5. Store locations array in `company_location_raw`

### `src/lib/supabase-queries.ts`
- Add `fetchCompanyByDomain`, `upsertCompany`, `linkContactToCompany`
- Update `updateContactLocations` to accept `string[]` for company location

### `src/types/contact.ts`
- Add `Company` interface with `hq_locations: string[]`
- Update `Contact.company_location_raw` to `string[]`

### `src/components/ContactTable.tsx`
- Render `company_location_raw` as a comma-separated list or multiple badges

### Activity Log
Source URL = the specific page scraped. Snippet includes discovery path description and all extracted locations.

## Credit Cost
2 Firecrawl credits per new domain (1 map + 1 scrape). Cached domains = 0 credits.

