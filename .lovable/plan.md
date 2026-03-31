

# Andalusian Credit Partners — Location Scout OSINT Platform

## Visual Identity
- **Header**: Sticky glassmorphic bar with `#194041` background, "Andalusian Credit Partners" branding
- **Workspace**: `#C8CFD0` light gray background behind all cards
- **Accent**: `#698CE4` periwinkle for primary buttons, focus rings, active states
- **Secondary**: `#6B8A8C` / `#84ACAC` for borders, table headers, muted text
- **Status**: `#446C8B` steel blue for verified/approved badges
- **Typography**: Clean sans-serif, wide letter-spacing on uppercase headers for institutional feel

## Layout & Core Components

### 1. Sticky Header
- Glassmorphic top bar with logo and two split-button groups:
  - **"Find New Contacts"** — primary action + dropdown for "Upload Source CSV"
  - **"Map Found Contacts"** — primary action + dropdown for "Export Verified CSV"

### 2. Search & Filter Bar
- Large centered search input with `#698CE4` focus ring
- Real-time filtering by name, company, email
- "Advanced Filters" button (expandable panel)

### 3. Institutional Data Grid
- Columns: Name, Company, Email, Person Location, Company Location, Confidence Badge (High/Med/Low), HIL Designation dropdown, Approval checkbox
- "Approve All" header checkbox that only affects visible/filtered rows
- Confidence logic: matching locations = High, differing = Medium/Low
- HIL dropdown options: Person Location, Company Location, Manual Entry
- Row click opens Activity Log modal

### 4. Activity Log Modal
- Vertical timeline showing the "Discovery Path"
- Individual event cards for Google Dorking queries and Firecrawl crawl results
- Shows exact search queries used and links to source URLs
- In-modal footer with Approve button and HIL designation dropdown

### 5. CSV Engine
- **Import**: PapaParse-based CSV upload for new contacts
- **Export**: Download approved records as CSV with Affinity IDs

## Mock Data (Initial State)
Three pre-populated contacts with varying confidence levels and detailed mock activity logs:
1. Claudia @ Old St Labs — High confidence
2. John Doe @ TechFlow — Medium confidence
3. Sarah Chen @ Nexus Venture — Low confidence

## Backend (Supabase)
- `contacts` table: name, company, email, person_location, company_location, confidence, hil_designation, approved, affinity_id
- `activity_logs` table: contact_id, event_type, query_used, source_url, result_summary, timestamp
- Row-level security policies

## Integration Placeholders
- **Affinity API**: Edge function stubs for fetching people records and pushing approved locations
- **Firecrawl**: Edge function stubs for LinkedIn profile search + company domain crawl workflow
- Both wired up with placeholder UI buttons, ready for real API keys

