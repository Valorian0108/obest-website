const researchScreens = require("./lucent-screen-research.json")
  .filter(screen => !/note-3-mini/i.test(screen.id));
const { API_VERSION, DATASET, PROJECT_ID, normalizeProduct } = require("./catalogue.js");

const SITE_ORIGIN = "https://www.obestlink.com";
const STATIC_URLS = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/catalog.html`,
  `${SITE_ORIGIN}/guides.html`,
  `${SITE_ORIGIN}/charging-guide.html`,
  `${SITE_ORIGIN}/charging-port-guide.html`,
  `${SITE_ORIGIN}/about.html`,
  `${SITE_ORIGIN}/request.html`,
  `${SITE_ORIGIN}/privacy.html`,
];
const MAX_PRODUCTS = 49000;
const MAX_PRODUCT_RESULTS = MAX_PRODUCTS + 1;
const PRODUCT_QUERY = `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))] | order(slug.current asc)[0...${MAX_PRODUCT_RESULTS}] {
  "id": slug.current,
  name,
  category,
  itemType,
  description
}`;

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

function createHandler({ fetchImpl = (...args) => fetch(...args) } = {}) {
  return async function sitemapHandler(req, res) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.setHeader("Cache-Control", "no-store");
      return res.status(405).send("Use GET to read the sitemap.");
    }

    const endpoint = new URL(
      `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`,
    );
    endpoint.searchParams.set("query", PRODUCT_QUERY);

    try {
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Catalogue request failed.");
      const payload = await response.json();
      if (!Array.isArray(payload?.result)) throw new Error("Invalid catalogue response.");
      if (payload.result.length > MAX_PRODUCTS) throw new Error("Product sitemap limit reached; split the sitemap before publishing more products.");

      const productIds = payload.result
        .map(normalizeProduct)
        .filter(Boolean)
        .map(product => product.id)
        .filter(id => !/note-3-mini/i.test(id));
      const urls = [...new Set([
        ...STATIC_URLS,
        ...productIds.map(id => `${SITE_ORIGIN}/product/${encodeURIComponent(id)}`),
        ...researchScreens.map(screen => `${SITE_ORIGIN}/product/${encodeURIComponent(screen.id)}`),
      ])];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;

      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=1800");
      return res.status(200).send(xml);
    } catch {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(503).send("The sitemap is temporarily unavailable.");
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.escapeXml = escapeXml;
module.exports.PRODUCT_QUERY = PRODUCT_QUERY;
module.exports.STATIC_URLS = STATIC_URLS;
