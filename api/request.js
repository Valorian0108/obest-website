const crypto = require("node:crypto");
const MAX_BODY_BYTES = 8 * 1024;
const MAX_LENGTHS = { item: 120, model: 120, details: 1200, name: 100, contact: 160 };
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]+$/;

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).json(payload);
}

function cleanText(value, maxLength, multiline = false) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n");
  const withoutControls = multiline
    ? normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    : normalized.replace(/[\u0000-\u001F\u007F]/g, " ");
  const trimmed = withoutControls.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

function isEmail(value) {
  return typeof value === "string" && value.length <= 160 && EMAIL_PATTERN.test(value);
}

function validContact(value) {
  if (isEmail(value)) return true;
  if (!PHONE_PATTERN.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function validConfig(env) {
  return Boolean(
    env.INQUIRY_ENABLED === "true" &&
    env.RESEND_API_KEY &&
      env.RESEND_API_KEY.length <= 256 &&
      isEmail(env.INQUIRY_TO) &&
      isEmail(env.INQUIRY_FROM)
  );
}

function isIdempotencyKey(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return null;
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  try {
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) return null;
  } catch {
    return null;
  }
  return body;
}

function createHandler({ fetchImpl = (...args) => fetch(...args), env = process.env } = {}) {
  return async function requestHandler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { message: "Use POST to send an item request." });
    }

    const contentType = req.headers?.["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return sendJson(res, 415, { message: "Please submit the request using the website form." });
    }

    const contentLength = Number(req.headers?.["content-length"] || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return sendJson(res, 413, { message: "Your request is too large. Please shorten the details and try again." });
    }

    const body = parseBody(req);
    if (!body) {
      return sendJson(res, 400, { message: "We couldn’t read the request. Please check the form and try again." });
    }

    // Honeypot field: reject quietly to avoid exposing the spam-control mechanism.
    if (typeof body.website === "string" && body.website.trim()) {
      return sendJson(res, 400, { message: "We couldn’t process this request. Please check the form and try again." });
    }

    const item = cleanText(body.item, MAX_LENGTHS.item);
    const model = cleanText(body.model ?? "", MAX_LENGTHS.model);
    const details = cleanText(body.details ?? "", MAX_LENGTHS.details, true);
    const name = cleanText(body.name ?? "", MAX_LENGTHS.name);
    const contact = cleanText(body.contact, MAX_LENGTHS.contact);

    if (!item || item.length < 2 || model === null || details === null || name === null || !contact || !validContact(contact)) {
      return sendJson(res, 400, { message: "Please check the item and reply-contact fields, then try again." });
    }

    if (!validConfig(env)) {
      return sendJson(res, 503, { message: "The request service isn’t ready yet. Your details were not sent; please try again later." });
    }

    const idempotencyKey = req.headers?.["idempotency-key"];
    if (idempotencyKey !== undefined && !isIdempotencyKey(idempotencyKey)) {
      return sendJson(res, 400, { message: "We couldn’t verify this request. Please refresh the page and try again." });
    }

    const lines = [
      "A customer sent an item request through the O-BEST website.",
      "",
      `Item: ${item}`,
      model ? `Phone/device model: ${model}` : "Phone/device model: Not provided",
      name ? `Name: ${name}` : "Name: Not provided",
      `Reply contact: ${contact}`,
      "",
      "Additional details:",
      details || "None provided"
    ];
    const email = {
      from: `O-BEST Link Communication <${env.INQUIRY_FROM}>`,
      to: [env.INQUIRY_TO],
      subject: "New item request | O-BEST website",
      text: lines.join("\n")
    };
    if (isEmail(contact)) email.reply_to = contact;

    let providerResponse;
    try {
      providerResponse = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `obest-inquiry-${idempotencyKey || crypto.randomUUID()}`
        },
        body: JSON.stringify(email),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      return sendJson(res, 502, { message: "We couldn’t send your request just now. Please try again shortly." });
    }

    if (!providerResponse.ok) {
      return sendJson(res, 502, { message: "We couldn’t send your request just now. Please try again shortly." });
    }

    let providerResult;
    try {
      providerResult = await providerResponse.json();
    } catch {
      providerResult = null;
    }
    if (!providerResult || typeof providerResult.id !== "string" || !providerResult.id) {
      return sendJson(res, 502, { message: "We couldn’t confirm delivery acceptance. Please try again shortly." });
    }

    return sendJson(res, 200, { ok: true });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
