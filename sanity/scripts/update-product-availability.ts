import { getCliClient } from "sanity/cli";

type Product = { _id: string; name: string; itemType?: string; availability?: string };

const args = process.argv.slice(2);
const confirm = args.includes("--confirm-production");
// Samsung screen assemblies are excluded from the blanket "available" marking by default.
// --samsung=available includes them; --samsung=check also downgrades any Samsung screen currently marked available back to "check".
const samsungMode = args.find((arg) => arg.startsWith("--samsung="))?.split("=")[1] || "keep";
if (!["keep", "check", "available"].includes(samsungMode)) {
  throw new Error("Use --samsung=keep, --samsung=check or --samsung=available.");
}

async function main() {
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const config = client.config();
  if (config.projectId !== "ese1smjb" || config.dataset !== "production") {
    throw new Error(`Refusing update against ${config.projectId}/${config.dataset}; expected O-BEST production.`);
  }

  const products = await client.fetch<Product[]>('*[_type == "product"]{_id, name, itemType, availability}');
  const isSamsungScreen = (product: Product) => /samsung/i.test(product.name);

  const updates: { id: string; name: string; from?: string; to: string }[] = [];
  for (const product of products) {
    if (isSamsungScreen(product) && samsungMode !== "available") {
      if (samsungMode === "check" && product.availability === "available") {
        updates.push({ id: product._id, name: product.name, from: product.availability, to: "check" });
      }
      continue;
    }
    if (product.availability !== "available") {
      updates.push({ id: product._id, name: product.name, from: product.availability, to: "available" });
    }
  }

  const samsungKept = products.filter((product) => isSamsungScreen(product) && product.availability === "available").length;
  console.log(`Target: ${config.projectId}/${config.dataset}`);
  console.log(`Products: ${products.length}; Samsung screens: ${products.filter(isSamsungScreen).length} (currently available: ${samsungKept}, samsung mode: ${samsungMode}).`);
  console.log(`Planned availability updates: ${updates.length}`);
  for (const update of updates) {
    console.log(`- ${update.name}: ${update.from || "(unset)"} -> ${update.to}`);
  }
  if (!confirm) {
    console.log("Preview only; nothing was written. Add --confirm-production to apply.");
    return;
  }
  if (!updates.length) {
    console.log("Nothing to update.");
    return;
  }

  const transaction = client.transaction();
  for (const update of updates) {
    transaction.patch(update.id, { set: { availability: update.to } });
  }
  await transaction.commit();

  const verified = await client.fetch<{ _id: string }[]>(
    '*[_type == "product" && availability == "available"]{_id}',
  );
  const expectedAvailable = samsungMode === "available"
    ? products.length
    : products.filter((product) => !isSamsungScreen(product)).length
      + (samsungMode === "keep" ? samsungKept : 0);
  if (verified.length !== expectedAvailable) {
    throw new Error(`Verification mismatch: ${verified.length} available products, expected ${expectedAvailable}.`);
  }
  console.log(`Applied and verified: ${verified.length} products now marked available.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
