

# Affinity CRM API Integration

## Overview
Build an edge function that proxies requests to the Affinity v2 API, and a frontend "Import from Affinity" flow that fetches list entries, lets the user filter them, and upserts selected contacts into the existing `contacts` table.

## Architecture

```text
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│ Edge Function         │────▶│ Affinity v2 API │
│  React UI   │     │ affinity-sync         │     │ api.affinity.co │
│             │◀────│ (JWT + API key auth)  │◀────│                 │
└─────────────┘     └──────────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Supabase DB     │
                    │ contacts table  │
                    └─────────────────┘
```

## Step 1: Store Affinity API Key as a Supabase secret

- Use the secrets tool to add `AFFINITY_API_KEY` as a runtime secret
- The user will paste their Affinity v2 API key

## Step 2: Create `affinity-sync` edge function

**File:** `supabase/functions/affinity-sync/index.ts`

Accepts POST with JSON body:
```json
{
  "listId": "123",
  "savedViewId": "456",  // optional
  "userId": "789"        // optional, for filtering
}
```

Logic:
- Validate JWT (same pattern as existing functions)
- Read `AFFINITY_API_KEY` from env
- Paginate through `GET https://api.affinity.co/v2/lists/{listId}/list-entries` (or saved-view variant) with `limit=100`, `cursor`, `fieldTypes=enriched,global,list`
- Handle 429 rate limits with retry + backoff
- Return all entries as JSON to the client

## Step 3: Create `useAffinityImport` hook

**File:** `src/hooks/useAffinityImport.ts`

- Calls the edge function via `supabase.functions.invoke('affinity-sync', ...)`
- Stores fetched entries in state
- Provides client-side filters:
  - Filter by `creatorId` matching a user ID
  - Filter for missing location (field `affinity-data-location` absent/null/empty)
- Provides `importSelected()` that maps Affinity entries to the existing `bulkUpsertContacts` format and upserts them

## Step 4: Create `AffinityImportDialog` component

**File:** `src/components/AffinityImportDialog.tsx`

A dialog (using existing `Dialog` component) with:
- **Input: List ID** (required)
- **Input: Saved View ID** (optional)
- **Input: User ID** (optional, for assignment filter)
- **Fetch button** — calls the hook to load entries
- **Toggle filters:** "Assigned to user" and "Missing location"
- **Results table** showing Name, Email, Location, Owner with checkboxes
- **Import button** — upserts selected entries into the contacts table

## Step 5: Wire into SearchBar

Add "Import from Affinity" as a new option in the existing Import dropdown menu in `SearchBar.tsx`, alongside the existing "Upload Source CSV" and "Add Contact Manually" options.

Update `Index.tsx` to manage the dialog open state and pass the `invalidateContacts` callback.

## Step 6: Map Affinity data to contacts schema

Mapping logic in the hook:
| Affinity field | Contacts column |
|---|---|
| `entity.id` | `affinity_id` |
| `entity.fields[name]` or entity name | `name` |
| `entity.fields[email]` | `email_address` |
| `entity.fields[company]` | `company_name` |
| `entity.fields[affinity-data-location].value.data` | `person_location_raw` |
| `creatorId` | stored in `metadata` |

Confidence set to `LOW` (3) for new imports; location discovery runs separately.

## Files to create/edit

1. **Create** `supabase/functions/affinity-sync/index.ts` — edge function proxy
2. **Create** `src/hooks/useAffinityImport.ts` — data fetching + filtering hook
3. **Create** `src/components/AffinityImportDialog.tsx` — import dialog UI
4. **Edit** `src/components/SearchBar.tsx` — add "Import from Affinity" menu item
5. **Edit** `src/pages/Index.tsx` — add dialog state and render `AffinityImportDialog`

## Security considerations

- Affinity API key stored server-side only (edge function secret), never exposed to client
- JWT validation on the edge function (consistent with existing functions)
- Input validation on listId/viewId parameters

