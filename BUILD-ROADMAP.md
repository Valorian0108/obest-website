# O-BEST website: product and launch roadmap

This roadmap turns the current prototype into a maintainable shop website in reviewable stages. Complete each phase's gate before expanding scope. A phase marked **Planned** is not implemented yet.

## Product direction

Build a trustworthy catalogue and customer-support site first. Treat educational guides as a possible second content stream. Add repair bookings or advertising only after the shop confirms the service and operating model. Do not add features purely to make the site look bigger or to chase ad approval.

**Working assumptions:** the shop is not taking online payments; prices and stock are confirmed directly with the shop; inquiry submissions should stay on the website and go to the shop without opening WhatsApp. The owner has provided a private receiving email, approved Resend, and prefers Vercel. “Ads” below means a future ad network such as Google AdSense.

## Current state

- **Prototype built:** static, dependency-free pages for Home, category-first Catalogue, product details, Request an item, About & Visit, Privacy, and a Guides hub with a locally drafted charging-accessory checklist awaiting owner review.
- **Catalogue:** `products.js` contains 130 records (20 batch 1 and 110 batch 2), all currently visible. The owner explicitly approved the current visible catalogue/listings on 2 October 2026, including the 102 records added after the earlier 20 + 8 review. Product images are local assets. Taller photos now have more display space so packaging details are easier to read.
- **Homepage photography:** the hero rotates through selected owner-supplied accessory/product photos, centered without an added card or labels and spaced above the yellow band. The owner approved the current website details; include the final composition in visual sign-off before launch.
- **Illustrations:** original local SVG object illustrations are used in the homepage category strip and category cards. On 2 October 2026, the owner approved the current visible illustrations, including the updated orbit/star and charger-and-cable artwork.
- **Sourcing timing:** the owner confirmed that items not available in-store can be sourced within 24 hours after a customer request. Copy describes sourcing time only and does not promise delivery.
- **Product policy:** prices remain blank, availability says “Ask us to check,” and unsupported claims should be removed rather than guessed.
- **Contact configuration:** the confirmed public phone number is displayed as a phone link; the request form does not open WhatsApp. Item requests use the on-site form and `/api/request`; the owner confirmed receipt of the labeled protected-Preview email test on 2 October 2026. Inquiry email remains disabled until the remaining readiness checks and owner launch approval are complete.
- **Inquiry recipient:** the owner has provided a private Gmail destination for inquiry notifications. Keep the exact address out of public site code and repository documentation; configure it only in the server-side deployment settings.
- **Not production-ready:** the Vercel project exists and is linked; an initial deployment was automatically assigned to Production and subsequent builds are Preview deployments. Deployment protection blocks anonymous access. The `inquiries.obestlink.com` sending domain is verified in Resend and the four inquiry environment variable names are configured for Preview (values are hidden); `INQUIRY_ENABLED=false` keeps delivery disabled. The Vercel Firewall rule `Limit item inquiry submissions` is published for `POST /api/request` at 5 requests per IP per 60 seconds, including Production. Real inbox receipt and some launch checks remain unverified; do not treat the Production deployment or published firewall rule as launch approval.
- **No dedicated inquiry database is needed for the initial version.** Email and service providers may still retain messages or operational logs; confirm their terms and settings before use.

## Step-by-step build plan

### Phase 1: Finish the shop catalogue

**Work**
- The owner approved the current visible listing set (all 130 products) on 2 October 2026. Keep each listing's claims accurate and update availability only from current shop confirmation.
- Confirm what product categories the shop actually carries. Hide empty categories from both Home and Catalogue until there is real inventory or useful content for them.
- Set availability only from current shop confirmation; do not publish prices until the owner chooses to do so.
- Keep exact product claims tied to confirmed details. Use accurate, standalone product photos and useful alt text.

**Done when:** the owner-approved visible listing set has no broken images, duplicate IDs, or invented stock, compatibility, warranty, or delivery claims.

