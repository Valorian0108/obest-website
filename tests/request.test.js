const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHandler } = require("../api/request.js");

const productsContext = {};
vm.runInNewContext(fs.readFileSync(require.resolve("../products.js"), "utf8").replace("window.OBEST_PRODUCTS =", "globalThis.OBEST_PRODUCTS ="), productsContext);
const products = Array.from(productsContext.OBEST_PRODUCTS);

test("catalogue product IDs are unique and referenced images exist", () => {
  const ids = products.map(product => product.id);
  assert.equal(new Set(ids).size, ids.length, "product IDs must be unique");
  const missingImages = products.filter(product => product.image && !fs.existsSync(path.resolve(__dirname, "..", product.image)));
  assert.deepEqual(missingImages.map(product => product.image), []);
});

test("home and catalogue only link to categories and product types with listings", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const listedProducts = products.filter(product => product.batch <= 2);
  const homeCategories = [...home.matchAll(/href="catalog\.html\?category=([a-z-]+)"/g)].map(match => match[1]);
  const productCategories = new Set(listedProducts.map(product => product.category));

  assert.equal(new Set(homeCategories).size, homeCategories.length, "home category links should not be duplicated");
  assert.ok(homeCategories.every(category => productCategories.has(category)), "every home category link should have a product listing");
  assert.doesNotMatch(home, /catalog\.html\?category=protection/, "the empty phone-protection category should not be promoted");
  assert.match(app, /const availableCategories = catalogCategories\.filter\(category => products\.some\(product => product\.category === category\.id\)\)/);
  assert.match(app, /const availableTypes = category => category\.types\.filter\(type => products\.some\(product => product\.category === category\.id && product\.itemType === type\)\)/);
  assert.match(app, /activeItemType = activeCategory && availableTypes\(availableCategories\.find\(category => category\.id === activeCategory\)\)\.includes\(requestedType\) \? requestedType : ""/);

  const catalogBlock = app.slice(app.indexOf("const catalogCategories = ["), app.indexOf("const typeIcons ="));
  const configuredTypes = [...catalogBlock.matchAll(/types: \[([^\]]+)\]/g)].flatMap(match => [...match[1].matchAll(/"([a-z-]+)"/g)].map(type => type[1]));
  assert.ok(configuredTypes.every(type => listedProducts.some(product => product.itemType === type)), "empty item types should not appear in the catalogue taxonomy");
});

test("the owner-approved charging checklist is presented as available general guidance", () => {
  const root = path.resolve(__dirname, "..");
  const guides = fs.readFileSync(path.join(root, "guides.html"), "utf8");
  const article = fs.readFileSync(path.join(root, "charging-guide.html"), "utf8");

  assert.match(guides, /01 GUIDE AVAILABLE/);
  assert.match(guides, /class="guide-status-label">GENERAL CHECKLIST</);
  assert.match(guides, /href="charging-guide\.html"/);
  assert.doesNotMatch(guides, /DRAFT|FOR REVIEW|READY FOR REVIEW/);
  assert.doesNotMatch(article, /DRAFT|FOR REVIEW|Editorial status:/);
  assert.match(article, /not a compatibility guarantee/);
  assert.match(article, /Google Pixel Help: Charge your Pixel phone/);
});

