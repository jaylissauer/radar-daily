# AI Signal — Release Readiness

## Current state
- Ingestion pipeline working
- `npm run ingest:news` succeeds
- Diagnostics rebuild working
- Meta extraction working
- OpenAI degradation in diagnostics is due to blocked bodies, not pipeline failure
- Homepage and article detail are materially improved
- Mobile layout is in a much better state
- Brand pills accepted for now; official logo asset work intentionally deferred

---

## Release gates

### A. Core product UX
- [ ] Homepage loads cleanly on desktop and mobile
- [ ] No overlapping text, clipped pills, or broken card layouts
- [ ] Filters work reliably across all combinations
- [ ] Empty states are intentional and useful
- [ ] Loading states feel deliberate, not broken
- [ ] Error states are human-readable
- [ ] Article page is readable on mobile
- [ ] Article page handles missing body / missing summary / missing metadata gracefully
- [ ] Navigation between home, companies, products, article detail feels stable

### B. Content quality
- [ ] Feed source mix feels balanced
- [ ] HTML entities are decoded everywhere user-facing
- [ ] Long extracted bodies render as readable paragraphs
- [ ] Missing summaries do not create broken-looking cards
- [ ] Missing company/product descriptions do not leave obvious blanks
- [ ] Source labels/brand pills are visually consistent
- [ ] Published dates and freshness cues are sensible

### C. Ingestion reliability
- [ ] Repeated `npm run ingest:news` runs are stable
- [ ] Diagnostics output is understandable
- [ ] Failures from blocked sources do not break the user-facing app
- [ ] Meta extraction remains stable
- [ ] Source coverage is intentional, not accidental
- [ ] Duplicate or near-duplicate articles are controlled

### D. Launch safety
- [ ] Production env vars reviewed
- [ ] App builds successfully for production
- [ ] No obvious console/runtime crashes in main flows
- [ ] Metadata/title/description exist for public pages
- [ ] Basic SEO/social sharing metadata exists
- [ ] Supabase configuration reviewed for production
- [ ] Any admin/internal routes are not accidentally public

### E. Private beta readiness
- [ ] App is good enough for invited testers
- [ ] Critical bugs are gone
- [ ] Mobile experience is acceptable
- [ ] Content quality is credible
- [ ] Known limitations are documented

### F. Public launch readiness
- [ ] Private beta feedback incorporated
- [ ] Content coverage is broad enough
- [ ] Reliability is proven over repeated runs
- [ ] Product value is obvious on first visit
- [ ] Public-facing polish is consistently strong

---

## Priority order for next work

### P0 — Must fix before private beta
- [ ] Production build passes
- [ ] Main routes render cleanly with no runtime crashes
- [ ] Empty/error/loading states are intentional
- [ ] Article detail handles missing or partial data elegantly
- [ ] Feed and filters are stable on mobile
- [ ] Ingestion remains stable over repeated runs

### P1 — Strongly recommended before private beta
- [ ] Better fallback copy for missing descriptions/summaries
- [ ] Better source/date/byline presentation
- [ ] Duplicate-content control
- [ ] Better skeleton/loading polish
- [ ] Metadata/SEO/social cards

### P2 — Better before public launch
- [ ] Save/bookmark/user account flows
- [ ] Personalisation
- [ ] Real brand assets in `public/brands`
- [ ] Broader source coverage
- [ ] Analytics and usage tracking

---

## Working conclusion
As of now, AI Signal appears closer to:
- **strong internal alpha / private beta candidate**
and not yet:
- **public launch ready**

The fastest path forward is:
1. run production/build/readiness checks
2. fix any runtime/build blockers
3. tighten empty/error/loading states
4. do one more mobile QA pass
5. then decide whether to invite private beta users