**Status:** The owner approved the current 130 visible product listings on 2 October 2026, resolving the discrepancy with the earlier 20 + 8 approval record. Continue routine accuracy checks for stock, specifications, images, and claims; no product-approval gate remains for this visible set.

### Phase 2: Define the real business offer and trust information

**Work**
- Confirm the shop name/branding, service area, opening hours, receiving email, WhatsApp contact, and any address or social links the owner wants public.
- Decide what the site promises: product discovery and availability enquiries, sourcing requests, repair services, or some combination. Publish only services the shop actually provides.
- Add concise About and Contact information using confirmed details. Keep missing details unpublished, not filled with placeholders or assumptions.

**Done when:** a visitor can tell who operates the site, what the shop offers, and how to reach it without relying on unconfirmed claims.

**Status:** Owner confirmed the public shop address (No. 1 Fadare Street, Iju-Ishaga, Ifako-Ijaiye, Lagos), Monday–Saturday hours (9:00 am–8:00 pm), public phone number, flyer-listed Instagram/TikTok handles, and that an engineer is on site. On 1 October 2026, the owner reconfirmed approval of the current site details and approved publication of the supplier reference photos. The public number is displayed as a phone link, without opening WhatsApp chat. Delivery is intentionally omitted and the limited engineering service is described without repair booking/guarantees. Local visual/QA checks are not deployment approval.

### Phase 3: Replace the WhatsApp hand-off with a secure background inquiry

**Selected initial architecture:** keep the catalogue static on Vercel; use a Vercel Function at an API route; validate requests on the server and apply rate limiting with Vercel Firewall; send accepted enquiries to the shop's Gmail with Resend; do not add a submissions database initially. Resend is owner-approved; the `inquiries.obestlink.com` sender is verified, Preview variable names are configured, and the Firewall limit is published. The owner confirmed receipt of a labeled protected-Preview test on 2 October 2026. Keep delivery disabled until remaining readiness checks and owner launch approval are complete.

**Work**
1. Use Vercel Functions for the endpoint and Resend for transactional email. Keep both accounts owner-controlled. Check current pricing, privacy terms, retention/log settings, and account ownership before production use.
2. Change the form to submit `item`, an optional device model/question, and one reply method (for example, phone or email). Collect no unnecessary personal data and no payment or sensitive information.
3. Keep provider/API credentials in server-side environment secrets. Never put them in HTML, `app.js`, browser storage, or a public repository.
4. Require an explicit server-side `INQUIRY_ENABLED=true` flag before any email can be sent; leave it disabled until the shop is ready to accept real enquiries. Never enable it in a production deployment before rate limiting and privacy readiness are confirmed.
5. Validate lengths and formats server-side; reject malformed input; protect against email-header injection; use the form's honeypot. Avoid logging full message bodies or contact details. The browser reuses an idempotency key on retry and the endpoint passes it to Resend to reduce duplicate sends. Do not rely on in-memory per-function counters for rate limiting.
6. Send the enquiry to the shop email. Do not persist a second copy in a database unless a real operational need is identified later.
7. Return a success response only after the provider has accepted the message. Show an on-page receipt confirmation; explain that receipt does not mean the shop has read or answered it. Show a useful error and allow retry if submission fails. Do not redirect to WhatsApp.
8. Keep the short interim privacy notice beside the form; before public launch, add a Privacy page that names the actual services, data collected, purpose, recipients, retention/deletion approach, and a contact for privacy requests.
9. Check the privacy and consumer-protection obligations that apply to the business and its intended customers before launch; get qualified local advice for legal questions rather than treating template wording as legal approval.

**Data reality:** no app database does not mean “no storage.” The email provider processes the submission and Gmail stores the delivered email; providers can also retain limited logs. State this accurately and select retention settings before launch.

