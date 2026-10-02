const fs = require("node:fs");
const path = require("node:path");
const {
  API_VERSION,
  DATASET,
  PROJECT_ID,
  normalizeProduct,
} = require("./catalogue.js");
const researchScreens = require("./lucent-screen-research.json");

const SITE_ORIGIN = "https://www.obestlink.com";
const FALLBACK_IMAGE = `${SITE_ORIGIN}/assets/homepage/rgb-wireless-mouse.jpg`;
const PRODUCT_QUERY = `*[_type == "product" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  "id": slug.current,
  name,
  category,
  itemType,
  description,
  availability,
  brand,
  model,
  capacity,
  output,
  details,
  source,
  photoSource,
  icon,
  "image": image.asset->url,
  "imageAlt": image.alt
}`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function pageFor(product, template) {
  const title = product ? `${product.name} | O-BEST` : "Product details | O-BEST";
  const description = product
    ? `${product.description} Ask O-BEST to check current availability and confirm exact model fit.`
    : "View product details from O-BEST Link Communication. Ask us to check current availability and confirm details for your device.";
  const canonical = product ? `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}` : "";
  const image = product?.image || product?.researchImage || FALLBACK_IMAGE;
  const imageAlt = product?.image || product?.researchImage ? (product.imageAlt || product.name) : "O-BEST Link Communication product selection";
  if (!product) return template.replace("<!-- PRODUCT_METADATA -->", "");
  const metadata = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="product" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join("");
  return template
    .replace("<title>Product details | O-BEST</title>", `<title>${escapeHtml(title)}</title>`)
    .replace(
      '<meta name="description" content="View product details from O-BEST Link Communication. Ask us to check current availability and confirm details for your device." />',
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      '<meta property="og:type" content="website" /><meta property="og:site_name" content="O-BEST Link Communication" /><meta property="og:title" content="Product details | O-BEST" /><meta property="og:description" content="Browse gadget accessories from O-BEST Link Communication. Ask us to check current availability." /><meta property="og:image" content="https://www.obestlink.com/assets/homepage/rgb-wireless-mouse.jpg" /><meta property="og:image:alt" content="O-BEST Link Communication product selection" />',
      '<meta property="og:site_name" content="O-BEST Link Communication" />',
    )
    .replace(
      '<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Product details | O-BEST" /><meta name="twitter:description" content="Browse gadget accessories from O-BEST Link Communication. Ask us to check current availability." /><meta name="twitter:image" content="https://www.obestlink.com/assets/homepage/rgb-wireless-mouse.jpg" />',
      '<meta name="twitter:card" content="summary_large_image" />',
    )
    .replace("<!-- PRODUCT_METADATA -->", metadata);
}

function createHandler({
  fetchImpl = (...args) => fetch(...args),
  readFileImpl = fs.readFileSync,
} = {}) {
  return async function productHandler(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.setHeader("Cache-Control", "no-store");
      return res.status(405).send("Use GET to read a product page.");
    }

    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 96) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).send("Product not found.");
    }

    let template;
    try {
      template = readFileImpl(path.join(__dirname, "..", "product.html"), "utf8");
    } catch {
      res.setHeader("Cache-Control", "no-store");
      return res.status(500).send("Product page is temporarily unavailable.");
    }

    const endpoint = new URL(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`);
    endpoint.searchParams.set("query", PRODUCT_QUERY);
    endpoint.searchParams.set("$slug", JSON.stringify(id));

    let product = null;
    let catalogueAvailable = true;
    const researchProduct = researchScreens.find(candidate => candidate.id === id);
    if (researchProduct) {
      product = { ...researchProduct, researchImage: researchProduct.image, researchListing: true };
    }
    try {
      if (!product) {
        const response = await fetchImpl(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) throw new Error("Catalogue request failed.");
        const payload = await response.json();
        product = normalizeProduct(payload?.result);
        if (product && product.id !== id) product = null;
      }
    } catch {
      catalogueAvailable = false;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", catalogueAvailable
      ? "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
      : "no-store, max-age=0");
    if (!product && catalogueAvailable) return res.status(404).send(pageFor(null, template));
    return res.status(200).send(pageFor(product, template));
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.pageFor = pageFor;
module.exports.escapeHtml = escapeHtml;
