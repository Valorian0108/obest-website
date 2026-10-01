const test = require("node:test");
const assert = require("node:assert/strict");
const { createHandler } = require("../api/request.js");

const ENV = {
  INQUIRY_ENABLED: "true",
  RESEND_API_KEY: "re_test_key",
  INQUIRY_TO: "shop@example.org",
  INQUIRY_FROM: "website@verified.example.org"
};

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function makeRequest(overrides = {}) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "123e4567-e89b-42d3-a456-426614174000" },
    body: {
      item: "USB-C charger",
      model: "Phone model 12",
      details: "Black, if available",
      name: "Sam",
      contact: "+234 801 234 5678",
      website: ""
    },
    ...overrides
  };
}

test("rejects unsupported methods", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("rejects non-JSON submissions", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "text/plain" } }), res);
  assert.equal(res.statusCode, 415);
});

test("rejects oversized requests before parsing", async () => {
  const handler = createHandler({ env: ENV });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "application/json", "content-length": "9000" } }), res);
  assert.equal(res.statusCode, 413);
});

test("rejects invalid contact details without calling provider", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, contact: "not a contact" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("returns not configured and never claims delivery", async () => {
  let called = false;
  const handler = createHandler({ env: {}, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, undefined);
  assert.equal(called, false);
});

test("keeps delivery disabled unless the explicit enable flag is true", async () => {
  let called = false;
  const handler = createHandler({ env: { ...ENV, INQUIRY_ENABLED: "false" }, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, undefined);
  assert.equal(called, false);
});

test("honeypot submission is rejected before email", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, website: "spam" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("sends safe text email and returns success only with provider message ID", async () => {
  let sent;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ id: "email_123" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(sent.url, "https://api.resend.com/emails");
  assert.equal(sent.body.to[0], ENV.INQUIRY_TO);
  assert.equal(sent.body.reply_to, undefined);
  assert.match(sent.body.text, /USB-C charger/);
  assert.match(sent.options.headers.Authorization, /^Bearer re_test_key$/);
});

test("uses customer email as reply-to only when it is a valid email", async () => {
  let sent;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: "email_456" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest({ body: { ...makeRequest().body, contact: "customer@example.net" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.reply_to, "customer@example.net");
});

test("provider error does not return success or expose provider response", async () => {
  const handler = createHandler({
    env: ENV,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: "secret provider detail" }) })
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
  assert.doesNotMatch(res.body.message, /secret provider detail/);
});

test("network failure returns an error without claiming the request was sent", async () => {
  const handler = createHandler({ env: ENV, fetchImpl: async () => { throw new Error("private network detail"); } });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
  assert.doesNotMatch(res.body.message, /private network detail/);
});

test("provider acceptance without message ID does not return success", async () => {
  const handler = createHandler({
    env: ENV,
    fetchImpl: async () => ({ ok: true, json: async () => ({}) })
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, undefined);
});

test("uses a validated idempotency key for provider retries", async () => {
  let sentHeaders;
  const handler = createHandler({
    env: ENV,
    fetchImpl: async (_url, options) => {
      sentHeaders = options.headers;
      return { ok: true, json: async () => ({ id: "email_retry" }) };
    }
  });
  const res = mockResponse();
  await handler(makeRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sentHeaders["Idempotency-Key"], "obest-inquiry-123e4567-e89b-42d3-a456-426614174000");
});

test("rejects malformed idempotency keys", async () => {
  let called = false;
  const handler = createHandler({ env: ENV, fetchImpl: async () => { called = true; } });
  const res = mockResponse();
  await handler(makeRequest({ headers: { "content-type": "application/json", "idempotency-key": "not-a-uuid" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});
