

# Bug Fix: Map response links not being accessed

## Root Cause
The Firecrawl `/v1/map` API returns `{ success: true, links: [...] }` at the top level. The edge function passes this through directly. But the code in `Index.tsx` accesses `mapResult.data?.links` — the `.data` nesting doesn't exist. So `candidateUrls` is always empty, and it always falls back to the homepage.

The edge function logs confirm the map succeeded for `old.st`, but the URLs (`/contact`, `/about-us`, `/careers`) were silently discarded.

## Fix
In `src/pages/Index.tsx`, change all references from `mapResult.data?.links` to `mapResult.links`:

- **Line 260**: `mapResult.success && mapResult.links?.length > 0`
- **Line 261**: `const allLinks: string[] = mapResult.links;`
- **Line 302**: `const mappedCount = mapResult.links?.length || 0;`

Also add a fallback check for `mapResult.data?.links` in case the response structure varies:

```
const allLinks: string[] = mapResult.links || mapResult.data?.links || [];
```

This is a one-line-class bug — three lines to fix, no new files needed.

