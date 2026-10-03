import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCliClient } from "sanity/cli";
import { fileURLToPath } from "node:url";

const projectId = "ese1smjb";
const dataset = "production";
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDirectory, "../..");
const screens = JSON.parse(readFileSync(resolve(projectRoot, "api/lucent-screen-research.json"), "utf8")) as Array<Record<string, string>>;
const heldIds = new Set(screens.filter((screen) => /note-3-mini/i.test(screen.id)).map((screen) => screen.id));
const candidates = screens.filter((screen) => !heldIds.has(screen.id));

if (candidates.length !== 90 || new Set(candidates.map((screen) => screen.id)).size !== candidates.length) {
  throw new Error(`Expected 90 unique non-hold research screens; found ${candidates.length}.`);
}

for (const screen of candidates) {
  if (!screen.id || !screen.name || !screen.description || !screen.image || !screen.source) {
    throw new Error(`Incomplete research screen record: ${screen.id || "unknown ID"}`);
  }
  for (const field of [screen.image, screen.source]) {
    const url = new URL(field);
    if (url.protocol !== "https:" || (field === screen.image && url.hostname !== "www.lucentparts.com")) {
      throw new Error(`Unexpected supplier URL on ${screen.id}: ${field}`);
    }
  }
}

async function main() {
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const config = client.config();
  if (config.projectId !== projectId || config.dataset !== dataset) {
    throw new Error(`Refusing to proceed against ${config.projectId}/${config.dataset}; expected ${projectId}/${dataset}.`);
  }

  const existing = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && defined(slug.current)]{_id,"slug":slug}',
  );
  const existingSlugs = new Set(existing.map((doc) => doc.slug?.current).filter(Boolean));
  const collisions = candidates.filter((screen) => existingSlugs.has(screen.id));
  if (collisions.length) throw new Error(`Refusing to write; these product IDs already exist: ${collisions.map((screen) => screen.id).join(", ")}`);

  console.log(`Target: ${projectId}/${dataset}`);
  console.log(`TECNO: ${candidates.filter((screen) => screen.brand === "TECNO").length}; Infinix: ${candidates.filter((screen) => screen.brand === "Infinix").length}; Samsung: ${candidates.filter((screen) => screen.brand === "Samsung").length}`);
  console.log(`Excluded on hold: ${[...heldIds].join(", ")}`);
  console.log(`Prepared append-only product records: ${candidates.length}; availability=Ask us to check; Lucent reference images attached.`);
  if (!process.argv.includes("--confirm-production")) {
    console.log("Dry run only. No Sanity documents or assets were written.");
    return;
  }

  const transaction = client.transaction();
  for (const screen of candidates) {
    const imageResponse = await fetch(screen.image, { signal: AbortSignal.timeout(20000) });
    if (!imageResponse.ok) throw new Error(`Could not fetch image for ${screen.id}: HTTP ${imageResponse.status}`);
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new Error(`Unexpected image size for ${screen.id}: ${bytes.length} bytes`);
    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) throw new Error(`Unexpected image type for ${screen.id}: ${contentType}`);

    const asset = await client.assets.upload("image", bytes, {
      filename: `${screen.id}.${contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"}`,
      contentType,
    });
    transaction.create({
      _id: `product-${screen.id}`,
      _type: "product",
      name: screen.name,
      slug: { _type: "slug", current: screen.id },
      category: "parts",
      itemType: "phone-screens",
      description: screen.description,
      availability: "check",
      brand: screen.brand,
      model: screen.model,
      source: screen.source,
      photoSource: screen.photoSource,
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: screen.imageAlt },
      icon: "screenpart",
    });
  }

  await transaction.commit();
  const verified = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && slug.current in $ids]{_id,"slug":slug}',
    { ids: candidates.map((screen) => screen.id) },
  );
  if (verified.length !== candidates.length) {
    throw new Error(`Write committed, but verification returned ${verified.length} of ${candidates.length} products.`);
  }
  console.log(`Verified ${verified.length} new product documents in Production.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