**Done when:** tested submissions stay on the website; success appears only on provider acceptance; failures are visible; spam controls work; the shop receives the email; secrets are absent from client files; and privacy wording matches actual provider behavior. The required Vercel Firewall rate-limit configuration is tracked in Phase 4 and must be complete before real submissions are enabled.

**Status:** Form markup, browser submission, Vercel Function, honeypot, automated endpoint tests, and a plain-language Privacy page are implemented. Resend sending-domain verification, Preview inquiry-variable configuration, and the Vercel Firewall rate limit are complete. The owner confirmed receipt of the labeled protected-Preview email test on 2 October 2026. A separately authorized, filtered protected Preview was reviewed on 2 October: security headers, branded 404, API method handling, and the disabled-service/no-send response behaved as expected; the request page Lighthouse accessibility, best-practices, and SEO scores were all 100 with no failures. `INQUIRY_ENABLED` remains false pending provider privacy/retention review, a safe rate-limit verification plan, remaining device checks, and launch approval. Local automated tests use mocked provider responses; they do not prove live duplicate suppression.

### Phase 4: Establish production foundations

**Work**
- Use Vercel for static delivery and the serverless endpoint. A custom website domain is optional for local development and staging. Resend requires a domain owned by the shop and verified for production sending; it may be a dedicated sending subdomain and does not have to be the website's public hostname.
- **Completed:** the Vercel Firewall rule `Limit item inquiry submissions` limits `POST /api/request` to 5 requests per IP per 60 seconds and is published, including for Production. Confirm the rule still applies as configured during protected Preview/Production verification; do not remove it or enable email as part of local review. The endpoint's honeypot is only a basic bot signal, not a substitute for rate limiting.
- Configure a verified sender identity with the email-delivery provider. Do not assume the recipient Gmail can be used as the sender domain; follow the provider's authentication requirements (such as SPF/DKIM) for the domain used to send mail.
- Put the project under version control with a documented, repeatable deployment path. Keep secrets out of source control and provide a rollback path.
- Serve only over HTTPS; configure domain redirects and secure headers where the host supports them.
- Check responsive behavior, image loading and file sizes, keyboard navigation, visible focus, contrast, labels, alt text, semantic headings, and not-found states.
- Add accurate page titles/descriptions, canonical URLs, `robots.txt`, and an XML sitemap once the public domain is known. Add structured data only for facts the business can substantiate.
- Run a production checklist for broken links/assets, browser errors, form delivery, mobile layouts, and performance on a real phone connection.

**Done when:** the production domain is stable; deployment and rollback are understood; pages and form pass the agreed device/browser checks; and no test or placeholder details are public.

**Status:** the current Preview is Ready but protected from anonymous access. An initial deployment became the project's Production target automatically; do not treat it as a reviewed public launch. The sending domain is verified, Preview variable names are configured with values hidden, and the Firewall limit is published. The owner confirmed receipt of a clearly labeled protected-Preview test on 2 October 2026. Keep `INQUIRY_ENABLED=false` until remaining checks are complete and the owner approves launch.

### Phase 5: Launch and operate the catalogue

**Work**
- Do a final owner sign-off on all visible product data, policies, branding and homepage photography, phone number, and public contact details.
- Test the production form end-to-end, including invalid fields, spam rejection, provider outage/error, retry, duplicate submission behavior, and confirmation copy.
- Define a simple product-update routine: who confirms stock/spec changes, how photos and listings are updated, and how quickly stale claims are removed.
- Review access to hosting, domain, email, and provider accounts; use unique strong passwords and multi-factor authentication where available.

**Done when:** owner approves the deployed version, form delivery has been verified to the real shop inbox, and someone is responsible for maintaining product accuracy and account access.

**Status:** Blocked on phases 2–4.

### Phase 6: Add useful guides only with a clear editorial standard

**Decision gate:** decide whether O-BEST has the time and practical expertise to maintain helpful guidance. Guides are optional; a small number of genuinely useful articles is better than many thin pages.

