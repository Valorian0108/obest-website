# O-BEST Engineering Roadmap & AI Development Contract

## Purpose

This document is the implementation source of truth for the O-BEST website.

O-BEST is a real production project, not an experimental AI coding exercise. AI coding assistants may be used to implement work, diagnose problems, and suggest improvements, but they must operate within this roadmap and must not silently replace the agreed architecture.

The primary goals are:

1. Make O-BEST maintainable by a human who is not yet a senior web developer.
2. Make adding and managing products simple and reliable.
3. Establish one authoritative product data source.
4. Reduce duplicated logic and architectural debt.
5. Make AI-assisted development safer and more predictable.
6. Preserve the existing visual identity while making the UI feel more intentional and human.
7. Prepare the website for SEO, traffic growth, and eventual advertising.

---

# 1. GOVERNING RULES FOR AI CODING ASSISTANTS

These rules apply to OpenCode, Claude Code, Codex, Cursor, or any other AI coding assistant working on this repository.

## Rule 1 — This roadmap is authoritative

Treat this document as the current implementation roadmap.

Do NOT reinterpret the roadmap as a general critique, optional recommendation, or brainstorming document.

When a phase is marked `IN PROGRESS`, the objective is to implement that phase unless a blocking technical issue is discovered.

## Rule 2 — Suggestions are allowed; silent scope changes are not

An AI may identify:

- security problems
- bugs
- architectural risks
- better implementation approaches
- missing dependencies
- unnecessary code

However, it must not silently change the project's architecture or skip a roadmap phase because it prefers another approach.

If an alternative would materially change the architecture, explain it and ask for approval before making that change.

## Rule 3 — Preserve working functionality

Do not rewrite working systems merely because another framework, library, pattern, or architecture is considered more modern.

In particular:

- Do not migrate to React without approval.
- Do not migrate to Next.js without approval.
- Do not replace Sanity without approval.
- Do not replace Vercel without approval.
- Do not introduce a new database when an existing service already solves the requirement.
- Do not add dependencies without explaining why they are necessary.

## Rule 4 — Smallest safe change

Prefer the smallest change that correctly solves the current problem.

Avoid broad rewrites.

## Rule 5 — Diagnose before fixing

When something breaks:

1. Reproduce or inspect the failure.
2. Identify the actual cause.
3. Explain the cause briefly.
4. Make the smallest safe fix.
5. Run the relevant tests.
6. Report what changed.

Do not rewrite unrelated files simply because they are nearby.

## Rule 6 — Tests are part of implementation

A change is not considered complete until relevant tests pass.

Existing tests must not be deleted merely to make a change pass.

If a test becomes obsolete because the intended behavior genuinely changed, explain why before changing it.

## Rule 7 — Keep documentation synchronized

If implementation changes architecture, data flow, infrastructure, or developer workflow, update the relevant documentation.

Documentation must describe the system that actually exists.

## Rule 8 — Secrets must remain server-side

Never expose:

- API keys
- Sanity private credentials
- Resend credentials
- deployment secrets
- tokens

in client-side JavaScript, HTML, committed source, or documentation.

---

# 2. CURRENT PROJECT STATUS

The project currently has:

- Static HTML/CSS/JavaScript frontend
- Vercel hosting/serverless functions
- Sanity CMS integration
- Resend email integration
- Product catalogue
- Product detail pages
- Request/contact flow
- SEO foundations
- Security headers
- Input validation
- Spam protection
- Rate limiting
- Automated tests

Current test baseline:

**53 tests passing.**

This baseline should be preserved while the architecture is improved.

---

# 3. IMPLEMENTATION ORDER

The phases below are intentionally ordered.

Do not jump ahead simply because a later phase is more visually interesting.

## PHASE 1 — STABILIZE THE FOUNDATION

### Status
`COMPLETE`

### Objective

Make the existing architecture predictable and establish one authoritative product source.

### Required work

