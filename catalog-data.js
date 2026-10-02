(() => {
  const endpoint = "/api/catalogue";
  const researchEndpoint = "/api/lucent-screens";

  const catalogueRequest = fetch(endpoint, {
    headers: { Accept: "application/json" },
    mode: "cors",
    cache: "no-cache",
    signal: AbortSignal.timeout(12000),
  }).then(async response => {
    if (!response.ok) throw new Error(`Catalogue service responded with ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.result)) throw new Error("Catalogue service returned an invalid product list.");
    return payload.result.length ? payload.result : window.OBEST_PRODUCTS || [];
  }).catch(error => {
    console.warn("Sanity catalogue unavailable; keeping the bundled catalogue.", error);
    return window.OBEST_PRODUCTS || [];
  });

  const researchRequest = fetch(researchEndpoint, {
    headers: { Accept: "application/json" },
    mode: "cors",
    cache: "no-cache",
    signal: AbortSignal.timeout(12000),
  }).then(async response => {
    if (!response.ok) throw new Error(`Research catalogue responded with ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.result)) throw new Error("Research catalogue returned an invalid list.");
    return payload.result.map(screen => ({ ...screen, researchListing: true, researchImage: screen.image }));
  }).catch(error => {
    console.warn("Lucent screen research unavailable; keeping the shop catalogue only.", error);
    return [];
  });

  window.OBEST_PRODUCTS_READY = Promise.all([catalogueRequest, researchRequest]).then(([products, researchScreens]) => [
    ...products,
    ...researchScreens.filter(screen => !products.some(product => product.id === screen.id)),
  ]);

  window.OBEST_PRODUCTS_REFRESH = window.OBEST_PRODUCTS_READY.then(products => {
    window.OBEST_PRODUCTS = products;
    return products;
  }).catch(error => {
    // Preserve a rejected refresh signal if the bundled catalogue is also unavailable.
    throw error;
  });
})();