**Possible topics**
- Choosing a charger or cable for a device (with careful compatibility limits).
- How to compare power-bank capacity and output claims, explained plainly.
- Safe everyday gadget care, cleaning, storage, and troubleshooting.
- What information to check before buying a replacement part.

**Editorial rules**
- Write original guidance based on experience and reliable references; cite sources for technical or safety claims.
- Identify the author/shop perspective, publication and review date, and scope/limitations.
- Separate general education from diagnosis. Do not recommend unsafe battery opening, electrical repair, or risky DIY work; tell readers when to stop and seek a qualified technician.
- Do not disguise advertising as advice or claim that a product is in stock just because an article mentions it.

**Done when:** each guide solves a real visitor question, is fact-checked, safely scoped, and has a named person responsible for future review.

**Status:** A Guides hub is present locally at `guides.html`; one original charging-accessory buying-checklist draft is at `charging-guide.html`, with manufacturer sources and scope limits. The other listed subjects are explicitly marked planned, not published advice. The current article is not approved as a public guide: the shop must decide it can maintain advice, assign a reviewer, and sign off on the content before launch or promotion. The catalogue includes an inline, dismissible charger-checklist suggestion that appears once per browser tab session with a short entrance delay; it is not a modal or fixed overlay. Site motion is limited to a slow, pausable brand ticker and subtle section reveals, with animations disabled for visitors who request reduced motion.

### Phase 7: Decide whether to offer repairs

**Decision gate:** the owner has confirmed an engineering service operates alongside the accessories shop, separately from accessory sales. It fixes phone issues and may also take on some accessory and gadget issues. Publish this limited description, but do not promise acceptance, outcomes, warranty coverage, or booking until exact service terms are confirmed.

**Before building a repair section, define**
- Devices and repair types accepted, exclusions, service location, and who performs the work.
- Diagnosis and quote process, customer approval before paid work, payment/collection process, and realistic turnaround wording.
- Parts sourcing/quality, warranty or rework terms, and how those terms are presented.
- Customer-device privacy: passcodes should not be collected through this website; define secure handling, access, backup, and data-loss expectations with the technician.
- Intake workflow, status updates, cancellations, complaints, and responsibility if repair fails or causes damage.
- Any local legal, consumer-protection, tax, or licensing obligations; get qualified local advice where needed.

**Done when:** the owner confirms operational capability and service terms, and the repair journey has been designed before a public “book repair” feature is added.

**Status:** The engineering service is described on `about.html` and linked from the Guides hub. No repair booking or intake form is provided. Before adding one or making stronger claims, confirm accepted devices and faults, who performs work, assessment/quote and approval process, fees, timing, collection, data handling, and any warranty/rework terms. The service is separate from accessory sales and is not presented as warranty cover attached to items sold by O-BEST.

### Phase 8: Prepare for an ad network (for example, AdSense)

**Decision gate:** advertising is a later business decision, not a launch dependency and not guaranteed income. No site can guarantee network approval.

**Before applying**
- Verify current network eligibility and policies directly; Google expects original, useful content and compliant site behavior. Product listings alone may not provide enough independent editorial value.
- Build an audience and publish useful, maintained content for real customers; never add filler just to increase page count.
- Publish a privacy policy that accurately discloses the advertising vendors and cookie/data use once selected. If serving users in the EEA, UK, or Switzerland, check Google's current consent/CMP requirements and use a compliant consent flow where required.
- Keep ad placements clearly distinguishable from navigation and content. Never ask people to click ads or click your own ads. Avoid ads on pages primarily devoted to private communication, such as the inquiry form.
- Add ad code only after acceptance and follow the network's current placement, consent, and invalid-traffic rules.

**Done when:** the site has durable useful content and real visitors, policy/privacy/consent responsibilities are understood, and the owner chooses to apply. Approval remains the network's decision.

**Status:** Future consideration; no ad scripts or tracking are currently configured.

## Current work plan (reviewed 1 October 2026)

