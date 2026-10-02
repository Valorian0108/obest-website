import { createReadStream, existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { getCliClient } from "sanity/cli";
import { fileURLToPath } from "node:url";

type LegacyProduct = {
  id: string;
  name: string;
  category: string;
  itemType: string;
  description: string;
  icon?: string;
  image?: string;
  imageAlt?: string;
  photoSource?: string;
  source?: string;
  brand?: string;
  model?: string;
  capacity?: string;
  output?: string;
  details?: string;
  availability?: string;
  batch?: number;
};

async function main() {
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDirectory, "../..");
const productsSource = readFileSync(resolve(projectRoot, "products.js"), "utf8")
  .replace("window.OBEST_PRODUCTS =", "globalThis.OBEST_PRODUCTS =");
const sourceContext: { OBEST_PRODUCTS?: LegacyProduct[] } = {};
new Function("globalThis", productsSource)(sourceContext);
const products = sourceContext.OBEST_PRODUCTS ?? [];
const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
const validCategories = new Set(["power", "audio", "computing", "wearables", "home", "parts"]);
const itemTypesByCategory: Record<string, Set<string>> = {
  power: new Set(["power-banks", "chargers", "cables"]),
  audio: new Set(["earbuds", "headphones"]),
  computing: new Set(["mice"]),
  wearables: new Set(["smartwatches"]),
  home: new Set(["fans", "cookers", "vacuum-cleaners"]),
  parts: new Set(["phone-screens", "power-flex"]),
};
const validIcons = new Set([
  "case", "bank", "cable", "charger", "cooker", "earbuds", "fan", "flex",
  "headphones", "mouse", "screenpart", "vacuum", "watch",
]);
if (client.config().projectId !== "ese1smjb" || client.config().dataset !== "production") {
  throw new Error("Refusing to migrate: CLI project/dataset do not match O-BEST production configuration.");
}

const dryRun = process.argv.includes("--dry-run") || process.env.OBEST_MIGRATION_DRY_RUN === "yes";

if (products.length !== 130 || new Set(products.map((product) => product.id)).size !== products.length) {
  throw new Error(`Refusing migration: expected the complete set of 130 uniquely identified catalogue records; found ${products.length}.`);
}

const invalidProducts = products.filter((product) => {
  const optionalLengths = [
    [product.brand, 100], [product.model, 160], [product.capacity, 100],
    [product.output, 160], [product.details, 500], [product.imageAlt, 240],
  ];
  const validUrls = [product.source, product.photoSource].every((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });
  return !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id)
    || !product.name?.trim() || product.name.length > 160
    || !product.description?.trim() || product.description.length > 600
    || !validCategories.has(product.category)
    || !itemTypesByCategory[product.category]?.has(product.itemType)
    || (product.availability && !["check", "available", "unavailable"].includes(product.availability))
    || (product.icon && !validIcons.has(product.icon))
    || optionalLengths.some(([value, limit]) => value && value.length > limit)
    || !validUrls;
});
if (invalidProducts.length) {
  throw new Error(`Refusing migration: invalid product records: ${invalidProducts.map((product) => product.id || "(missing id)").join(", ")}`);
}

const missing = products.filter((product) => {
  if (!product.image) return false;
  const absolutePath = resolve(projectRoot, product.image);
  const assetPath = relative(resolve(projectRoot, "assets"), absolutePath);
  const escapesAssets = assetPath === ".." || assetPath.startsWith(`..${sep}`) || isAbsolute(assetPath);
  return escapesAssets || !existsSync(absolutePath);
});
if (missing.length) {
  throw new Error(`Invalid or missing catalogue photos (only existing files under assets/ are allowed): ${missing.map((product) => product.image).join(", ")}`);
}

const imagePaths = products.filter((product) => product.image).map((product) => resolve(projectRoot, product.image!));
if (imagePaths.length !== 121) {
  throw new Error(`Refusing migration: expected 121 referenced catalogue photos; found ${imagePaths.length}.`);
}
if (new Set(imagePaths).size !== imagePaths.length) {
  throw new Error("Refusing migration: multiple products reference the same photo path.");
}

if (dryRun) {
  console.log("Dry run only; no Sanity documents or assets were written.");
  console.log(`Project/dataset: ${client.config().projectId}/${client.config().dataset}`);
  console.log(`Validated products: ${products.length}`);
  console.log(`Validated referenced photos: ${imagePaths.length}`);
  process.exit(0);
}

if (process.env.OBEST_CONFIRM_CATALOGUE_IMPORT !== "yes") {
  throw new Error("Import is disabled by default. Review the validated dry-run output, then explicitly set OBEST_CONFIRM_CATALOGUE_IMPORT=yes to approve writes to the public production dataset.");
}

const existingProducts = await client.fetch<{ _id: string }[]>('*[_type == "product"]{_id}');
if (existingProducts.length > 0) {
  throw new Error(`Refusing to import into a non-empty product dataset (${existingProducts.length} product records found). This migration will not overwrite or duplicate existing content.`);
}

console.log(`Importing all ${products.length} catalogue records to ${client.config().projectId}/${client.config().dataset}.`);
console.log(`Only the ${products.filter((product) => product.image).length} photos referenced by these records will be uploaded.`);

const documents: Record<string, unknown>[] = [];
let uploadedImages = 0;
for (const [index, product] of products.entries()) {
  const fields: Record<string, unknown> = {
    _id: `product-${product.id}`,
    _type: "product",
    name: product.name,
    slug: { _type: "slug", current: product.id },
    category: product.category,
    itemType: product.itemType,
    description: product.description,
    availability: product.availability ?? (product.itemType === "phone-screens" ? "available" : "check"),
    icon: product.icon ?? "case",
    brand: product.brand,
    model: product.model,
    capacity: product.capacity,
    output: product.output,
    details: product.details,
    source: product.source,
    photoSource: product.photoSource,
    legacyBatch: product.batch,
  };

  if (product.image) {
    const imageAsset = await client.assets.upload(
      "image",
      createReadStream(resolve(projectRoot, product.image)),
      { filename: product.image.split(/[\\/]/).at(-1) },
    );
    uploadedImages += 1;
    fields.image = {
      _type: "image",
      asset: { _type: "reference", _ref: imageAsset._id },
      ...(product.imageAlt ? { alt: product.imageAlt } : {}),
    };
  }

  documents.push(fields);
  console.log(`[${index + 1}/${products.length}] Prepared ${product.id}`);
}

// Recheck immediately before the atomic commit so a concurrent/manual Studio
// entry cannot be overwritten or mixed with a partial migration.
const productsBeforeCommit = await client.fetch<number>('count(*[_type == "product"])');
if (productsBeforeCommit !== 0) {
  throw new Error(`Refusing to commit because ${productsBeforeCommit} product records now exist.`);
}

const transaction = client.transaction();
for (const document of documents) transaction.create(document);
await transaction.commit();

console.log(`Import complete: ${documents.length} products and ${uploadedImages} referenced product photos.`);
console.log("Review them in Sanity Studio before connecting or publishing the website.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
