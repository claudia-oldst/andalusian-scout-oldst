
# Company Location Discovery: Domain Map → Scrape → Extract Pipeline

## Status: IMPLEMENTED

## Architecture

### Person Location
1. Google SERP scrape via `site:linkedin.com "Name" "Company"` query
2. Extract location from `YrbPuc` HTML element
3. Source URL = Google search URL (openable by HIL)

### Company Location  
1. Parse domain from email (skip free providers like Gmail)
2. Cache-first: check `companies` table
3. If miss/stale (>6 months): Map domain → filter high-value pages → scrape top 2 → extract all locations
4. Upsert into `companies` cache, link contact via `company_id`
5. `company_location_raw` is `text[]` (supports multiple locations)

## Database
- `companies` table: domain, hq_locations (text[]), website_url, last_scraped_at
- `contacts.company_id` FK to companies
- `contacts.company_location_raw` changed from text to text[]

## Credit Cost
- Person: 1 credit (Google SERP scrape)
- Company: 2 credits per new domain (1 map + 1 scrape), 0 for cached