Use this queue to keep the review findings in scope and in a safe order. A task is not complete just because its code exists: owner-controlled setup, verification, and any required approval are part of its done condition. Do not deploy or change Production without explicit approval.

### 0. Interaction discoverability — included in protected Preview review; Production unchanged

- Persistent underlines distinguish standalone text links before hover; keyboard focus has a high-contrast indicator; card action cues remain visible and do not replace availability wording.
- Ordinary paragraph text remains selectable and is not styled as a link. No decorative arrow glyphs were added.
- **Status:** Implemented in the working copy and included in the filtered protected Preview review. The edits remain local/uncommitted; Production was not changed.

### 0.0 Inventory-driven category navigation — protected Preview reviewed; Production unchanged

- The Home page no longer promotes Phone protection while there are no protection listings. Its category links now point only to catalogue categories with visible products.
- The catalogue taxonomy contains only real item types, and category/type visibility is derived from the currently displayed product records so stale or future empty categories cannot appear as zero-product promises.
- Invalid or stale category/type query parameters safely return to the all-category view; a category with valid inventory but an invalid type falls back to that category's type choices. Search comparisons use the same accent-insensitive normalization as product search.
- The shared script applies `aria-current="page"` to the matching main-navigation link, including the root homepage path.
- Available phone screens sort alphabetically and expose brand filter chips derived from current inventory (Apple, Infinix, Samsung, TECNO, Xiaomi); counts and selected state are shown, filters are keyboard-accessible buttons, and a selected brand is preserved in the URL. Selecting “All brands” clears only the brand filter.
- Regression tests cover homepage links, catalogue taxonomy against product data, current-page navigation state, contrast, phone-screen availability, and brand filtering. Local checks: all 25 tests pass; catalogue Lighthouse accessibility, best-practices and SEO are each 100% with no failures after the filter and product-link accessibility updates. Brand buttons show inventory counts, selected state, and a mobile-stacked layout. Local results are not Preview/production sign-off.
- **Status:** Complete and included in the filtered protected Preview review. No inventory records or inquiry settings were changed; Production was not changed.

### 0.1 Domain-independent QA pass — protected Preview checks complete; physical-device QA remains

- Scanned all nine HTML pages and checked 165 local links, anchors, stylesheets, scripts, and image targets; no missing targets. Checked page titles, descriptions, main/skip targets, and explicit `type="button"` on each navigation toggle.
- Confirmed the selected product updates both the document title and meta description; verified the mobile navigation toggle's expanded state and open/close behavior, required request fields are labeled, and an empty request remains blocked by native validation.
- A filtered protected Preview was created with explicit authorization from the current working copy. Its bundle contains the site pages, request function, and referenced visible-site assets; it excludes roadmap/research notes, tests, and unreferenced incoming uploads. No Production deployment or DNS change was made.
- Protected Preview checks: `/` and `/request.html` load; an unknown path returns the branded 404 with HTTP 404; baseline security headers are present on page and API responses; `GET /api/request` returns 405 with `Allow: POST`; a valid no-send POST returns 503 and truthfully says details were not sent while inquiry delivery is disabled. The request page had no browser console warnings/errors or failed images. Its Lighthouse accessibility, best-practices and SEO audits each scored 100 with no failures (not a performance score).
- Local endpoint suite: all 28 tests pass. Do not deliberately exceed the live 5-per-IP/60-second rate limit because that Firewall rule also applies to Production; its configuration is confirmed, but triggered behavior remains unverified. Live provider duplicate suppression is also unverified; the repeat-key test uses a mock.
- **Follow-up:** The browser harness did not provide a real phone viewport/touch emulator during this pass. Physical-device touch, focus, contrast, and reduced-motion QA remain outstanding. Provider privacy/retention settings need owner review before launch.
- **Status:** This is protected Preview QA only, not Production sign-off or launch approval. Inquiry sending remains disabled.

### 0.2 Homepage photography carousel — implemented locally; composition sign-off remains part of Preview review

