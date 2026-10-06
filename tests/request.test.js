const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHandler } = require("../api/request.js");
const { createHandler: createCatalogueHandler, normalizeProduct } = require("../api/catalogue.js");
const { createHandler: createProductPageHandler } = require("../api/product.js");
const { createHandler: createSitemapHandler, STATIC_URLS } = require("../api/sitemap.js");
const lucentScreens = require("../api/lucent-screen-research.json");

const productsContext = {};
vm.runInNewContext(fs.readFileSync(require.resolve("../products.js"), "utf8").replace("window.OBEST_PRODUCTS =", "globalThis.OBEST_PRODUCTS ="), productsContext);
const products = Array.from(productsContext.OBEST_PRODUCTS);

test("catalogue product IDs are unique and referenced images exist", () => {
  const ids = products.map(product => product.id);
  assert.equal(new Set(ids).size, ids.length, "product IDs must be unique");
  const missingImages = products.filter(product => product.image && !fs.existsSync(path.resolve(__dirname, "..", product.image)));
  assert.deepEqual(missingImages.map(product => product.image), []);
});

test("homepage hero uses one responsive illustration without a rotating gallery", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const hero = html.match(/<picture class="hero-photo-stage">([\s\S]*?)<\/picture>/)?.[1];
  assert.ok(hero, "the hero should use a responsive picture element");
  const images = [...hero.matchAll(/<img\b([^>]*)>/g)].map(match => match[1]);
  const sources = [...hero.matchAll(/<source\b([^>]*)>/g)].map(match => match[1]);
  assert.equal(images.length, 1, "show exactly one homepage hero image");
  assert.equal(sources.length, 2, "offer modern formats with a JPEG fallback");
  assert.match(sources[0], /type="image\/avif"/);
  assert.match(sources[1], /type="image\/webp"/);
  for (const source of sources) {
    assert.match(source, /srcset="[^"]+"/);
    assert.match(source, /sizes="[^"]+"/);
    for (const imagePath of source.match(/srcset="([^"]+)"/)[1].matchAll(/(?:^|,\s*)(\S+)/g)) {
      assert.ok(fs.existsSync(path.join(root, imagePath[1])), `${imagePath[1]} must exist`);
    }
  }
  assert.match(images[0], /src="assets\/homepage\/5b2bf1320031a265aa13b414ed625ef0\.jpg"/);
  assert.match(images[0], /width="740"\s+height="495"/);
  assert.match(images[0], /alt="AI-generated illustration of a person smiling and pointing at a smartphone"/);
  assert.match(images[0], /fetchpriority="high"/);
  assert.match(html, /og:image" content="https:\/\/www\.obestlink\.com\/assets\/homepage\/5b2bf1320031a265aa13b414ed625ef0\.jpg/);
  assert.doesNotMatch(html, /data-gallery-|hero-photo-controls|\/ 14/);
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(styles, /\.hero-photo-frame\{[^}]*aspect-ratio:740\/495[^}]*padding:10px/);
  assert.match(styles, /\.hero-photo\{[^}]*object-fit:contain/);
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.doesNotMatch(app, /data-hero-gallery|data-gallery-previous|data-gallery-next|loadSlide|showSlide/);
});

test("product imagery reserves layout space and is promoted for product-page LCP", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(app, /class="product-photo"[^>]*width="800" height="800"[^>]*loading="lazy" decoding="async"/);
  assert.match(app, /const detailImage = detail\.querySelector\("\.product-photo"\);[\s\S]*detailImage\.setAttribute\("fetchpriority", "high"\);[\s\S]*detailImage\.loading = "eager";/);
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(styles, /\.product-art--photo\{[^}]*contain:layout paint/);
  assert.match(styles, /\.detail-art-wrap \.product-art--photo\{[^}]*aspect-ratio:1\/1/);
});

test("Google Fonts load without blocking first paint while site CSS stays render-blocking", () => {
  const root = path.resolve(__dirname, "..");
  const pages = ["index.html", "catalog.html", "guides.html", "charging-guide.html", "charging-port-guide.html", "about.html", "product.html", "request.html", "privacy.html", "404.html"];
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, /href="https:\/\/fonts\.googleapis\.com\/css2\?[^\"]+" rel="stylesheet" media="print" onload="this\.media='all'"/, `${file} should load Google Fonts non-blocking`);
    assert.match(html, /<noscript>\s*<link[^>]+fonts\.googleapis\.com[^>]+rel="stylesheet"/, `${file} should retain fonts when JavaScript is disabled`);
    assert.match(html, /<link rel="stylesheet" href="styles\.css"\s*\/?\s*>/, `${file} should keep the layout stylesheet render-blocking`);
  }
});

