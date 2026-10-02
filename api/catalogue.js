const PROJECT_ID = "ese1smjb";
const DATASET = "production";
const API_VERSION = "2025-01-01";
const CATEGORY_NAMES = Object.freeze({
  power: "Power & charging",
  audio: "Audio",
  computing: "Computing",
  wearables: "Wearables",
  home: "Home & appliances",
  parts: "Phone parts",
});
const ITEM_TYPES = new Set([
  "power-banks", "chargers", "cables", "earbuds", "headphones", "mice",
  "smartwatches", "fans", "cookers", "vacuum-cleaners", "phone-screens", "power-flex",
]);
const ICONS = new Set([
  "bank", "cable", "charger", "cooker", "earbuds", "fan", "flex",
  "headphones", "mouse", "screenpart", "vacuum", "watch", "case",
]);
const QUERY = `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))] | order(category asc, name asc)[0...300] {
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

function text(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function safeLink(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeProduct(product) {
  if (!product || typeof product !== "object") return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(product.id, 96))) return null;
  if (!text(product.name, 160) || !text(product.description, 600)) return null;
  if (!CATEGORY_NAMES[product.category] || !ITEM_TYPES.has(product.itemType)) return null;

  const image = safeLink(product.image);
  const imageUrl = image ? new URL(image) : null;
  const expectedAssetPrefix = `/images/${PROJECT_ID}/${DATASET}/`;
  const safeImage = imageUrl?.hostname === "cdn.sanity.io" && imageUrl.pathname.startsWith(expectedAssetPrefix)
    ? image
    : "";
  return {
    id: text(product.id, 96),
    name: text(product.name, 160),
    category: product.category,
    categoryName: CATEGORY_NAMES[product.category],
    itemType: product.itemType,
    description: text(product.description, 600),
    availability: ["available", "unavailable", "check"].includes(product.availability) ? product.availability : "check",
    brand: text(product.brand, 100),
    model: text(product.model, 160),
    capacity: text(product.capacity, 100),
    output: text(product.output, 160),
    details: text(product.details, 500),
    source: safeLink(product.source),
    photoSource: safeLink(product.photoSource),
    icon: ICONS.has(product.icon) ? product.icon : "case",
    image: safeImage,
    imageAlt: text(product.imageAlt, 240),
  };
}

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", status === 200
    ? "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
    : "no-store, max-age=0");
  return res.status(status).json(payload);
}

function createHandler({ fetchImpl = (...args) => fetch(...args) } = {}) {
  return async function catalogueHandler(req, res) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { message: "Use GET to read the public product catalogue." });
    }

    const endpoint = new URL(
      `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`,
    );
    endpoint.searchParams.set("query", QUERY);

    try {
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return sendJson(res, 503, { message: "The product catalogue is temporarily unavailable." });
      const payload = await response.json();
      if (!Array.isArray(payload?.result)) return sendJson(res, 503, { message: "The product catalogue is temporarily unavailable." });
      return sendJson(res, 200, { result: payload.result.map(normalizeProduct).filter(Boolean) });
    } catch {
      return sendJson(res, 503, { message: "The product catalogue is temporarily unavailable." });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.normalizeProduct = normalizeProduct;