- Replaced the existing illustrative hero photo with owner-supplied images. The selected set includes the RGB mouse, multi-connector cable, colourful USB drives, portable and feature-phone products, charging and data accessories, screen protectors, a keyboard/mouse and earbuds. Mixed Oraimo/shop displays, repair imagery and compatibility charts are not used in the hero.
- Added the selected images to `assets/homepage/` under descriptive names; originals remain preserved in `incoming/`. The hero uses one fixed square frame and `object-fit: contain`, so source images are not stretched or cropped. The transparent frame surround lets the hero's circular linework carry through behind the photo, with a slightly stronger light outline and yellow base accent rather than a floating white card; image name/count labels have been removed.
- Images are centered in the blue hero area with a deliberate gap above the yellow band. They rotate automatically every five seconds with a slower 1.5-second crossfade. No carousel pause control is shown; the carousel stops when off-screen or the tab is hidden and stays static for reduced-motion preference. Images decode before rotation begins.
- Mobile rendering checked at 320, 375, 414, and 760 CSS-pixel widths, plus the 768px desktop breakpoint. Kept the inner photo opening square, carried the circular hero linework behind the frame, verified image loading and the gap above the yellow band, and tuned the smallest-phone header and headline to avoid overflow and awkward wrapping.
- **Remaining:** retain the final photo/background composition as part of Preview sign-off. The separate current visible illustrations have owner approval. No deployment or Production change.

### 0.3 Additional supplied imagery — sorted locally; owner verification pending for unlisted identities/uses

- Visually reviewed all 24 uploaded JPEGs and compared them with the existing named product assets using SHA-256 hashes. Three are exact duplicates of the already organized homepage mouse, cable, and USB-drive images; the originals remain in `incoming/` without creating redundant copies.
- Organized 11 distinct product/accessory photos in the homepage carousel assets. The photos remain uncropped and use neutral, visually grounded alt text; the five-second timing, crossfade, frame, and reduced-motion behavior apply consistently to all slides.
- Sorted 10 compatibility charts, repair/lifestyle images, and mixed shop displays under `assets/reference/`; these are not individual product photos and are not shown in the carousel.
- Preserved all source images in `incoming/`. The new photos have not been added as catalogue records in `products.js`. Some model identities are unclear; confirm product details and image-use permission with the owner before cataloguing or launch.

### 0.4 TECNO phone-screen research — Batch 3 is separate and not customer-visible

- Recorded two source-linked, non-duplicate research candidates in [`TECNO-RESEARCH-BATCH-3.md`](TECNO-RESEARCH-BATCH-3.md): TECNO Spark 30 4G (KL6) and Spark 40 4G (KM5). The owner-provided images show model markings; independent supplier references and device specifications are documented separately.
- The Spark 40/KM5 supplier image and listings also mention other models. Those grouped compatibility claims remain unverified and are not included as fit claims.
- The research file is not loaded by the website. `products.js`, the approved 130 visible listings, and the catalogue display filter are unchanged. No supplier images were copied into the site assets.
- **Status:** Two candidates documented toward the 50-model research target; research and owner review remain incomplete. Neither candidate is approved for customer display or compatibility claims.

### 1. Make item-request delivery genuinely operational — launch blocker