test("public stable pages use canonical URLs and specific social metadata", () => {
  const root = path.resolve(__dirname, "..");
  const pages = [
    ["index.html", "https://www.obestlink.com/"],
    ["catalog.html", "https://www.obestlink.com/catalog.html"],
    ["guides.html", "https://www.obestlink.com/guides.html"],
    ["charging-guide.html", "https://www.obestlink.com/charging-guide.html"],
    ["charging-port-guide.html", "https://www.obestlink.com/charging-port-guide.html"],
    ["about.html", "https://www.obestlink.com/about.html"]
  ];

  for (const [file, canonical] of pages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*/?>`), `${file} needs its actual canonical URL`);
    assert.match(html, /<meta property="og:title" content="[^"]+"\s*\/?\s*>/, `${file} needs a specific social title`);
    assert.match(html, /<meta property="og:description" content="[^"]+"\s*\/?\s*>/, `${file} needs a specific social description`);
    assert.match(html, /<meta property="og:image" content="https:\/\/www\.obestlink\.com\/assets\/homepage\/[^"]+"\s*\/?\s*>/, `${file} needs an existing site image for link previews`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?\s*>/);
  }

  const product = fs.readFileSync(path.join(root, "product.html"), "utf8");
  assert.match(product, /<!-- PRODUCT_METADATA -->/, "the server response should inject per-product metadata into the shared shell");
  assert.doesNotMatch(product, /<link rel="canonical"/, "the unselected shared shell must not claim a product canonical URL");
  for (const [file, canonical] of [
    ["request.html", "https://www.obestlink.com/request.html"],
    ["privacy.html", "https://www.obestlink.com/privacy.html"],
  ]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*/?>`), `${file} needs its actual canonical URL`);
    assert.match(html, /<meta property="og:url" content="[^"]+"\s*\/>/, `${file} needs a canonical-matched social URL`);
    assert.match(html, /<meta property="og:title" content="[^"]+"\s*\/>/, `${file} needs a page-specific social title`);
    assert.match(html, /<meta property="og:description" content="[^"]+"\s*\/>/, `${file} needs a useful social description`);
    assert.match(html, /<meta property="og:image" content="https:\/\/www\.obestlink\.com\/assets\/homepage\/[^"]+"\s*\/>/, `${file} needs an existing O-BEST social image`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/>/);
  }
});

test("all site pages use the O-BEST browser-tab favicon", () => {
  const root = path.resolve(__dirname, "..");
  const pages = fs.readdirSync(root).filter(file => file.endsWith(".html") && file !== "google0c1b8f21454b47a6.html");
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/assets\/obest-favicon\.svg"\s*\/?\s*>/, `${page} should point to the shared favicon`);
  }
  const icon = fs.readFileSync(path.join(root, "assets/obest-favicon.svg"), "utf8");
  assert.match(icon, /<circle[^>]+fill="#ffd43b"/);
  assert.match(icon, /fill="#063b82"/);
});

test("mobile product details wrap long values and keep product art within the viewport", () => {
  const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");
  assert.match(styles, /html,body\{overflow-x:clip\}/, "the document should clip accidental horizontal overflow at the root");
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.detail-specs>div\{display:grid;grid-template-columns:minmax\(4\.25rem,\.35fr\) minmax\(0,1fr\)/, "mobile product specs should use bounded label and value tracks");
  assert.match(styles, /\.detail-specs dt,\.detail-specs dd\{min-width:0;overflow-wrap:anywhere\}/, "long model and detail values should wrap instead of widening the row");
  assert.match(styles, /\.detail-art-wrap \.product-art--photo\{width:100%;height:auto;max-height:420px;aspect-ratio:1\/1\}/, "mobile product images should scale to a bounded square");
  assert.match(styles, /\.product-detail,\.product-detail>\*,\.detail-copy,\.detail-art-wrap\{min-width:0\}/, "the product grid and its children should be shrinkable");
});

