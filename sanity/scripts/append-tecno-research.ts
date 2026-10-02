import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCliClient } from "sanity/cli";
import { fileURLToPath } from "node:url";

const projectId = "ese1smjb";
const dataset = "production";
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDirectory, "../..");
const notes = readFileSync(resolve(projectRoot, "TECNO-RESEARCH-BATCH-3.md"), "utf8");
const sections = [...notes.matchAll(/^### TECNO (.+?)\r?\n([\s\S]*?)(?=^### TECNO |^## |$(?![\s\S]))/gm)];
const candidates = new Map<string, Record<string, unknown>>();

for (const section of sections) {
  const title = section[1].trim();
  const body = section[2];
  const id = body.match(/^- \*\*Research ID:\*\* `([^`]+)`/m)?.[1];
  if (!id || !/^tecno-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) continue;

  // Earlier, fuller notes are preferred where the later research log repeats an ID.
  if (candidates.has(id)) continue;
  const compatibility = body.match(/^- \*\*Compatibility status:\*\*\s*(.+)$/m)?.[1]?.trim() ??
    body.match(/^- \*\*Compatibility\/quality:\*\*\s*(.+)$/m)?.[1]?.trim() ??
    "Confirm the handset model code and exact assembly before fitting; no cross-model fit is implied.";
  const caveat = compatibility.replace(/\s+/g, " ").slice(0, 390);
  const model = title.split(" — ")[0].replace(/[()]/g, "").trim();
  const name = `TECNO ${model} Screen Assembly`;
  const description = `Replacement screen assembly listed for ${model}. Match the full handset model code and the exact assembly before fitting. Research note: ${caveat}`.slice(0, 600);

  candidates.set(id, {
    _id: `product-${id}`,
    _type: "product",
    name,
    slug: { _type: "slug", current: id },
    category: "parts",
    itemType: "phone-screens",
    description,
    availability: "available",
    brand: "TECNO",
    model,
    icon: "screenpart",
  });
}

async function main() {
  const token = process.env.SANITY_API_TOKEN;
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false, ...(token ? { token } : {}) });
  const config = client.config();
  if (config.projectId !== projectId || config.dataset !== dataset) {
    throw new Error(`Refusing to proceed against ${config.projectId}/${config.dataset}; expected ${projectId}/${dataset}.`);
  }

  const existing = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && defined(slug.current)]{_id,"slug":slug}',
  );
  const existingSlugs = new Set(existing.map((doc) => doc.slug?.current).filter(Boolean));
  const colliding = [...candidates.keys()].filter((id) => existingSlugs.has(id));
  if (colliding.length) throw new Error(`Refusing to write; these slugs already exist: ${colliding.join(", ")}`);

  console.log(`Target: ${projectId}/${dataset}`);
  console.log(`Unique candidates in research file: ${candidates.size}`);
  console.log(`Existing product documents checked: ${existing.length}`);
  console.log(`Prepared append-only products: ${candidates.size}; availability=available; no supplier images attached.`);
  if (!process.argv.includes("--confirm-production")) {
    console.log("Dry run only. No Sanity documents or assets were written.");
    return;
  }

  const transaction = client.transaction();
  for (const document of candidates.values()) transaction.create(document);
  await transaction.commit();
  const verified = await client.fetch<{ _id: string; slug?: { current?: string } }[]>(
    '*[_type == "product" && slug.current in $ids]{_id,"slug":slug}',
    { ids: [...candidates.keys()] },
  );
  if (verified.length !== candidates.size) {
    throw new Error(`Write committed, but verification returned ${verified.length} of ${candidates.size} requested products.`);
  }
  console.log(`Verified ${verified.length} new product documents in Production.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