test("shared script marks only the current navigation route for assistive technology", () => {
  const app = fs.readFileSync(path.resolve(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /const currentPath = location\.pathname === "\/" \? "\/index\.html" : location\.pathname/);
  assert.match(app, /link\.setAttribute\("aria-current", "page"\)/);
  assert.match(app, /else link\.removeAttribute\("aria-current"\)/);
});

test("catalogue accent heading uses a high-contrast teal on white", () => {
  const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");
  assert.match(styles, /\.catalog-intro h1 span\{color:#08736e\}/);
});

test("phone screens use the available status and a reduced-motion-aware green pulse", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const screens = products.filter(product => product.itemType === "phone-screens");

  assert.ok(screens.length > 0, "phone-screen inventory should be present");
  assert.match(app, /const availabilityByItemType = Object\.freeze\(\{ "phone-screens": "available" \}\)/);
  assert.match(app, /const availabilityFor = product => product\.availability \|\| availabilityByItemType\[product\.itemType\] \|\| "check"/);
  assert.match(app, /\$\{availabilityMarkup\(product\)\}/, "catalogue cards should share the data-driven availability renderer");
  assert.match(app, /\$\{availabilityMarkup\(product, true\)\}/, "product details should share the same availability renderer");
  assert.match(app, /availability === "available"[\s\S]*?Listed as available/);
  assert.match(styles, /\.availability-dot--available\{background:#16803c;[^}]*animation:availability-pulse 1\.8s ease-in-out infinite\}/);
  assert.match(styles, /\.availability-pill \.availability-dot--available\{background:#16803c\}/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.availability-dot--available\{animation:none;/);
});

test("phone screens are alphabetized and expose inventory-driven shareable brand filters", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "catalog.html"), "utf8");
  const screenBrands = [...new Set(products.filter(product => product.itemType === "phone-screens").map(product => product.brand || "Other"))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  assert.match(catalog, /id="brand-filter"[^>]*role="group"[^>]*aria-label="Filter phone screens by brand"/);
  assert.match(app, /const phoneScreenProducts = products\.filter\(product => product\.itemType === "phone-screens"\)/);
  assert.match(app, /\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name, undefined, \{ sensitivity: "base", numeric: true \}\)\)/);
  assert.match(app, /history\.replaceState\(null, "", catalogUrl\(activeCategory, activeItemType, activeBrand\)\)/);
  assert.match(app, /aria-pressed="\$\{activeBrand === brand\.slug\}"/);
  assert.match(app, /All phone screens/);
  assert.deepEqual(screenBrands, ["Apple", "Infinix", "Samsung", "TECNO", "Xiaomi"]);

  const sortedScreens = [...products.filter(product => product.itemType === "phone-screens")].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
  );
  assert.equal(sortedScreens.length, 70);
  assert.ok(sortedScreens.every((product, index) => index === 0 || sortedScreens[index - 1].name.localeCompare(product.name, undefined, { sensitivity: "base", numeric: true }) <= 0));
  assert.match(app, /matchingItems\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name, undefined, \{ sensitivity: "base", numeric: true \}\)\)/);
  assert.match(app, /backButton\.hidden = !term && !activeBrand && !activeItemType/);
});

