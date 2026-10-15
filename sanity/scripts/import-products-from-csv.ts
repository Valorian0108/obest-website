import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { getCliClient } from "sanity/cli";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parseProductCsv } = require("./product-csv.cjs") as {
  parseProductCsv: (source: string, options?: { allowEmpty?: boolean }) => Array<Record<string, string> & { line: number }>;
};
const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const args = process.argv.slice(2);
const fileArgument = args.find((argument) => argument.startsWith("--file="));
const csvPath = resolve(projectRoot, fileArgument?.slice("--file=".length) || "sanity/templates/product-import-template.csv");
const products = parseProductCsv(readFileSync(csvPath, "utf8"), { allowEmpty: true });

const categories: Record<string, string[]> = {
  power: ["power-banks", "chargers", "cables"],
  audio: ["earbuds", "headphones", "speakers"],
  computing: ["mice"],
  wearables: ["smartwatches"],
  home: ["fans", "cookers", "vacuum-cleaners", "solar-lights"],
  parts: ["phone-screens", "power-flex"],
};
const icons = new Set(["case", "bank", "cable", "charger", "cooker", "earbuds", "fan", "flex", "headphones", "mouse", "screenpart", "solarlight", "speaker", "vacuum", "watch"]);
for (const product of products) {
  if (!categories[product.category]?.includes(product.productType)) {
    throw new Error(`Row ${product.line}: ${product.productType} is not a product type in category ${product.category}.`);
  }
  if (product.icon && !icons.has(product.icon)) throw new Error(`Row ${product.line}: unknown icon '${product.icon}'.`);
}

async function main() {
  if (!products.length) {
    console.log(`CSV template: ${csvPath}`);
    console.log("No product rows yet. Add one product per row in the spreadsheet, export it as CSV, and preview that file.");
    return;
  }
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const config = client.config();
  if (config.projectId !== "ese1smjb" || config.dataset !== "production") {
    throw new Error(`Refusing import against ${config.projectId}/${config.dataset}; expected O-BEST production.`);
  }

  const existing = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && defined(slug.current)]{_id,"slug":slug}',
  );
  const existingIds = new Set(existing.map((document) => document.slug?.current).filter(Boolean));
  const collisions = products.filter((product) => existingIds.has(product.urlId));
  if (collisions.length) throw new Error(`Refusing import: these URL IDs already exist: ${collisions.map((product) => product.urlId).join(", ")}`);

  console.log(`CSV: ${csvPath}`);
  console.log(`Target: ${config.projectId}/${config.dataset}`);
  console.log(`Validated new products: ${products.length}`);
  for (const product of products) {
    console.log(`- ${product.productName} [${product.urlId}] · ${product.category}/${product.productType} · availability=${product.availability}`);
  }
  if (!args.includes("--confirm-production")) {
    console.log("Preview only; nothing was written. Add --confirm-production to create these products.");
    return;
  }

  const current = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && slug.current in $slugs]{_id,"slug":slug}',
    { slugs: products.map((product) => product.urlId) },
  );
  if (current.length) throw new Error(`Refusing import: URL IDs appeared before commit: ${current.map((document) => document.slug?.current).join(", ")}`);

  const transaction = client.transaction();
  for (const product of products) {
    transaction.create({
      _id: `product-${product.urlId}`,
      _type: "product",
      name: product.productName,
      slug: { _type: "slug", current: product.urlId },
      category: product.category,
      itemType: product.productType,
      description: product.description,
      availability: product.availability,
      ...(product.brand ? { brand: product.brand } : {}),
      ...(product.model ? { model: product.model } : {}),
      ...(product.capacity ? { capacity: product.capacity } : {}),
      ...(product.output ? { output: product.output } : {}),
      ...(product.details ? { details: product.details } : {}),
      ...(product.source ? { source: product.source } : {}),
      ...(product.photoSource ? { photoSource: product.photoSource } : {}),
      icon: product.icon || "case",
    });
  }
  await transaction.commit();

  const verified = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && slug.current in $slugs]{_id,"slug":slug}',
    { slugs: products.map((product) => product.urlId) },
  );
  if (verified.length !== products.length) {
    throw new Error(`Import committed, but verification found ${verified.length} of ${products.length} products.`);
  }
  console.log(`Imported and verified ${verified.length} products.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
