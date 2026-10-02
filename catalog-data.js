(() => {
  const endpoint = "/api/catalogue";

  window.OBEST_PRODUCTS_READY = fetch(endpoint, {
    headers: { Accept: "application/json" },
    mode: "cors",
    cache: "no-cache",
    signal: AbortSignal.timeout(12000),
  }).then(async response => {
    if (!response.ok) throw new Error(`Catalogue service responded with ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.result)) throw new Error("Catalogue service returned an invalid product list.");
    if (payload.result.length) return payload.result;
    return window.OBEST_PRODUCTS || [];
  }).catch(error => {
    if (Array.isArray(window.OBEST_PRODUCTS) && window.OBEST_PRODUCTS.length) {
      console.warn("Sanity catalogue unavailable; showing the last bundled catalogue until it can be refreshed.");
      return window.OBEST_PRODUCTS;
    }
    throw error;
  });
})();
