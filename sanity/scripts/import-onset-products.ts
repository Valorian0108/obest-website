import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCliClient } from "sanity/cli";
import { fileURLToPath } from "node:url";

type ManifestProduct = {
  slug: string;
  name: string;
  category: string;
  itemType: string;
  icon: string;
  brand: string;
  model?: string;
  capacity?: string;
  output?: string;
  description: string;
  alt: string;
  image: string;
};

const itemTypesByCategory: Record<string, string[]> = {
  power: ["power-banks", "chargers", "cables"],
  audio: ["earbuds", "headphones", "speakers"],
  computing: ["mice"],
  wearables: ["smartwatches"],
  home: ["fans", "cookers", "vacuum-cleaners", "solar-lights"],
  parts: ["phone-screens", "power-flex"],
};

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const manifest = JSON.parse(
  readFileSync(resolve(projectRoot, "sanity/scripts/onset-products-manifest.json"), "utf8"),
) as { products: ManifestProduct[] };
const args = process.argv.slice(2);

for (const product of manifest.products) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug) || product.slug.length > 128) {
    throw new Error(`Invalid slug ${product.slug}`);
  }
  if (!product.name || product.name.length > 160) throw new Error(`Invalid name on ${product.slug}`);
  if (!product.description || product.description.length > 600) throw new Error(`Invalid description on ${product.slug}`);
  if (!itemTypesByCategory[product.category]?.includes(product.itemType)) {
    throw new Error(`${product.slug}: ${product.itemType} is not a product type in category ${product.category}.`);
  }
  if (product.alt.length > 240) throw new Error(`Alt text too long on ${product.slug}`);
  const imageBytes = readFileSync(resolve(projectRoot, product.image));
  if (imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8) throw new Error(`${product.slug}: image is not a JPEG.`);
}

async function main() {
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const config = client.config();
  if (config.projectId !== "ese1smjb" || config.dataset !== "production") {
    throw new Error(`Refusing import against ${config.projectId}/${config.dataset}; expected O-BEST production.`);
  }

  const existing = await client.fetch<{ _id: string; name: string; slug?: { current?: string } }[]>(
    '*[_type == "product"]{_id, name, "slug": slug.current}',
  );
  const existingSlugs = new Set(existing.map((document) => document.slug?.current).filter(Boolean));
  const existingNames = new Set(existing.map((document) => document.name.trim().toLowerCase()));

  const planned = manifest.products.filter((product) => {
    const duplicate = existingSlugs.has(product.slug) || existingNames.has(product.name.trim().toLowerCase());
    if (duplicate) console.log(`Skipping duplicate already in Sanity: ${product.name}`);
    return !duplicate;
  });

  console.log(`Target: ${config.projectId}/${config.dataset}`);
  console.log(`Manifest products: ${manifest.products.length}; new after duplicate check: ${planned.length}`);
  for (const product of planned) {
    console.log(`- ${product.name} [${product.slug}] · ${product.category}/${product.itemType} · image ${product.image}`);
  }
  if (!args.includes("--confirm-production")) {
    console.log("Preview only; nothing was written. Add --confirm-production to create these products with their photos.");
    return;
  }
  if (!planned.length) {
    console.log("Nothing new to import.");
    return;
  }

  const transaction = client.transaction();
  for (const product of planned) {
    const imageBytes = readFileSync(resolve(projectRoot, product.image));
    const asset = await client.assets.upload("image", imageBytes, {
      filename: product.image.split("/").pop(),
      contentType: "image/jpeg",
    });
    transaction.createIfNotExists({
      _id: `product-${product.slug}`,
      _type: "product",
      name: product.name,
      slug: { _type: "slug", current: product.slug },
      category: product.category,
      itemType: product.itemType,
      description: product.description,
      availability: "check",
      brand: product.brand,
      ...(product.model ? { model: product.model } : {}),
      ...(product.capacity ? { capacity: product.capacity } : {}),
      ...(product.output ? { output: product.output } : {}),
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
        alt: product.alt,
      },
      icon: product.icon,
    });
  }
  await transaction.commit();

  const verified = await client.fetch<{ _id: string }[]>(
    '*[_type == "product" && slug.current in $slugs]{_id}',
    { slugs: planned.map((product) => product.slug) },
  );
  if (verified.length !== planned.length) {
    throw new Error(`Import committed, but verification found ${verified.length} of ${planned.length} products.`);
  }
  console.log(`Imported and verified ${verified.length} products with photos.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