1. Make Sanity the authoritative production product catalogue.
2. Stop relying on manually maintained `products.js` data at runtime.
3. Preserve an emergency/generated catalogue snapshot only if useful for recovery.
4. Consolidate product fields and availability logic.
5. Remove duplicated product-state logic where practical.
6. Confirm all catalogue, product-detail, search, filter, and request flows still work.
7. Preserve the current test baseline.
8. Document the resulting architecture.

### Definition of done

A product manager should be able to add or edit a product in Sanity without editing JavaScript or redeploying the website manually.

---

# PHASE 2 — MAKE THE PROJECT AI-MAINTAINABLE

### Status
`IN PROGRESS`

### Objective

Make future AI-assisted changes safer.

### Required work

1. Split oversized frontend responsibilities where useful.
2. Add/strengthen automated CI checks.
3. Document project architecture.
4. Document production operations.
5. Document AI development rules.
6. Establish clear ownership for product data, UI logic, API logic, and infrastructure.
7. Ensure lint/test/build checks can be run consistently.

### Definition of done

An AI coding assistant can inspect the repository and understand:

- where data comes from
- where APIs live
- where frontend logic lives
- where secrets live
- how deployment works
- how tests are run
- what architecture must not be changed casually

---

# PHASE 3 — PRODUCT MANAGEMENT WORKFLOW

### Status
`IN PROGRESS`

### Objective

Make product management simple enough that a non-developer can maintain the catalogue.

### Target workflow

Sanity Studio
→ Create Product
→ Upload Image
→ Enter Product Information
→ Publish
→ Website updates

### Required work

1. Confirm the Sanity product schema.
2. Improve the product-entry experience if necessary.
3. Ensure image handling is reliable.
4. Ensure slugs are unique.
5. Ensure product validation is clear.
6. Ensure unpublished products do not accidentally appear publicly.
7. Ensure product changes propagate correctly.
8. Document the product publishing workflow.

### Progress (4 October 2026)

- Audited the existing schema and Studio layout. Required listing fields, category/type validation, default `Ask us to check` availability, category grouping, and image alt-text support already exist.
- Improved Studio list previews to show product name, category, product type, and availability.
- Increased the Studio slug input limit to 128 characters to match the public route and added a uniqueness check against published and draft Sanity products.
- Added regression tests for the Studio preview and slug safeguards. `npm run check` and all 56 tests pass.
- The Studio schema deployed successfully to `https://obest-catalogue.sanity.studio/`; the owner confirmed existing slugs are accepted unchanged and duplicate slugs are flagged. No product documents were changed or published for this verification.
- Remaining: owner-facing review of create/edit/publish workflow, image handling, unpublished-product exclusion, and change propagation. The local Studio build succeeded. Do not publish test content.

### Definition of done

Adding a normal product requires no code changes.

---

# PHASE 4 — HUMANIZE THE UI

### Status
`AFTER PHASE 3`

### Objective

Preserve the O-BEST visual identity while reducing the generic "AI-generated" feeling.

### Important constraint

Do NOT redesign the entire website from scratch.

The existing visual language should be treated as valuable.

The goal is:

**less generic, not less polished.**

### Design direction

Consider:

- stronger editorial hierarchy
- intentional asymmetry
- distinctive product presentation
- less repetitive card treatment
- more deliberate typography
- fewer generic UI-kit patterns
- stronger brand-specific details
- memorable micro-interactions
- more natural copy
- better use of product photography
- controlled visual irregularity

### Definition of done

The website should feel like a distinctive brand rather than a generic modern template.

---

# PHASE 5 — SEO AND ORGANIC DISCOVERY

### Status
`AFTER PHASE 4`

### Objective

Increase the number of useful pages search engines can discover.

### Required work

1. Generate product URLs in the sitemap.
2. Ensure canonical URLs are correct.
3. Add/verify product structured data where appropriate.
4. Improve product metadata.
5. Verify Open Graph and social sharing.
6. Improve internal linking.
7. Build useful evergreen guides around real customer questions.
8. Verify indexing readiness.

### Definition of done

New published products can become discoverable through the site's sitemap and internal links without manually editing sitemap files.

---

# PHASE 6 — ADVERTISING AND MONETIZATION

### Status
`LATER`

### Objective

