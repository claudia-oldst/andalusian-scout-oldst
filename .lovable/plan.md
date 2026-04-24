# Fix Person Location Extraction (Don Becker → "Short Hills")

## Problem

For Don Becker, the system extracted "Iowa" instead of "Short Hills" even though one of his LinkedIn snippets clearly contained `Location: Short Hills ·`.

Two root causes:

1. **First-match-wins**: `useDiscovery.ts` locks in the first candidate from the first result (e.g. "University of Iowa, BBA" from an earlier snippet) and never reconsiders later, better snippets.
2. **Loose `Location:` regex**: The current `Location:\s*([^·\n]+)` works but is greedy, leaves trailing whitespace, and Priority 2 has no exclusion list, so strings like `University of Iowa, BBA` slip through as "locations".

## Changes

### 1. `src/lib/extract-location.ts` — tighter regex + exclusions

**Replace Priority 1** in `extractLocationFromDescription` with the hybrid lookbehind/lookahead:

```ts
/(?<=Location:\s).*?(?=\s·|\n|$)/
```

- Lazy `.*?` stops at first ` ·` (no over-capture).
- Lookbehind keeps match clean (no capture group bookkeeping).
- `\s·|\n|$` alternatives cover bullet, newline, and end-of-string cases.

**Tighten Priority 2** (leading geo segment) by adding an exclusion regex for non-location strings:

```
/\b(University|College|School|Institute|MBA|BBA|BSc|MSc|PhD|LLC|Inc|Ltd|GmbH|Corp|VP|Director|Manager|Analyst|Engineer|Founder|CEO|CTO|CFO)\b/i
```

If a candidate matches, skip it.

### 2. `src/hooks/useDiscovery.ts` — score-and-rank candidates

Replace first-match-wins with collect-all-then-rank. Scoring rubric for each candidate:

| Signal | Score |
|---|---|
| 3-part "City, Region, Country" | 100 |
| 2-part "City, Country" | 70 |
| `Location:` label match (single token allowed) | 60 |
| HTML `.YrbPuc` span | 50 |
| LinkedIn URL subdomain (`uk.linkedin.com` etc.) | 20 |
| Contains excluded keyword (University, LLC, etc.) | 0 (rejected upstream) |

After looping all results, pick the highest-scoring candidate as `personLoc` and record its method. Keep the full ranked list for the activity log.

### 3. `src/components/ActivityLogModal.tsx` — show ranking in log

In the Person Discovery snippet renderer, when multiple candidates exist, render them as a small ranked list with score + method badge under the chosen location, so future debugging is one click away.

## Expected outcome for Don Becker

The snippet `Experience: Minnesota Vikings Football, LLC · Location: Short Hills · 215 connections on LinkedIn.` produces:

- Priority 1 hybrid regex → `Short Hills` (score 60)
- Leading-segment scan on the same description → `Short Hills, New Jersey, United States` (score 100) ← **winner**
- Earlier "University of Iowa, BBA" candidate → rejected by exclusion list

Final stored location: **Short Hills, New Jersey, United States**.

## Files

- `src/lib/extract-location.ts`
- `src/hooks/useDiscovery.ts`
- `src/components/ActivityLogModal.tsx`

## Out of scope

- Company location pipeline (separate bug, already discussed for Dansa).
- LLM re-ranking — keeping this purely deterministic.
