# O-BEST website prototype

A standalone, dependency-free website prototype for O-BEST Link Communication. It is intentionally separate from the Foundry/Solidity project in the workspace.

See [`BUILD-ROADMAP.md`](BUILD-ROADMAP.md) for the staged plan from catalogue review through a secure inquiry flow, launch, useful guides, possible repairs, and future ad-network readiness.

## Preview

The linked Vercel project has protected Production and Preview deployments. Do not treat them as an approved public launch. The local site includes a Guides hub, a draft charging-accessory checklist that is still pending owner review, an About & Visit page, and a plain-language Privacy page. Planned guide subjects are labelled as future topics, not published advice. The catalogue includes an inline, dismissible suggestion to read the charger checklist. The owner confirmed 08105463451 for public phone and WhatsApp contact; the page displays it as a phone link but does not open a WhatsApp chat. The item-request form remains on-site and does not redirect to WhatsApp. Open `index.html` locally or use `vercel dev` for development. The request endpoint runs as a Vercel Function at `/api/request`; it requires server-side environment variables and returns an honest “not ready” response until configured. For endpoint tests, run `npm test` (Node.js 20+). A plain static file preview cannot send inquiries.

## Before publishing

- The inquiry form no longer opens WhatsApp. `api/request.js` sends through Resend only after server configuration and provider acceptance; there is no separate application inquiry database. Resend, Vercel and Gmail may process or retain message content or operational metadata according to account settings and policies.
- Configure `INQUIRY_ENABLED`, `RESEND_API_KEY`, `INQUIRY_TO`, and `INQUIRY_FROM` as Vercel server-side environment variables. Leave `INQUIRY_ENABLED=false` until ready to receive real enquiries. `INQUIRY_TO` is the owner's private receiving address; do not commit it. `INQUIRY_FROM` must use a domain verified in Resend. Never expose the API key in browser code.
- The endpoint fails closed unless `INQUIRY_ENABLED=true` is set in Vercel. Keep it false during development and staging until delivery and privacy readiness are confirmed.
- Before enabling real customer submissions, configure a Vercel Firewall rate-limit rule for `POST /api/request`; the honeypot and input validation alone are not rate limiting.
- Before real delivery, configure and verify the sending domain in Resend, then test from a Vercel preview deployment. Until then the endpoint intentionally returns a service-not-ready response and does not claim a request was sent.
- The local request page links to `privacy.html`; review that copy against final provider settings and applicable legal requirements before public launch.
- The previously confirmed WhatsApp number is not currently used by the form.
- `404.html` provides the branded not-found page. `vercel.json` sets baseline security headers; verify them on a protected Preview deployment before public launch. HSTS is intentionally not set until the final HTTPS domain and redirect behavior are confirmed.
- A private inquiry-recipient email has been provided by the owner. It is not displayed publicly; configure it only in server-side deployment settings. The confirmed shop address, opening hours and social links are displayed on the About & Visit page.
- Batch 1 (20 photo-backed products) and batch 2 (8 additional photographed products) have been owner-approved. Product batches are marked in `products.js`.
- Matching product photos are stored in `assets/products/`. Do not use mixed shelf photos as individual product photos.
- Custom O-BEST object illustrations for the homepage strip and category cards are local SVGs in `assets/illustrations/`; they are decorative and paired with visible category labels. They use the existing layout and palette as a first pass, pending owner/design review.
- The homepage hero locally rotates through three owner-supplied images at `assets/homepage/rgb-wireless-mouse.jpg`, `assets/homepage/multi-connector-cable.jpg`, and `assets/homepage/colorful-usb-drives.jpg`. They are centered in one square, uncropped `contain` frame. Its transparent blue surround lets the hero's circular linework continue through the frame, with a slightly stronger light outline and small yellow base detail; there are no image labels. The frame is kept clear of the yellow hero band. Rotation is automatic at seven-second intervals, with a 1.5-second crossfade and reduced-motion support. The previous illustrative Pexels image remains in the asset folder but is no longer used in the hero. Confirm image-use permission, product identity, and the final visual with the owner before launch.
- Product descriptions use direct retail wording. Confirm final product names, specifications and compatibility with the shop before launch; remove any detail that has not been confirmed.
- Set availability only when the shop confirms it; otherwise listings say “Ask us to check.”
- The owner confirmed that items not available in-store can be sourced within 24 hours after a customer requests them. This timing is described as sourcing time, not as stock confirmation or a delivery promise.
- Delivery, rewards, prices, stock claims and unconfirmed technical claims are intentionally not included.

## Editing catalogue items

Each catalogue item is an object in `products.js`. Supported categories are `power`, `audio`, `protection`, and `parts`. Give each item a unique `id`; product links and category filtering are generated from this data.