test("nested catalogue groups are not hidden by the section reveal animation", () => {
  const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");
  assert.match(styles, /\.motion-ready main>section:not\(\.hero\)\{/);
  assert.match(styles, /\.motion-ready main>section:not\(\.hero\)\.is-revealed\{/);
  assert.doesNotMatch(styles, /\.motion-ready main section:not\(\.hero\)/);
});

test("home categories remain available on mobile without waiting for scroll reveal", () => {
  const root = path.resolve(__dirname, "..");
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const categorySection = home.match(/<section class="section category-section"[\s\S]*?<\/section>/)?.[0] || "";

  assert.equal((categorySection.match(/class="category-card [^"]+"/g) || []).length, 6, "all six approved category links should be present");
  assert.match(styles, /@media\(max-width:760px\)\{\.topline-toggle\{opacity:1\}\}/, "the moving-brand pause button should remain discoverable without hover on phones");
  assert.match(styles, /@media\(max-width:760px\)\{\.motion-ready main>section:not\(\.hero\)\{opacity:1;transform:none\}\.header-cta\{min-height:44px\}\.filter-chip,\.catalog-brand-chips \.filter-chip\{height:44px\}\}/, "phone layouts should keep sections visible and interactive controls comfortably tappable");
});

test("ringed yellow art shares the breathing-ring and orbiting-star motif", () => {
  const root = path.resolve(__dirname, "..");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const illustratedPages = fs.readdirSync(root)
    .filter(file => file.endsWith(".html"))
    .map(file => ({ file, html: fs.readFileSync(path.join(root, file), "utf8") }))
    .filter(({ html }) => /class="[^"]*\borbit-doodle\b/.test(html));
  assert.deepEqual(illustratedPages.map(({ file }) => file).sort(), ["catalog.html", "guides.html"]);
  for (const { file, html } of illustratedPages) {
    assert.match(html, /class="[^"]*\borbit-doodle\b/, `${file} should use the shared motif`);
    assert.match(html, /orbit-doodle-ring--inner/);
    assert.match(html, /orbit-doodle-ring--outer/);
    assert.match(html, /orbit-doodle-disc/);
    assert.match(html, /orbit-star-track--disc/, `${file} should orbit the yellow disc`);
    assert.doesNotMatch(html, /orbit-star-track--(?:inner|outer)/, `${file} should not put stars on the pulsing rings`);
    assert.equal((html.match(/class="spark-icon orbit-star"/g) || []).length, 1, `${file} should have exactly one star`);
  }
  const guides = fs.readFileSync(path.join(root, "guides.html"), "utf8");
  assert.match(guides, /class="guide-feature-art orbit-doodle"[^>]*>[\s\S]*?<img class="guide-feature-illustration" src="assets\/illustrations\/power-charging\.svg"/, "the generic USB badge should be replaced with the actual charger-and-cable illustration");
  assert.ok(fs.existsSync(path.join(root, "assets/illustrations/power-charging.svg")), "the power and charging illustration must exist locally");
  assert.match(styles, /@keyframes orbit-ring-pulse/);
  assert.match(styles, /@keyframes orbit-star-turn\{from\{rotate:35deg\}to\{rotate:395deg\}\}/);
  assert.match(styles, /@keyframes orbit-star-counter\{from\{rotate:-35deg\}to\{rotate:-395deg\}\}/);
  assert.match(styles, /\.orbit-doodle \.orbit-doodle-disc\{position:absolute;top:0;right:0;bottom:0;left:0;z-index:1;margin:auto;/);
  assert.doesNotMatch(styles, /orbit-doodle-ring--outer\{[^}]*animation-delay/);
  assert.match(styles, /\.orbit-doodle \.orbit-star-track\{position:absolute;inset:0;/);
  const starRule = styles.match(/\.orbit-doodle \.orbit-star\{[^}]*top:0;left:50%;[^}]*width:(\d+(?:\.\d+)?)%;height:(\d+(?:\.\d+)?)%;[^}]*margin:-([\d.]+)% 0 0 -([\d.]+)%/);
  assert.ok(starRule, "the star should be centered on the orbit using symmetric margins, not a rotating centering transform");
  assert.equal(Number(starRule[1]), Number(starRule[2]), "the star should scale equally in both dimensions");
  assert.equal(Number(starRule[1]) / 2, Number(starRule[3]), "the top margin should place the star center on the arc");
  assert.equal(Number(starRule[1]) / 2, Number(starRule[4]), "the left margin should center the star on its orbit track");
  const discTrack = styles.match(/\.orbit-doodle \.orbit-star-track--disc\{inset:(-?\d+(?:\.\d+)?)%/);
  assert.ok(discTrack, "the single star should have a proportional orbit track");
  assert.equal(Number(discTrack[1]), 0, "the star track should follow the yellow disc circumference");
  assert.match(styles, /\.orbit-doodle \.orbit-doodle-ring\{[^}]*animation:orbit-ring-pulse/);
  assert.match(styles, /\.guide-feature-illustration\{position:absolute;top:50%;left:50%;z-index:2;width:82%;/);
  assert.match(styles, /\.catalog-doodle\.orbit-doodle\{flex:0 0 160px;align-self:center;min-height:160px\}/, "the catalogue disc should not deform in the flex layout");
  assert.match(styles, /@media\(max-width:760px\)\{\.guide-feature-art\.orbit-doodle\{position:relative;grid-column:1\/-1;justify-self:center;top:auto;right:auto;width:115px;height:115px;margin:18px 0 0;clip-path:none;opacity:1\}\}/);
  assert.doesNotMatch(styles.slice(styles.indexOf("/* Orbiting circle motif"), styles.indexOf("/* O-BEST spot illustrations")), /\d+(?:\.\d+)?(?:vw|vh|vmin|vmax)\b/);
  assert.match(styles, /prefers-reduced-motion:reduce\)\{\.orbit-doodle-ring,\.orbit-doodle \.orbit-star-track,\.orbit-doodle \.orbit-star\{animation:none\}/);
});

test("deployment excludes local installers, private order document and uploaded originals", () => {
  const exclusions = ["assets/products/Claude Setup.exe", "assets/products/Cline_0.0.40_x64-setup.exe", "assets/products/namecheap-order-215626255.pdf"];
  const vercelIgnore = fs.readFileSync(path.resolve(__dirname, "..", ".vercelignore"), "utf8");
  const gitIgnore = fs.readFileSync(path.resolve(__dirname, "..", ".gitignore"), "utf8");
  for (const file of exclusions) {
    assert.ok(vercelIgnore.split(/\r?\n/).includes(file), `${file} must be excluded from Vercel deployment`);
    assert.ok(gitIgnore.split(/\r?\n/).includes(file), `${file} must be excluded from Git`);
  }
  assert.ok(vercelIgnore.split(/\r?\n/).includes("/incoming/"), "uploaded originals must be excluded from Vercel deployment");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "incoming")), "uploaded originals must remain in the repository");
});

test("power-flex catalogue entries are model-specific, unique and exclude Samsung", () => {
  const flexes = products.filter(product => product.itemType === "power-flex");
  assert.ok(flexes.length > 0, "expected verified power/volume flex entries");
  assert.equal(new Set(flexes.map(product => product.id)).size, flexes.length, "power-flex IDs must be unique");
  assert.ok(flexes.every(product => product.brand !== "Samsung"), "Samsung flexes are excluded from this audit");
  assert.ok(flexes.every(product => product.model && /flex|cable/i.test(product.description)), "every flex entry must name its handset and describe the flex or cable");
  assert.ok(!flexes.some(product => product.id.includes("pouvoir-2")), "a volume-only source must not be presented as a confirmed power/volume flex");
});

test("power-flex supplier photos are local and linked to their exact supplier listing", () => {
  const flexesWithPhotos = products.filter(product => product.itemType === "power-flex" && product.image);
  assert.equal(flexesWithPhotos.length, 14, "only supplier photos tied to exact handset variants are added");
  for (const product of flexesWithPhotos) {
    assert.ok(product.photoSource?.startsWith("https://phonexperts.ng/product/"), `${product.id} needs its supplier source URL`);
    assert.ok(fs.existsSync(path.resolve(__dirname, "..", product.image)), `${product.id} image must exist locally`);
  }
  for (const id of ["tecno-camon-20-pro-power-flex", "tecno-pop-5-pro-power-flex", "tecno-pop-6-go-power-flex", "iphone-14-pro-max-power-flex"]) {
    const product = flexesWithPhotos.find(item => item.id === id);
    assert.ok(product?.imageAlt, `${id} needs an alt label identifying the supplier reference photo`);
  }
});

const ENV = {
  INQUIRY_ENABLED: "true",
  RESEND_API_KEY: "re_test_key",
  INQUIRY_TO: "shop@example.org",
  INQUIRY_FROM: "website@verified.example.org"
};

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function makeRequest(overrides = {}) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "123e4567-e89b-42d3-a456-426614174000" },
    body: {
      item: "USB-C charger",
      model: "Phone model 12",
      details: "Black, if available",
      name: "Sam",
      contact: "+234 801 234 5678",
      website: ""
    },
    ...overrides
  };
}

