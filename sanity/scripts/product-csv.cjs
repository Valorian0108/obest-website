const headers = [
  "productName", "urlId", "category", "productType", "description", "availability",
  "brand", "model", "capacity", "output", "details", "source", "photoSource", "icon",
];

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      if (cell.length) throw new Error("Unexpected quote inside an unquoted CSV cell.");
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV ends inside a quoted cell.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function slugify(value) {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 128)
    .replace(/-+$/g, "");
}

function parseProductCsv(source, { allowEmpty = false } = {}) {
  const rows = parseCsv(source);
  if (!rows.length) throw new Error("The spreadsheet CSV is empty.");

  const actualHeaders = rows[0].map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim());
  const missingHeaders = headers.filter((header) => !actualHeaders.includes(header));
  const unknownHeaders = actualHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length || unknownHeaders.length || new Set(actualHeaders).size !== actualHeaders.length) {
    const details = [];
    if (missingHeaders.length) details.push(`missing columns: ${missingHeaders.join(", ")}`);
    if (unknownHeaders.length) details.push(`unknown columns: ${unknownHeaders.join(", ")}`);
    if (new Set(actualHeaders).size !== actualHeaders.length) details.push("duplicate column names");
    throw new Error(`Spreadsheet headers are invalid (${details.join("; ")}). Use the provided template.`);
  }

  const column = Object.fromEntries(actualHeaders.map((header, index) => [header, index]));
  const products = rows.slice(1).map((values, rowIndex) => {
    const line = rowIndex + 2;
    const product = Object.fromEntries(headers.map((header) => [header, (values[column[header]] || "").trim()]));
    if (values.length > actualHeaders.length && values.slice(actualHeaders.length).some((value) => value.trim())) {
      throw new Error(`Row ${line} has values beyond the last column.`);
    }
    if (!product.productName) throw new Error(`Row ${line}: productName is required.`);
    if (product.productName.length > 160) throw new Error(`Row ${line}: productName must be 160 characters or fewer.`);
    product.urlId = product.urlId || slugify(product.productName);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.urlId) || product.urlId.length > 128) {
      throw new Error(`Row ${line}: urlId must use lowercase letters, numbers, and hyphens (max 128 characters).`);
    }
    if (!product.description || product.description.length > 600) throw new Error(`Row ${line}: description is required (max 600 characters).`);
    if (!product.category || !product.productType) throw new Error(`Row ${line}: category and productType are required.`);
    if (product.availability && !["check", "available", "unavailable"].includes(product.availability)) {
      throw new Error(`Row ${line}: availability must be check, available, or unavailable.`);
    }
    for (const [field, max] of [["brand", 100], ["model", 160], ["capacity", 100], ["output", 160], ["details", 500]]) {
      if (product[field].length > max) throw new Error(`Row ${line}: ${field} must be ${max} characters or fewer.`);
    }
    for (const field of ["source", "photoSource"]) {
      if (!product[field]) continue;
      let url;
      try { url = new URL(product[field]); } catch { throw new Error(`Row ${line}: ${field} must be a valid HTTP or HTTPS URL.`); }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Row ${line}: ${field} must be a valid HTTP or HTTPS URL.`);
    }
    return { ...product, availability: product.availability || "check", line };
  });

  if (!products.length && !allowEmpty) throw new Error("The spreadsheet has headers but no product rows.");
  const seen = new Set();
  for (const product of products) {
    if (seen.has(product.urlId)) throw new Error(`Rows contain a duplicate urlId: ${product.urlId} (including row ${product.line}).`);
    seen.add(product.urlId);
  }
  return products;
}

module.exports = { headers, parseProductCsv, slugify };
