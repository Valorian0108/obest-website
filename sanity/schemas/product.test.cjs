const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "products.js"), "utf8"),
  context,
);
const products = Array.from(context.window.OBEST_PRODUCTS);

test("the Sanity product schema preserves every approved listing field", () => {
  const schema = fs.readFileSync(path.join(__dirname, "product.ts"), "utf8");
  for (const field of [
    "name",
    "slug",
    "category",
    "itemType",
    "description",
    "availability",
    "image",
    "brand",
    "model",
    "capacity",
    "output",
    "details",
    "source",
    "photoSource",
    "icon",
    "legacyBatch",
  ]) {
    assert.match(schema, new RegExp(`name: "${field}"`), `${field} is part of the CMS schema`);
  }
});

test("the CMS keeps the site's catalogue taxonomy and availability choices", () => {
  const schema = fs.readFileSync(path.join(__dirname, "product.ts"), "utf8");
  for (const category of new Set(products.map((product) => product.category))) {
    assert.ok(schema.includes(`value: "${category}"`), `${category} category is supported`);
  }
  for (const itemType of new Set(products.map((product) => product.itemType))) {
    assert.ok(schema.includes(`value: "${itemType}"`), `${itemType} type is supported`);
  }
  for (const status of ["check", "available", "unavailable"]) {
    assert.ok(schema.includes(`value: "${status}"`), `${status} availability is supported`);
  }
  const batchOne = products.filter((product) => product.batch === 1);
  assert.equal(batchOne.length, 20, "the current owner-approved batch stays marked separately from the review backlog");
});

test("Studio product previews identify category, type, and availability", () => {
  const schema = fs.readFileSync(path.join(__dirname, "product.ts"), "utf8");
  assert.match(schema, /category: "category"/);
  assert.match(schema, /itemType: "itemType"/);
  assert.match(schema, /availability: "availability"/);
  assert.match(schema, /subtitle: `\$\{categoryTitle\} · \$\{itemTypeTitle\} · \$\{availabilityTitle\}`/);
  assert.match(schema, /title: title \|\| "Untitled product"/);
});

test("product slugs match public route limits and check uniqueness in Sanity Studio", () => {
  const schema = fs.readFileSync(path.join(__dirname, "product.ts"), "utf8");
  assert.match(schema, /maxLength: 128/);
  assert.match(schema, /\.slice\(0, 128\)/);
  assert.match(schema, /isUnique: async \(value, context\)/);
  assert.match(schema, /\*\[_type == "product" && slug\.current == \$slug && !\(_id in \$ids\)\]\[0\]\._id/);
  assert.match(schema, /Keep the product URL ID to 128 characters or fewer/);
});

test("Sanity integration is configured for the owner project and production dataset", () => {
  const config = fs.readFileSync(path.join(root, "sanity.config.ts"), "utf8");
  const cliConfig = fs.readFileSync(path.join(root, "sanity.cli.ts"), "utf8");
  assert.match(config, /projectId: "ese1smjb"/);
  assert.match(config, /dataset: "production"/);
  assert.match(cliConfig, /projectId: "ese1smjb"/);
  assert.match(cliConfig, /dataset: "production"/);
  assert.equal(products.length, 130, "the approved catalogue fixture stays intact");
});

test("catalogue API reads only published, bounded, public Sanity product fields", () => {
  const handler = fs.readFileSync(path.join(root, "api", "catalogue.js"), "utf8");
  assert.match(handler, /PROJECT_ID\}\.api\.sanity\.io/);
  assert.match(handler, /expectedAssetPrefix = `\/images\/\$\{PROJECT_ID\}\/\$\{DATASET\}\/`/);
  assert.doesNotMatch(handler, /cdn\.sanity\.io["`]\)/);
  assert.match(handler, /production/);
  assert.match(handler, /!\(_id in path\("drafts\.\*\*"\)\)/);
  assert.match(handler, /\[0\.\.\.300\]/);
  assert.doesNotMatch(handler, /token|Authorization/i);
});

test("browser catalogue loader calls the same-origin read endpoint with Preview access cookies", () => {
  const dataClient = fs.readFileSync(path.join(root, "catalog-data.js"), "utf8");
  assert.match(dataClient, /const endpoint = "\/api\/catalogue"/);
  assert.doesNotMatch(dataClient, /credentials: "omit"/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts["studio:build"], "sanity build");
});