test("homepage search metadata targets O-BEST's confirmed Iju-Ishaga shop and real offer", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<title>Phone Accessories in Iju-Ishaga, Lagos \| O-BEST<\/title>/);
  assert.match(html, /<meta name="description" content="[^\"]*phone accessories[^\"]*Iju-Ishaga, Lagos[^\"]*Ask us to check availability/);
  assert.match(html, /<meta property="og:title" content="Phone Accessories in Iju-Ishaga, Lagos \| O-BEST"/);
  assert.match(html, /<meta name="twitter:title" content="Phone Accessories in Iju-Ishaga, Lagos \| O-BEST"/);
  assert.match(html, /At O-BEST in Iju-Ishaga, explore phone accessories, charging, audio and selected phone parts/);
});

test("item request offers an optional user-sent WhatsApp draft with privacy disclosure", () => {
  const root = path.resolve(__dirname, "..");
  const request = fs.readFileSync(path.join(root, "request.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const privacy = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(request, /href="https:\/\/wa\.me\/2348105463451\?text=/);
  assert.match(request, /target="_blank" rel="noopener noreferrer">Continue on WhatsApp/);
  assert.match(request, /Nothing is sent until you choose to send it in WhatsApp/);
  assert.match(app, /const updateWhatsappRequestLink = \(\) =>/);
  assert.match(app, /`Item: \$\{item\}`/);
  assert.match(app, /`Device\/model: \$\{model\}`/);
  assert.match(app, /`Details: \$\{details\}`/);
  assert.match(app, /encodeURIComponent\(message\)/);
  assert.match(privacy, /If you choose WhatsApp/);
  assert.match(privacy, /shared with WhatsApp\/Meta and the O-BEST shop account/);
});

test("catalogue API only returns normalized public fields and safe Sanity images", () => {
  const product = normalizeProduct({
    id: "usb-c-cable",
    name: "USB-C cable <script>alert(1)</script>",
    category: "power",
    itemType: "cables",
    description: "A braided cable",
    availability: "available",
    icon: "cable",
    image: "https://cdn.sanity.io/images/ese1smjb/production/example.jpg",
    imageAlt: "Cable",
    secret: "must not be returned",
  });

  assert.equal(product.name, "USB-C cable <script>alert(1)</script>");
  assert.equal(product.categoryName, "Power & charging");
  assert.equal(product.image, "https://cdn.sanity.io/images/ese1smjb/production/example.jpg");
  assert.equal(Object.hasOwn(product, "secret"), false);
  assert.equal(normalizeProduct({ ...product, image: "https://attacker.example/image.jpg" }).image, "");
  assert.equal(normalizeProduct({ ...product, image: "https://cdn.sanity.io/images/another-project/production/example.jpg" }).image, "");
  assert.equal(normalizeProduct({ ...product, availability: "delete-all" }).availability, "check");
  assert.equal(normalizeProduct({ ...product, id: "bad/id" }), null);
  const longId = `sanity-product-${"x".repeat(100)}`;
  assert.equal(normalizeProduct({ ...product, id: longId }).id, longId, "published Sanity slugs up to the route limit should normalize");
});

test("catalogue API is read-only and does not claim success when Sanity is unavailable", async () => {
  const calls = [];
  const handler = createCatalogueHandler({
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return { ok: true, json: async () => ({ result: [{ id: "one", name: "Cable", category: "power", itemType: "cables", description: "Braided cable" }, null] }) };
    },
  });
  const response = mockResponse();
  await handler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.result.length, 1);
  assert.equal(calls[0].url.hostname, "ese1smjb.api.sanity.io");
  assert.equal(calls[0].url.pathname, "/v2025-01-01/data/query/production");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Authorization, undefined);

  const unavailable = createCatalogueHandler({ fetchImpl: async () => { throw new Error("offline"); } });
  const failedResponse = mockResponse();
  await unavailable({ method: "GET" }, failedResponse);
  assert.equal(failedResponse.statusCode, 503);
  assert.deepEqual(failedResponse.body, { message: "The product catalogue is temporarily unavailable." });

  const emptyCatalogue = createCatalogueHandler({ fetchImpl: async () => ({ ok: true, json: async () => ({ result: [] }) }) });
  const emptyResponse = mockResponse();
  await emptyCatalogue({ method: "GET" }, emptyResponse);
  assert.equal(emptyResponse.statusCode, 200);
  assert.deepEqual(emptyResponse.body, { result: [] }, "an empty Sanity response stays empty and never falls back to products.js");
});

