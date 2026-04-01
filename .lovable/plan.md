

# Updated Relational Lookup Schema — Full Implementation Plan

## Database Schema

### Lookup Tables

**`confidence_levels`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `smallint` PK | 1=High, 2=Medium, 3=Low |
| `label` | `text` NOT NULL | Display name |
| `color_hex` | `text` | Badge color (e.g. `#10B981`) |

**`designation_types`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `smallint` PK | 1=Person Source, 2=Company Source, 3=Manual Override, 4=Pending |
| `label` | `text` NOT NULL | Display name |

**`log_event_types`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `smallint` PK | 1=Google Dorking, 2=Firecrawl Scrape, 3=Website Crawl, 4=Affinity Sync, 5=Manual Entry |
| `label` | `text` NOT NULL | Display name |
| `icon_name` | `text` | Icon key for UI (search, linkedin, globe, refresh, edit) |

### Core Tables

**`contacts`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `affinity_id` | `text` UNIQUE | Dedup key for CRM imports |
| `name` | `text` NOT NULL | |
| `company_name` | `text` NOT NULL | |
| `email_address` | `text` NOT NULL | |
| `person_location_raw` | `text` default `''` | Scraped person location |
| `company_location_raw` | `text` default `''` | Scraped company location |
| `confidence_id` | `smallint` FK → `confidence_levels(id)`, default `3` | |
| `designation_id` | `smallint` FK → `designation_types(id)`, default `4` | |
| `manual_location` | `text` default `''` | User-entered city, country |
| `manual_source_note` | `text` default `''` | Free-text source |
| `is_approved` | `boolean` default `false` | |
| `metadata` | `jsonb` default `'{}'` | Raw API response storage |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | Auto-updated via trigger |

**`activity_logs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `contact_id` | `uuid` FK → `contacts(id)` ON DELETE CASCADE | |
| `event_type_id` | `smallint` FK → `log_event_types(id)` | |
| `query_used` | `text` default `''` | |
| `source_url` | `text` default `''` | |
| `result_snippet` | `text` default `''` | |
| `created_at` | `timestamptz` default `now()` | |

### Automation
- `update_updated_at_column()` trigger on `contacts` BEFORE UPDATE

### RLS
- All 5 tables: RLS enabled, permissive anon policies for now (select/insert/update/delete)
- To be locked down when authentication is added

### Seed Data
- 3 confidence levels, 4 designation types, 5 log event types
- 3 mock contacts (Claudia, John, Sarah) with FK references
- 6 activity log entries linked to contacts via UUID and event_type_id

---

## Frontend Refactor

### Step 1: Migration
Run the full SQL block (tables, trigger, RLS, seed data) via migration tool.

### Step 2: Update TypeScript Types
Replace `src/types/contact.ts` — use numeric IDs (`confidenceId`, `designationId`, `eventTypeId`) instead of string unions. Add interfaces for lookup types.

### Step 3: Data Access Layer
Create `src/lib/supabase-queries.ts`:
- `fetchLookups()` — cache all 3 lookup tables on mount
- `fetchContacts()` — join with lookups for display labels
- `updateDesignation()`, `toggleApproval()`, `insertActivityLog()`, `upsertFromCSV()`

### Step 4: Refactor Components
- **Index.tsx**: Replace mock state with Supabase queries; load lookups once
- **ContactTable.tsx**: Dropdown options from `designation_types`; approval gated on `designation_id !== 4`; resolve location text from designation
- **ActivityLogModal.tsx**: Icons from `log_event_types.icon_name`; labels from lookup
- **ConfidenceBadge.tsx**: Color from `confidence_levels.color_hex`
- **SearchBar.tsx**: Filters use lookup IDs
- **CSV export**: Computed `final_location` based on designation logic
- **CSV import**: Upsert on `affinity_id`

### Step 5: Cleanup
Delete `src/data/mockData.ts`.

