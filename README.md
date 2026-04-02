# Andalusian Scout — Contact Location OSINT Platform

An institutional OSINT platform built for **Andalusian Credit Partners** to discover, verify, and manage physical locations for business contacts using automated web intelligence.

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript + Tailwind)        │
│  ├── Pages: Auth, Index (contact workspace)      │
│  ├── Hooks: useContacts, useDiscovery, useCSVImport│
│  └── Supabase Client (auth, queries)             │
├──────────────────────────────────────────────────┤
│  Supabase Edge Functions (Deno)                  │
│  ├── firecrawl-search — Google/web search proxy  │
│  ├── firecrawl-scrape — Page scraping proxy      │
│  ├── firecrawl-map   — Site map proxy            │
│  └── extract-locations — LLM location extraction │
├──────────────────────────────────────────────────┤
│  Supabase (Postgres + Auth + RLS)                │
│  ├── contacts, companies, activity_logs          │
│  └── confidence_levels, designation_types, etc.  │
└──────────────────────────────────────────────────┘
```

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project with the schema applied

### Install & Run
```bash
npm install
npm run dev
```

### Environment Variables
The `.env` file is auto-populated with:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

### Edge Function Secrets (Supabase Dashboard → Settings → Functions)
- `FIRECRAWL_API_KEY` — API key for [Firecrawl](https://firecrawl.dev)
- `LOVABLE_API_KEY` — API key for the AI gateway (LLM location extraction)

## Discovery Pipeline

The OSINT discovery flow for each contact:

1. **Person Location**: Scrapes Google SERP for `site:linkedin.com "Name" "Company"`, extracts location from the `YrbPuc` CSS class in LinkedIn snippets
2. **Company Location**: Extracts domain from email → maps site pages → scrapes contact/about pages → uses LLM to extract office addresses
3. **Confidence Scoring**: HIGH (person + company locations match), MEDIUM (both found but don't match), LOW (missing data)
4. **Auto-Designation**: If person/company locations match at city level, auto-designates as "Company" location

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Designation** | Human-in-the-loop selection: Person Location, Company Location, Manual, or Pending |
| **Confidence** | HIGH / MEDIUM / LOW based on location data availability and match quality |
| **Approval** | Final sign-off that a contact's location is verified (requires designation first) |
| **Company Cache** | Company locations are cached for 6 months to avoid redundant scraping |

## Database Tables

| Table | Purpose |
|-------|---------|
| `contacts` | Core contact records with location data |
| `companies` | Cached company HQ locations by domain |
| `activity_logs` | Audit trail of all discovery actions |
| `confidence_levels` | Lookup: HIGH(1), MEDIUM(2), LOW(3) |
| `designation_types` | Lookup: Person(1), Company(2), Manual(3), Pending(4) |
| `log_event_types` | Lookup: OSINT Discovery(1), Manual Entry(5) |

## Testing

```bash
npm run test
```

Unit tests cover: domain extraction, location parsing, and confidence scoring logic.