- Keep the request journey on the website. Do not add WhatsApp click-to-chat or send item requests to WhatsApp.
- Resend sender verification, Preview inquiry variable configuration, and the Vercel Firewall rate limit are already in place. The owner confirmed receipt of a clearly labeled protected-Preview test on 2 October 2026. Confirm the owner still controls the accounts and keep `INQUIRY_ENABLED=false` until the remaining privacy/launch gates are complete and launch is approved.
- The published Firewall rule is enabled and configured to limit `POST /api/request` to 5 requests per IP per 60 seconds. Its configuration is confirmed; local tests cover validation and honeypot rejection. Triggered rate-limit behavior remains unverified because the shared rule also applies to Production and was not deliberately exceeded. Do not enable customer submissions until this is verified under an owner-approved safe plan.
- Owner confirmed on 2 October 2026: Vercel is on Hobby; Build Logs and Source Protection is enabled; project deployment retention is 30 days; Gmail is a personal account, accessible only to the owner, and the owner plans to delete inquiry mail after 30 days. Resend's published policy states 30-day retention for email content, metadata, delivery events, logs and metrics. Updated `privacy.html` and README to describe these facts, including Gmail Trash's additional up-to-30-day recovery window and Vercel's one-hour Hobby runtime-log retention/indefinite build-log retention. The owner subsequently confirmed Resend admin MFA is enabled. Reconfirm if plans/settings or practices change; this is an operational disclosure, not legal advice.
- The owner confirmed receipt of one clearly labeled valid delivery test on protected Preview on 2 October 2026; the endpoint returned HTTP 200. The separately authorized filtered Preview also returned the expected 503/no-send response with `INQUIRY_ENABLED=false`. Local automated tests (28 passing on 2 October 2026) cover malformed and invalid input, honeypot, disabled configuration, provider/network failures, and forwarding the same idempotency key on a repeat. These mocks do not prove live provider duplicate suppression or triggered rate-limit behavior. Provider retention information has been reviewed and the plain-language disclosure updated to owner-confirmed settings; physical-device checks and safe rate-limit verification remain. Keep `INQUIRY_ENABLED=false` until all remaining checks pass and the owner explicitly approves launch; the on-page disabled-state copy is truthful.
- **Done when:** the owner confirms receipt in the shop inbox, errors and rate limits behave safely, privacy copy matches the real flow, and the owner approves the form for launch. Never expose the private receiving address or provider credentials in client files.

### 2. Confirm public business details and launch basics — owner gate

- Owner confirmed the current website details and approved the supplier reference photos on 1 October 2026. On 2 October 2026, the owner explicitly approved all 130 currently visible catalogue/listings and the current visible illustrations. Keep claims within confirmed facts; retain the separate draft-guide and final hero photo/composition review gates below.
- Keep the About map action explicitly labeled as a Maps address search, not as a verified storefront pin, until the owner verifies the destination. The current link uses only the owner-confirmed street address and makes no coordinate/pin claim.
- Ask the owner to provide actual terms/returns/refund rules if they want those pages. Do not publish template policies as if they were the shop's policy.
- Add a branded 404 page and check response/hosting behavior so genuinely missing URLs use it.
- Review HTTPS redirects, security headers, keyboard/touch use, contrast, reduced motion, broken links/assets, and the approved local affordance changes.
- **Done when:** public facts and policies have owner sign-off, the 404 and security behavior are verified on Preview, and the owner explicitly approves a production launch.

### 3. Search and sharing metadata — after the public domain is chosen

- The product page now has a truthful generic description, and client-side rendering updates the title and description for a selected item. The page remains a JavaScript-rendered shell; assess build-time product pages/pre-rendering before relying on JavaScript-only product titles or social cards.
- Once the canonical public hostname is selected, add canonical URLs, Open Graph/social preview metadata and image, `robots.txt`, and an XML sitemap containing real public URLs. Do not submit to Search Console until domain ownership is verified by the owner.
- Add LocalBusiness/Store structured data only for verified address, hours, and business identity; test the generated markup.
- **Done when:** every public URL has accurate metadata and a working share preview, sitemap and canonicals use the chosen HTTPS hostname, and Search Console ownership/indexing is confirmed where appropriate.

### 4. Measure image and page performance

- Measure representative mobile pages and image sizes first. Check intrinsic dimensions/aspect ratio and layout shift; retain lazy loading below the initial viewport and avoid lazy-loading the main hero image.
- Convert or resize only assets where measurement shows a worthwhile saving; retain a compatible fallback and verify image quality and packaging legibility.
- **Done when:** mobile performance and layout stability have been checked on representative catalogue/detail pages and any optimized images render correctly.

