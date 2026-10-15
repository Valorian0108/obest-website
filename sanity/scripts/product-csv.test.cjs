const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseProductCsv, slugify } = require("./product-csv.cjs");

const template = fs.readFileSync(path.join(__dirname, "../templates/product-import-template.csv"), "utf8");
const sample = `${template}Example USB-C Cable,,power,cables,USB-C charging cable,check,Example,CB-01,,,,,,cable\n`;

test("spreadsheet rows parse with generated URL ID and safe availability default", () => {
  const [product] = parseProductCsv(sample);
  assert.equal(product.productName, "Example USB-C Cable");
  assert.equal(product.urlId, "example-usb-c-cable");
  assert.equal(product.category, "power");
  assert.equal(product.productType, "cables");
  assert.equal(product.availability, "check");
  assert.equal(slugify("  Éxample Phone / Model 2  "), "example-phone-model-2");
});

test("spreadsheet parser supports quoted commas, quotes, and line breaks", () => {
  const csv = sample.replace("USB-C charging cable", '"USB-C cable, ""fast""\nfor phones"');
  const [product] = parseProductCsv(csv);
  assert.equal(product.description, 'USB-C cable, "fast"\nfor phones');
});

test("spreadsheet parser rejects missing fields, invalid IDs, and duplicate rows", () => {
  assert.throws(() => parseProductCsv(sample.replace("USB-C charging cable", "")), /description is required/);
  assert.throws(() => parseProductCsv(sample.replace(",,power,cables", ",Bad ID,power,cables")), /urlId must use lowercase/);
  assert.throws(() => parseProductCsv(`${sample.trim()}\n${sample.split("\n")[1]}`), /duplicate urlId/);
});

test("spreadsheet parser requires the template's exact set of columns", () => {
  assert.throws(() => parseProductCsv(template.replace("productName", "name")), /headers are invalid/);
  assert.throws(() => parseProductCsv(""), /CSV is empty/);
  assert.throws(() => parseProductCsv(template), /no product rows/);
});
