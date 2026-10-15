import { getCliClient } from "sanity/cli";

async function main() {
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const products = await client.fetch<
    { _id: string; name: string; availability?: string; itemType?: string }[]
  >('*[_type == "product"]{_id, name, availability, itemType}');

  const counts = new Map<string, number>();
  for (const product of products) {
    const key = `${product.availability || "(unset)"}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  console.log("Availability counts:");
  for (const [key, value] of [...counts.entries()].sort()) console.log(`  ${key}: ${value}`);

  const typeCounts = new Map<string, number>();
  for (const product of products) {
    const key = `${product.itemType || "(unset)"} / ${product.availability || "(unset)"}`;
    typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
  }
  console.log("ItemType/availability counts:");
  for (const [key, value] of [...typeCounts.entries()].sort()) console.log(`  ${key}: ${value}`);

  const samsung = products.filter((product) => /samsung/i.test(product.name));
  console.log(`Samsung-named products: ${samsung.length}`);
  for (const product of samsung) {
    console.log(`  [${product.availability || "(unset)"}] ${product.itemType || "?"} :: ${product.name}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