### 5. Optional operations and advertising decisions — not launch blockers

- A CMS is optional. First agree who updates products and hours and how changes are reviewed; introduce a CMS only if the owner needs and accepts the ongoing account/workflow.
- Uptime monitoring is optional and requires an owner-controlled account and alert recipient.
- Analytics/GA4 is opt-in, not a default requirement; decide whether its value justifies the privacy and consent work before adding tracking.
- Treat AdSense as a later, non-guaranteed business decision. Build useful original content for customers, not filler or an arbitrary article count. Keep the charging guide marked draft until owner review; publish any Terms/returns policy only when actual rules are confirmed. Check current Google policies at application time.

## Immediate sequence

1. Preserve the local catalogue, interaction, accessibility, and deployment-exclusion fixes. Automated tests pass (28); local phone-width layout checks pass in iframes at 320, 375, and 414 px, and local Homepage/Request/Catalogue Lighthouse audits have no failures. Physical-device/touch QA and protected Preview checks remain. Do not deploy without approval.
2. After explicit authorization to create a protected Preview (which requires publishing the current branch changes), verify the branded 404, security headers, Maps address-search destination, and the approved pages/photos; complete product metadata/pre-rendering assessment, Preview/mobile accessibility and touch checks, and image-performance measurement. This is not Production approval.
3. The public domain `obestlink.com` is registered and active at Namecheap. Keep its DNS unchanged until the owner separately authorizes connecting it to the site and the launch gates are ready. Confirm owner control of Vercel and Resend accounts and any recurring plan cost before activation.
4. Confirm owner access to Resend/Vercel and review actual provider retention/privacy settings. A clearly labeled protected-Preview delivery test was received by the owner on 2 October 2026. The verified sender, Preview variable names, and published rate-limit rule are already configured. Keep `INQUIRY_ENABLED=false` until the remaining launch checks are confirmed and the owner approves launch.
5. Once the public launch and domain connection are approved, finish canonical/social metadata, `robots.txt`, sitemap, structured data, and owner-verified Search Console setup.
6. Owner has approved the current website details and supplier-photo use. Keep the guide draft clearly marked until it receives its separate editorial review; get approval for any actual terms/returns policies before publishing. Measure image performance and optimize only where needed. Consider CMS, uptime monitoring, analytics, and AdSense separately and only with owner approval.

## Current implementation references

- `index.html`: homepage, rotating product-photo hero, current category introduction, and entry points to the guide and shop details.
- `catalog.html`: category-first browse flow.
- `product.html`: product detail shell.
- `request.html`: on-site item request form; a clearly labeled protected-Preview email test was confirmed received on 2 October 2026. Customer email delivery remains disabled pending remaining launch checks and owner approval. The private recipient address is owner-confirmed but intentionally not recorded in this public-facing project documentation.
- `about.html`: shop offer, public visit information, phone contact, and flyer-listed social links.
- `privacy.html`: plain-language explanation of request information, use, providers, and how to contact the shop with privacy questions.
- `guides.html`: guide hub; additional article topics are marked planned.
- `charging-guide.html`: manufacturer-sourced charging-accessory buying-guide draft; owner review is pending.
- `products.js`: product catalogue and review batches.
- `app.js`: catalogue behavior and on-site inquiry form submission.
- `api/request.js`: Vercel Function; validates requests and sends through Resend when configured.
- `tests/request.test.js`: local automated tests; kept outside `api/` so it is not deployed as a Vercel Function.
- `styles.css`: responsive styling, product-photo display, guides layout and browsing prompt, and About & Visit page.
- `404.html`: branded not-found experience, verified locally to return HTTP 404 for an unknown path.
- `vercel.json`: baseline security response headers, verified with local `vercel dev`; verify again on protected Preview before launch. HSTS is intentionally deferred until the owner-controlled domain and HTTPS redirects are confirmed.
