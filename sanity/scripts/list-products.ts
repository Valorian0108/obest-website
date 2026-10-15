import { getCliClient } from "sanity/cli";

async function main() {
  const client = getCliClient({ apiVersion: "2025-01-01", useCdn: false });
  const products = await client.fetch<{ _id: string; name: string; slug?: { current?: string } }[]>(
    '*[_type == "product"]{_id, name, "slug": slug.current} | order(name asc)',
  );
  console.log(`Total products: ${products.length}`);
  for (const product of products) {
    console.log(`${product.slug?.current || "(no slug)"} :: ${product.name}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
