# O-BEST website architecture and operations

This guide describes the current implementation. It complements `README.md` (project-specific content and catalogue workflow), `BUILD-ROADMAP.md` (business and launch plan), and `OBEST_ENGINEERING_ROADMAP.md` (engineering sequence and constraints).

## System map

| Area | Source of truth | Runtime location | Owner / change boundary |
| --- | --- | --- | --- |
| Product records | Published Sanity `product` documents in the `production` dataset | `api/catalogue.js` and `api/product.js` query the public read API; `catalog-data.js` loads the browser catalogue | Product manager owns names, descriptions, images, and availability in Sanity. Code owns field normalization and public exposure. |
| Legacy catalogue | `products.js` | Not loaded by customer-facing pages | Retained for migration verification and regression fixtures. Do not treat it as the runtime catalogue. |
| Lucent research screens | `api/lucent-screen-research.json` | `api/lucent-screens.js` and product page handler | Research data only, distinct from shop-confirmed stock. Keep the held Note 3 Mini excluded from public endpoints. |
| Page presentation and interactions | Static HTML and `styles.css` | Browser | `app.js` owns shared navigation, catalogue rendering/filtering, product details, galleries, and inquiry form behavior. Keep the existing no-framework architecture unless approved. |
| Catalogue HTTP API | Sanity public read endpoint | `api/catalogue.js` (`GET /api/catalogue`) | Read-only, bounded, normalized public fields. No Sanity token belongs in browser code. |
| Inquiry processing | Server environment plus Resend | `api/request.js` (`POST /api/request`) | Server validates input and fails closed unless explicitly enabled. Secrets stay in Vercel settings. Keep `INQUIRY_ENABLED` unchanged without explicit owner authorization. |
| Hosting and routing | Vercel project configuration | `vercel.json` and Vercel dashboard | Deployment configuration and Production changes are owner-controlled. A branch push may create Preview; it is not permission to deploy Production. |
| CMS editor | Sanity project and schema | `sanity/`, `sanity.config.ts`, hosted Studio | Schema and project integration are code-owned; product content is managed in Studio. Never commit credentials. |

The product editor requires the core listing fields, generates a URL ID from the product name, checks slug uniqueness in Studio, caps it at the public route limit of 128 characters, defaults new availability to “Ask us to check,” and groups documents by category. Studio list previews identify each product by name, category, product type, and availability. Optional specifications and source links should be added only when confirmed.

## Request/data flows

- **Shop catalogue:** page loads `catalog-data.js` → same-origin `GET /api/catalogue` → published Sanity products are normalized → browser renders categories and products. Empty results remain empty. API failure displays an unavailable state; there is no `products.js` fallback.
- **Product page:** `/product/:id` rewrites to `api/product.js` for product-specific HTML metadata; browser code then loads the shared catalogue feed for interactive details. Only published Sanity products and explicitly public research records resolve.
- **Search discovery:** `/sitemap.xml` rewrites to `api/sitemap.js`, which combines stable public content URLs with normalized published Sanity products and public Lucent research routes. The held Note 3 Mini remains excluded. Product HTML includes escaped, factual Product JSON-LD without prices, ratings, or stock claims.
- **Inquiry:** browser submits JSON to `POST /api/request` → server validates method, content type, size, fields, honeypot, and configuration → Resend is called only when configured and enabled → success is returned only after provider acceptance. Vercel Firewall rate limiting is an additional control, not replaced by application validation.
- **Sanity Studio:** editors publish product documents to the existing project/dataset. The public website reads published content without a client-side token; edits do not need a site redeploy.

## Local development and quality checks

Requirements: Node.js 20 or newer and npm.

```powershell
npm ci
npm run check
npm test
```

`npm run check` performs syntax checks on the customer-facing and API JavaScript. `npm test` runs Node's built-in test runner over `tests/*.test.js` and Sanity schema tests. GitHub Actions runs both checks after dependency installation for pull requests and pushes to `mobile-parity-review`.

`app.js` remains a single page-aware browser script. It is 483 lines and currently shares rendering helpers between the catalogue and product-detail views; a file split was reviewed and deferred because it would add script/module boundaries without a demonstrated maintenance or behavior-safety benefit. Revisit if those responsibilities become independently testable or are changed frequently enough to justify the added boundaries.

For Vercel Functions, rewrites, headers, and Preview-like behavior, use the existing Vercel development workflow (`vercel dev`) with the correct locally configured environment. Opening HTML directly from disk cannot exercise API routes. Do not add real inquiry secrets to local files or commit them.

To run the local Sanity Studio, use `npm run studio`; to build it, use `npm run studio:build`. Studio build output is not the website output and must not become Vercel's website Output Directory.

## Change ownership and safe operations

- **Product manager / content owner:** publish approved product details and availability in Sanity; do not infer stock from research listings.
- **Website code maintainer:** owns rendering, normalization, HTTP handlers, tests, CI, routing, and documentation in this repository.
- **Project owner:** controls Vercel, Sanity membership, Resend, domains/DNS, environment variables, firewall settings, Production releases, and launch approval.
- Make code changes on the review branch and inspect the resulting protected Preview. A passing Preview or CI run is not Production authorization.
- Do not change DNS, `INQUIRY_ENABLED`, Production deployment settings, provider credentials, firewall settings, or Sanity permissions as part of routine code work without explicit approval.
- For an incident, record the affected URL, approximate start time, scope, and last known-good deployment; inspect Vercel deployment/function logs promptly. Prefer a known-good deployment rollback through the owner-controlled dashboard when appropriate. Do not improvise a DNS or environment-variable rollback.
- Keep inquiry recipient addresses, API keys, tokens, customer messages, and other private data out of source files, issues, logs, and committed documentation.

## Deployment boundary

The connected Vercel project builds Preview deployments from the review branch and has protected Production deployments. Verify the expected branch/commit and Ready status in Vercel, then use the authorized Preview URL for browser checks. Production deployment, domain/DNS changes, and enabling real inquiries are separate owner decisions. Current launch gates and account-specific operational details are tracked in `BUILD-ROADMAP.md` and must be rechecked in the owner dashboards because settings can change.