test("rejects unsupported methods", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("rejects non-JSON submissions", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "text/plain" } }), res);
  assert.equal(res.statusCode, 415);
});

test("rejects oversized requests before parsing", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "application/json", "content-length": "9000" } }), res);
  assert.equal(res.statusCode, 413);
});

test("rejects malformed and non-object JSON bodies without calling provider", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });

  for (const body of ["{invalid", "null", "[]"]) {
    const res = mockResponse();
    await handler(makeRequest({ body }), res);
    assert.equal(res.statusCode, 400, `body ${JSON.stringify(body)} should be rejected`);
    assert.equal(called, false);
  }
});

test("rejects invalid contact details without calling provider", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, contact: "not a contact" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("rejects missing item and fields beyond their limits without calling provider", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const base = makeRequest().body;
  const invalidBodies = [
    { ...base, item: " " },
    { ...base, model: "m".repeat(121) },
    { ...base, details: "d".repeat(1201) },
    { ...base, name: "n".repeat(101) },
    { ...base, contact: "c".repeat(161) }
  ];

  for (const body of invalidBodies) {
    const res = mockResponse();
    await handler(makeRequest({ body }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
  }
});

test("returns not configured and never claims delivery", async () => {
  let called = false;
  const handler = createHandler({ env: {}, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, undefined);
  assert.equal(called, false);
});

test("keeps delivery disabled unless the explicit enable flag is true", async () => {
  let called = false;
  const handler = createHandler({ env: { ...ENV, INQUIRY_ENABLED: "false" }, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, undefined);
  assert.equal(called, false);
});

test("honeypot submission is rejected before email", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, website: "spam" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("sends safe text email and returns success only with provider message ID", async () => {
  let sent;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ id: "email_123" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(sent.url, "https://api.resend.com/emails");
  assert.equal(sent.body.to[0], ENV.INQUIRY_TO);
  assert.equal(sent.body.reply_to, undefined);
  assert.match(sent.body.text, /USB-C charger/);
  assert.match(sent.options.headers.Authorization, /^Bearer re_test_key$/);
});

test("uses customer email as reply-to only when it is a valid email", async () => {
  let sent;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: "email_456" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, contact: "customer@example.net" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.reply_to, "customer@example.net");
});

test("provider error does not return success or expose provider response", async () => {
  const handler = createHandler({
    env: ENV,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: "secret provider detail" }) })
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
  assert.doesNotMatch(res.body.message, /secret provider detail/);
});

test("network failure returns an error without claiming the request was sent", async () => {
  const handler = createHandler({ env: ENV, fetchImpl: async () => { throw new Error("private network detail"); } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
  assert.doesNotMatch(res.body.message, /private network detail/);
});

test("provider acceptance without message ID does not return success", async () => {
  const handler = createHandler({
    env: ENV,
    fetchImpl: async () => ({ ok: true, json: async () => ({}) })
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
});

test("uses a validated idempotency key for provider retries", async () => {
  let sentHeaders;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (_url, options) => {
      sentHeaders = options.headers;
      return { ok: true, json: async () => ({ id: "email_retry" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sentHeaders["Idempotency-Key"], "obest-inquiry-123e4567-e89b-42d3-a456-426614174000");
});

test("repeated submissions with the same key reuse the provider idempotency key", async () => {
  const providerKeys = [];
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (_url, options) => {
      providerKeys.push(options.headers["Idempotency-Key"]);
      return { ok: true, json: async () => ({ id: "email_deduplicated" }) };
    }
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = mockResponse();
    await handler(makeRequest(), res);
    assert.equal(res.statusCode, 200);
  }

  assert.deepEqual(providerKeys, [
    "obest-inquiry-123e4567-e89b-42d3-a456-426614174000",
    "obest-inquiry-123e4567-e89b-42d3-a456-426614174000"
  ]);
});

test("rejects malformed idempotency keys", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "application/json", "idempotency-key": "not-a-uuid" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});