test("all product-facing pages load the Sanity catalogue without loading products.js", () => {
  const root = path.resolve(__dirname, "..");
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "catalog.html"), "utf8");
  const product = fs.readFileSync(path.join(root, "product.html"), "utf8");
  for (const [name, html] of [["homepage", home], ["catalogue", catalog], ["product detail", product]]) {
    assert.match(html, /<script src="catalog-data\.js"><\/script>/, `${name} loads the Sanity catalogue`);
    assert.doesNotMatch(html, /<script src="products\.js"><\/script>/, `${name} does not load the legacy product array`);
  }
  assert.ok(fs.existsSync(path.join(root, "api", "catalogue.js")), "catalogue is served by the standard Vercel API route");
});

test("catalogue and product pages render only after Sanity responds and show errors safely", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const catalogBlock = app.slice(app.indexOf("const startCatalog ="), app.indexOf("const detail ="));
  const detailBlock = app.slice(app.indexOf("const renderDetail ="), app.indexOf("const requestForm ="));
  assert.match(catalogBlock, /renderCatalogLoading\(\);\s*window\.OBEST_PRODUCTS_READY\.then\(startCatalog\)\.catch\(error => \{[\s\S]*renderCatalogUnavailable\(\);/);
  assert.doesNotMatch(catalogBlock, /startCatalog\(window\.OBEST_PRODUCTS/);
  assert.match(detailBlock, /window\.OBEST_PRODUCTS_READY\.then\(renderDetail\)\.catch\(error => \{[\s\S]*Product details are temporarily unavailable/);
  assert.doesNotMatch(detailBlock, /renderDetail\(window\.OBEST_PRODUCTS/);
  assert.match(catalogBlock, /detachCatalogListeners\(\);[\s\S]*removeEventListener\("click", onCategoryClick\)/, "refreshing catalogue data should not duplicate event handlers");
  assert.match(detailBlock, /detailImage\.setAttribute\("fetchpriority", "high"\)/, "the early product render should continue to prioritize its primary image");
});

test("catalogue data uses Sanity as its only product source and treats Sanity failures as unavailable", async () => {
  const source = fs.readFileSync(require.resolve("../catalog-data.js"), "utf8");
  const bundled = [{ id: "bundled", name: "Bundled item" }];
  const resolvers = [];
  const context = {
    window: {},
    fetch: () => new Promise(resolve => { resolvers.push(resolve); }),
    AbortSignal: { timeout: () => ({}) },
    console: { warn() {} },
  };
  vm.runInNewContext(source, context);
  assert.equal(resolvers.length, 2, "shop catalogue and research list should load independently");
  resolvers[0]({ ok: true, json: async () => ({ result: [{ id: "fresh", name: "Fresh item" }] }) });
  resolvers[1]({ ok: true, json: async () => ({ result: [{ id: "research", name: "Research item", image: "https://example.org/screen.webp" }] }) });
  const refreshed = await context.window.OBEST_PRODUCTS_REFRESH;
  assert.equal(refreshed[0].id, "fresh");
  assert.equal(refreshed[1].id, "research");
  assert.equal(refreshed[1].researchImage, "https://example.org/screen.webp");
  assert.equal(refreshed[1].researchListing, true);
  assert.equal(context.window.OBEST_PRODUCTS, undefined, "Sanity records should not be copied into a legacy global");

  const partialContext = {
    window: {},
    fetch: async url => url === "/api/catalogue"
      ? { ok: true, json: async () => ({ result: [{ id: "fresh", name: "Fresh item" }] }) }
      : { ok: false, status: 503 },
    AbortSignal: { timeout: () => ({}) },
    console: { warn() {} },
  };
  vm.runInNewContext(source, partialContext);
  assert.deepEqual(Array.from((await partialContext.window.OBEST_PRODUCTS_REFRESH).map(product => product.id)), ["fresh"], "shop inventory should remain available if research data fails");

  const emptyContext = {
    window: {},
    fetch: async url => url === "/api/catalogue"
      ? { ok: true, json: async () => ({ result: [] }) }
      : { ok: true, json: async () => ({ result: [] }) },
    AbortSignal: { timeout: () => ({}) },
    console: { warn() {} },
  };
  vm.runInNewContext(source, emptyContext);
  assert.deepEqual(Array.from(await emptyContext.window.OBEST_PRODUCTS_READY), [], "an empty Sanity catalogue must not revive products.js records");

  const failedContext = {
    window: {},
    fetch: async () => { throw new Error("offline"); },
    AbortSignal: { timeout: () => ({}) },
    console: { warn() {} },
  };
  vm.runInNewContext(source, failedContext);
  await assert.rejects(failedContext.window.OBEST_PRODUCTS_REFRESH, /offline/);
  assert.equal(failedContext.window.OBEST_PRODUCTS, undefined, "Sanity outages must not show a stale products.js catalogue");
  assert.equal(bundled[0].id, "bundled", "the legacy dataset fixture remains unchanged for migration checks");
});

test("Lucent screen review cards are research-only and use linked supplier photos", () => {
  assert.equal(lucentScreens.length, 91);
  assert.deepEqual(
    { tecno: lucentScreens.filter(screen => screen.brand === "TECNO").length, infinix: lucentScreens.filter(screen => screen.brand === "Infinix").length, note: lucentScreens.filter(screen => screen.brand === "Samsung").length },
    { tecno: 40, infinix: 40, note: 11 },
  );
  assert.equal(new Set(lucentScreens.map(screen => screen.id)).size, lucentScreens.length);
  for (const screen of lucentScreens) {
    assert.equal(screen.availability, "check");
    assert.equal(screen.category, "parts");
    assert.equal(screen.itemType, "phone-screens");
    assert.ok(screen.image.startsWith("https://www.lucentparts.com/wp-content/uploads/"));
    assert.equal(screen.photoSource, screen.source);
    assert.match(screen.description, new RegExp(`^Replacement screen assembly labelled for ${screen.brand} ${screen.model}\\. Confirm the full handset model before fitting\\.`));
    assert.match(screen.imageAlt, /^Lucent supplier photo/);
    assert.doesNotMatch(screen.imageAlt, /Unverified/i);
  }
  const unresolvedNote3Mini = lucentScreens.find(screen => /note-3-mini/.test(screen.id));
  assert.ok(unresolvedNote3Mini, "show the Lucent-listed Note 3 Mini entry the user requested");
  assert.match(unresolvedNote3Mini.description, /Listing remains on hold; do not treat as equivalent to Samsung Galaxy Note 3 Neo without part evidence/);
  const api = fs.readFileSync(path.resolve(__dirname, "..", "api", "lucent-screens.js"), "utf8");
  assert.match(api, /filter\(screen => !\/note-3-mini\/i\.test\(screen\.id\)\)/, "the publicly exposed research feed keeps the held Note 3 Mini excluded");
  const app = fs.readFileSync(path.resolve(__dirname, "..", "app.js"), "utf8");
  const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");
  assert.match(api, /req\.method !== "GET"/);
  assert.match(api, /Use GET to read the Lucent research screen list/);
  assert.doesNotMatch(app, /research-photo-label|Lucent supplier photo/);
  assert.doesNotMatch(app, /Supplier photo · unverified|Unverified supplier reference image|Research candidate only—not confirmed shop stock or verified fit/);
  assert.match(styles, /\.product-art--research \.product-photo/);
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

test("product cards use clean URLs while the detail page keeps legacy links working", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const productHtml = fs.readFileSync(path.join(root, "product.html"), "utf8");
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const productRewrite = vercel.rewrites.find(rule => rule.source === "/product/:id");

  assert.match(app, /href="\/product\/\$\{encodeURIComponent\(product\.id\)\}"/);
  assert.ok(app.includes('const pathMatch = location.pathname.match(/^\\/product\\/([^/]+)\\/?$/);'));
  assert.match(app, /new URLSearchParams\(location\.search\)\.get\("id"\)/, "existing ?id=product-id URLs should remain supported");
  assert.match(productHtml, /<base href="\/"\s*\/>/, "clean product routes should resolve page assets from the site root");
  assert.equal(productRewrite?.destination, "/api/product?id=:id");
  assert.ok(fs.existsSync(path.join(root, "api", "product.js")), "clean product URLs should use the HTML metadata function");
  assert.equal(vercel.functions?.["api/product.js"]?.includeFiles, "product.html", "the HTML shell must be included in the Vercel function bundle");
});

test("product URLs render product-specific metadata in the initial HTML response", async () => {
  const root = path.resolve(__dirname, "..");
  const listed = products.find(product => product.id === "hp-s1000-plus-mouse");
  const handler = createProductPageHandler({
    fetchImpl: async url => {
      assert.match(url.searchParams.get("query"), /slug\.current == \$slug/);
      assert.equal(JSON.parse(url.searchParams.get("$slug")), listed.id);
      return { ok: true, json: async () => ({ result: listed }) };
    },
  });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET", query: { id: listed.id } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "text/html; charset=utf-8");
  assert.match(res.body, /<title>HP S1000 Plus Wireless Mouse \| O-BEST<\/title>/);
  assert.match(res.body, /<link rel="canonical" href="https:\/\/www\.obestlink\.com\/product\/hp-s1000-plus-mouse"\s*\/>/);
  assert.match(res.body, /<meta property="og:type" content="product"\s*\/>/);
  const structuredData = res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(structuredData, "the initial product HTML should include JSON-LD");
  const productJsonLd = JSON.parse(structuredData);
  assert.equal(productJsonLd["@context"], "https://schema.org");
  assert.equal(productJsonLd["@type"], "Product");
  assert.equal(productJsonLd.name, listed.name);
  assert.equal(productJsonLd.url, "https://www.obestlink.com/product/hp-s1000-plus-mouse");
  assert.equal(productJsonLd.brand.name, "HP");
  assert.equal(productJsonLd.category, "Computing");
  assert.equal("offers" in productJsonLd, false, "do not add unsupported price or availability claims");
  assert.equal("aggregateRating" in productJsonLd, false, "do not invent product ratings");
  assert.ok((res.body.match(/<meta name="description"/g) || []).length === 1, "emit one page-specific meta description");
  assert.ok(res.body.match(/<meta name="description" content="([^"]*)"/)[1].length <= 180, "keep the product snippet concise");
  assert.equal([...res.body.matchAll(/property="og:type"/g)].length, 1, "the rendered product page should not duplicate its Open Graph type");
  assert.match(res.body, /<meta property="og:title" content="HP S1000 Plus Wireless Mouse \| O-BEST"\s*\/>/);
  assert.match(res.body, /<meta name="twitter:title" content="HP S1000 Plus Wireless Mouse \| O-BEST"\s*\/>/);
  assert.doesNotMatch(res.body, /"offers"\s*:/, "never invent prices or availability offers");
  assert.match(res.body, /<meta property="og:image" content="https:\/\/www\.obestlink\.com\/assets\/homepage\/rgb-wireless-mouse\.jpg"\s*\/>/, "intentional no-photo products should use the general share image");
  assert.doesNotMatch(res.body, /PRODUCT_METADATA|__PRODUCT_/);
});

test("product page metadata HTML-escapes catalogue text and returns 404 for unknown products", async () => {
  const template = fs.readFileSync(path.resolve(__dirname, "..", "product.html"), "utf8");
  const listed = {
    ...products.find(product => product.id === "hp-s1000-plus-mouse"),
    name: 'Mouse <script>alert("x")</script>',
    description: 'Wireless & durable "mouse"',
    image: "https://cdn.sanity.io/images/ese1smjb/production/test-image.jpg",
  };
  const handler = createProductPageHandler({
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: listed }) }),
  });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET", query: { id: listed.id } }, res);
  assert.match(res.body, /Mouse &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; \| O-BEST/);
  assert.doesNotMatch(res.body, /<title>Mouse <script>/);
  assert.match(res.body, /Wireless &amp; durable &quot;mouse&quot;/);
  assert.match(res.body, /cdn\.sanity\.io\/images\/ese1smjb\/production\/test-image\.jpg/);
  const jsonLd = JSON.parse(res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(jsonLd.name, listed.name, "JSON-LD must remain valid even when content contains script-significant characters");
  assert.doesNotMatch(res.body, /<script>alert\("x"\)<\/script>/);

  const missingHandler = createProductPageHandler({ fetchImpl: async () => ({ ok: true, json: async () => ({ result: null }) }) });
  const missing = mockResponse();
  missing.send = function (body) { this.body = body; return this; };
  await missingHandler({ method: "GET", query: { id: "not-a-listed-product" } }, missing);
  assert.equal(missing.statusCode, 404);
  assert.doesNotMatch(missing.body, /rel="canonical"/);
});

test("product page metadata falls back safely when Sanity is unavailable", async () => {
  const handler = createProductPageHandler({ fetchImpl: async () => { throw new Error("upstream unavailable"); } });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET", query: { id: "hp-s1000-plus-mouse" } }, res);

  assert.equal(res.statusCode, 200, "the browser shell should still load and hydrate from bundled/API data");
  assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
  assert.match(res.body, /<title>Product details \| O-BEST<\/title>/);
  assert.doesNotMatch(res.body, /<link rel="canonical"/);
  assert.doesNotMatch(res.body, /property="og:url"/);
});

test("dynamic sitemap lists valid published products, approved research routes, and stable pages", async () => {
  const first = products.find(product => product.id === "hp-s1000-plus-mouse");
  const second = products.find(product => product.id === "infinix-xpower-20");
  const handler = createSitemapHandler({
    fetchImpl: async url => {
      assert.match(url.searchParams.get("query"), /!\(_id in path\("drafts\.\*\*"\)\)/);
      return { ok: true, json: async () => ({ result: [first, second, { ...first, id: "bad slug" }, { ...first, id: "samsung-galaxy-note-3-mini-screen" }] }) };
    },
  });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET" }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "application/xml; charset=utf-8");
  assert.match(res.headers["Cache-Control"], /s-maxage=300/);
  assert.match(res.body, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(res.body, /<\/urlset>\s*$/);
  assert.match(res.body, /https:\/\/www\.obestlink\.com\/catalog\.html/);
  assert.match(res.body, /https:\/\/www\.obestlink\.com\/product\/hp-s1000-plus-mouse/);
  assert.match(res.body, /https:\/\/www\.obestlink\.com\/product\/infinix-xpower-20/);
  assert.match(res.body, /https:\/\/www\.obestlink\.com\/product\/lucent-lcd-assembly-without-frame-compatible-for-tecno-camon-18i-lcd-screen-display/);
  const xmlLocs = [...res.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.ok(xmlLocs.includes("https://www.obestlink.com/request.html"));
  assert.ok(xmlLocs.includes("https://www.obestlink.com/privacy.html"));
  assert.ok(xmlLocs.every(url => url === "https://www.obestlink.com/" || !url.endsWith("/")), "sitemap URLs use their declared canonical forms");
  assert.equal(xmlLocs.filter(url => url.startsWith("https://www.obestlink.com/product/lucent-")).length, 90, "all public Lucent routes should be discoverable except the held Note 3 Mini");
  for (const url of STATIC_URLS) {
    const pathname = new URL(url).pathname;
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    const html = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*/?>`), `${file} canonical must match its sitemap URL`);
  }
  assert.doesNotMatch(res.body, /note-3-mini|bad%20slug|bad slug/);
  assert.equal([...res.body.matchAll(/<loc>/g)].length, new Set([...res.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).size, "URLs should be unique");
});

test("dynamic sitemap fails closed without caching when Sanity is unavailable", async () => {
  const handler = createSitemapHandler({ fetchImpl: async () => { throw new Error("offline"); } });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
  assert.doesNotMatch(res.body, /<urlset/);
});

test("dynamic sitemap rejects unsupported HTTP methods", async () => {
  const handler = createSitemapHandler();
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET");
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("held Note 3 Mini research entry is not exposed as a direct product page", async () => {
  const held = lucentScreens.find(screen => /note-3-mini/i.test(screen.id));
  const handler = createProductPageHandler({ fetchImpl: async () => ({ ok: true, json: async () => ({ result: null }) }) });
  const res = mockResponse();
  res.send = function (body) { this.body = body; return this; };
  await handler({ method: "GET", query: { id: held.id } }, res);
  assert.equal(res.statusCode, 404);
  assert.doesNotMatch(res.body, /Samsung Galaxy Note 3 Mini/);
});

test("published guides include the owner-approved charger checklist and safe loose-port advice", () => {
  const root = path.resolve(__dirname, "..");
  const guides = fs.readFileSync(path.join(root, "guides.html"), "utf8");
  const article = fs.readFileSync(path.join(root, "charging-guide.html"), "utf8");
  const portArticle = fs.readFileSync(path.join(root, "charging-port-guide.html"), "utf8");

  assert.match(guides, /02 GUIDES AVAILABLE/);
  assert.match(guides, /Why does my charging cable feel loose\?/);
  assert.match(guides, /href="charging-port-guide\.html"/);
  assert.doesNotMatch(guides, /Power-bank capacity and output|Phone battery draining quickly|What to check before buying a phone part|Everyday accessory care/);
  assert.match(guides, /class="guide-status-label">GENERAL CHECKLIST</);
  assert.match(guides, /href="charging-guide\.html"/);
  assert.doesNotMatch(guides, /FOR REVIEW|READY FOR REVIEW/);
  assert.doesNotMatch(article, /DRAFT|FOR REVIEW|Editorial status:/);
  assert.match(article, /not a compatibility guarantee/);
  assert.match(article, /Google Pixel Help: Charge your Pixel phone/);

  assert.match(portArticle, /<title>Why does my charging cable feel loose\? \| O-BEST<\/title>/);
  assert.match(portArticle, /a loose connection can be frustrating/i);
  assert.match(portArticle, /Do not scrape inside the port with a pin/);
  assert.match(portArticle, /Turning the phone off does not make inserting a pin safe/);
  assert.match(portArticle, /Apple Support: Important handling information for iPhone/);
  assert.match(portArticle, /qualified technician/);
});

test("SEO routes expose the dynamic sitemap and robots advertise the sitemap endpoint", () => {
  const root = path.resolve(__dirname, "..");
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const catalog = fs.readFileSync(path.join(root, "catalog.html"), "utf8");
  const guides = fs.readFileSync(path.join(root, "guides.html"), "utf8");
  const chargingGuide = fs.readFileSync(path.join(root, "charging-guide.html"), "utf8");
  const portGuide = fs.readFileSync(path.join(root, "charging-port-guide.html"), "utf8");
  const notFound = fs.readFileSync(path.join(root, "404.html"), "utf8");
  assert.ok(vercel.rewrites.some(rule => rule.source === "/sitemap.xml" && rule.destination === "/api/sitemap"));
  assert.equal(vercel.functions?.["api/sitemap.js"]?.includeFiles, "api/lucent-screen-research.json", "the Vercel function bundle must include approved public research routes");
  assert.match(robots, /^Sitemap: https:\/\/www\.obestlink\.com\/sitemap\.xml$/m);
  assert.match(home, /href="catalog\.html"/);
  assert.match(home, /href="guides\.html"/);
  assert.match(catalog, /href="charging-guide\.html"/);
  assert.match(guides, /href="charging-guide\.html"/);
  assert.match(guides, /href="charging-port-guide\.html"/);
  assert.match(chargingGuide, /href="guides\.html"/);
  assert.match(chargingGuide, /href="request\.html\?item=/);
  assert.match(portGuide, /href="guides\.html"/);
  assert.match(portGuide, /href="about\.html#engineer-service"/);
  assert.match(notFound, /<meta name="robots" content="noindex, follow"\s*\/>/, "the not-found route should not be indexed");
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

test("shop-verified screen inventory can use its approved availability status and reduced-motion-aware green pulse", () => {
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

test("shop catalogue phone screens are alphabetized and expose inventory-driven shareable brand filters", () => {
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
  assert.match(styles, /\.category-grid\{grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/, "desktop categories should use deliberate unequal spans");
  assert.match(styles, /@media\(max-width:760px\)\{\s*\.category-section\{[^}]+\}\s*\.category-section \.section-heading\{[^}]+\}\s*\.category-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, "mobile categories should return to a clean two-column layout");
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

test("any retained power-flex photos exist locally and retain their supplier references", () => {
  const flexesWithPhotos = products.filter(product => product.itemType === "power-flex" && product.image);
  for (const product of flexesWithPhotos) {
    assert.ok(product.photoSource?.startsWith("https://phonexperts.ng/product/"), `${product.id} needs its supplier source URL`);
    assert.ok(fs.existsSync(path.resolve(__dirname, "..", product.image)), `${product.id} image must exist locally`);
    assert.ok(product.imageAlt, `${product.id} needs an alt label for its supplier reference photo`);
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