Introduce advertising only after the website has sufficient useful content, usability, and traffic potential.

### Required considerations

- Ad network eligibility
- Privacy requirements
- Consent requirements where applicable
- Mobile UX
- Page speed
- Ad placement
- Content quality
- SEO
- Revenue versus user experience

### Important principle

Ads are a monetization layer.

They are not the primary reason the website exists.

The site should first be useful to visitors.

---

# 4. WHAT MUST NOT HAPPEN WITHOUT APPROVAL

An AI coding assistant must ask before:

- changing frameworks
- replacing Sanity
- replacing Vercel
- replacing Resend
- introducing a new database
- introducing authentication
- adding a major dependency
- changing the product data model substantially
- rewriting the frontend architecture
- deleting a major fallback system
- changing deployment architecture
- changing the business workflow
- introducing payments
- introducing customer accounts
- making a large visual redesign

---

# 5. HOW TO HANDLE AI RECOMMENDATIONS

AI coding assistants may discover a better approach.

That is useful.

But use this decision process:

### If the recommendation is a small implementation improvement

Implement it if it does not conflict with this roadmap.

### If the recommendation changes architecture

STOP and present:

1. Current approach
2. Proposed approach
3. Why it is better
4. Risks
5. Migration cost
6. Effect on this roadmap

Then wait for approval.

### If the recommendation is unrelated to the current phase

Do not implement it now.

Add it to a future improvements list instead.

---

# 6. DEFINITION OF "DONE"

A phase is not complete merely because code was written.

A phase is complete when:

- implementation is working
- relevant tests pass
- no known critical regression exists
- documentation reflects reality
- the requested objective is achieved
- the next phase can begin safely

---

# 7. CURRENT PRIORITY

The immediate priority is:

## PHASE 2 — MAKE THE PROJECT AI-MAINTAINABLE

### Phase 1 completion (4 October 2026)

- Sanity is the only runtime shop-product source across homepage, catalogue, and product pages; `products.js` is retained only for migration verification and tests.
- Empty/unavailable catalogue states, long slugs, and the held Note 3 Mini exclusions are implemented and covered by automated tests.
- All 265 published Sanity products passed normalization with unique IDs; the longest slug is 114 characters.
- Owner reports the review-branch Preview checks passed for the catalogue and product experience. Production remains untouched.

### Phase 2 progress

- Added `OBEST-ARCHITECTURE.md` describing system boundaries, data flows, operational ownership, local checks, and deployment safety rules.
- Added `npm run check` and GitHub Actions CI for Node 20 syntax checks and the existing automated suite on pull requests and review-branch pushes.
- GitHub Actions passed for commit `45f68b0` on `mobile-parity-review`; the owner confirmed its CI and Preview checks passed.
- Reviewed `app.js` (483 lines). Keep it as one page-aware script for now: the catalogue and product-detail views share rendering helpers, and splitting them would add boundaries without a demonstrated safety benefit. Removed one obsolete catalogue-batch comment that no longer described the Sanity-authoritative runtime.
- Reviewed `OBEST-ARCHITECTURE.md`, `README.md`, and `BUILD-ROADMAP.md` against the actual routes, scripts, and protection constraints. The engineering roadmap remains the AI change-control source; the older build roadmap tracks separate business/launch phases.
- Phase 2 complete: project structure, data/API locations, secrets boundaries, deployment constraints, checks, ownership, and AI change-control rules are documented; the repeatable local checks and CI are passing. No framework or hosting changes were made.

Phase 3 may begin next: review and improve the Sanity product-entry workflow without broadening the public catalogue beyond owner-approved intent. Do not begin the UI redesign, SEO expansion, or advertising work ahead of their roadmap phases.

---

# 8. PROJECT PHILOSOPHY

O-BEST should be:

- simple enough to maintain
- professional enough to trust
- flexible enough to grow
- fast enough for mobile users
- secure enough for production
- understandable enough for its owner
- structured enough for AI-assisted development
- distinctive enough to feel human

The goal is not to use the most fashionable technology.

The goal is to build the simplest reliable system that solves the business problem well.
