(() => {
  const categoryNames = { power: "Power & charging", audio: "Audio", protection: "Phone protection", parts: "Phone parts" };
  const itemTypeNames = { "power-banks": "Power banks", chargers: "Chargers", cables: "Cables", earbuds: "Earbuds", headphones: "Headphones" };
  const iconMarkup = (type) => {
    const icons = {
      cable: '<path d="M31 9v8a8 8 0 0 0 16 0V9M35 9V5h8v4M19 33v6a8 8 0 0 0 16 0v-2"/><path d="M15 27h8v9h-8zM43 5h12v8H43z"/>',
      charger: '<rect x="19" y="22" width="28" height="31" rx="7"/><path d="M26 22V9M40 22V9M28 35h10M33 30v10"/>',
      car: '<path d="m12 39 4-14q2-6 8-6h18q6 0 8 6l4 14v10H12zM18 39h32M18 49v5M48 49v5"/><circle cx="21" cy="43" r="3"/><circle cx="45" cy="43" r="3"/>',
      bank: '<rect x="17" y="9" width="32" height="47" rx="8"/><path d="M27 16h12M31 49h4M24 32h18"/>',
      earbuds: '<path d="M21 32V21a8 8 0 0 1 16 0v4M47 32V21a8 8 0 0 0-16 0v4"/><rect x="17" y="29" width="9" height="16" rx="4"/><rect x="43" y="29" width="9" height="16" rx="4"/>',
      headphones: '<path d="M14 36v-7a19 19 0 0 1 38 0v7M14 34h9v17h-9zM43 34h9v17h-9z"/>',
      earpiece: '<path d="M22 21a11 11 0 0 1 22 0v7q0 8-11 11l-4 1v8M31 48h8"/><circle cx="33" cy="22" r="3"/>',
      neckband: '<path d="M17 14v16q0 22 17 22t17-22V14M17 15l-5 9 7 5M51 15l5 9-7 5"/><rect x="12" y="21" width="9" height="9" rx="4"/><rect x="47" y="21" width="9" height="9" rx="4"/>',
      speaker: '<rect x="15" y="10" width="38" height="45" rx="8"/><circle cx="34" cy="34" r="12"/><circle cx="34" cy="34" r="5"/><circle cx="34" cy="19" r="2"/>',
      case: '<rect x="19" y="7" width="30" height="50" rx="7"/><path d="M38 13h6v7h-6zM28 50h12"/>',
      screen: '<rect x="16" y="8" width="36" height="48" rx="5"/><path d="m25 27 7 7 13-14M28 48h12"/>',
      screenpart: '<rect x="18" y="7" width="32" height="49" rx="4"/><path d="m23 13 5 4-4 5 7 5-5 5 8 6-6 6 8 7"/>',
      battery: '<rect x="16" y="17" width="36" height="34" rx="5"/><path d="M27 12h14v5M37 22 27 35h8l-4 11 12-16h-8z"/>',
      board: '<rect x="14" y="13" width="40" height="40" rx="5"/><path d="M22 21h13v10H22zM40 21h7M40 27h7M22 38h24M22 44h12"/><circle cx="44" cy="43" r="3"/>',
      flex: '<path d="M17 18h11q9 0 9 9v8q0 9 9 9h9M17 18v-6M55 44v8M17 18v19q0 9 9 9h5"/><circle cx="17" cy="12" r="3"/><circle cx="55" cy="52" r="3"/>',
      port: '<path d="M17 27h34v14H17zM24 27v-8h20v8M27 41v9M41 41v9M28 34h2M38 34h2"/>'
    };
    return `<svg viewBox="0 0 68 68" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icons[type] || icons.case}</svg>`;
  };
  const cardArt = (product, index = 0) => `<div class="product-art product-art-${index % 4}${product.image ? " product-art--photo" : ""}" ${product.image ? "" : "aria-hidden=\"true\""}>${product.image ? `<img class="product-photo" src="${product.image}" alt="${product.name} packaging and product" loading="lazy" />` : `<span class="product-art-stamp">O-BEST / ${String(index + 1).padStart(2, "0")}</span><div class="product-object object-${product.icon}">${iconMarkup(product.icon)}</div><span class="art-spark">✳</span>`}</div>`;
  const productCard = (product, index) => `<article class="product-card"><a class="product-card-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View item details for ${product.name}">${cardArt(product, index)}<div class="product-card-copy"><p class="product-category">${itemTypeNames[product.itemType] || product.categoryName}</p><h2>${product.name}</h2><p class="product-card-description">${product.description}</p><div class="product-card-bottom"><span class="product-availability"><span class="availability-dot"></span><span>Ask us to check</span></span><span class="card-action-cue">View item details</span></div></div></a></article>`;

  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = reducedMotionQuery.matches;
  const heroCarousel = document.querySelector("[data-hero-carousel]");
  if (heroCarousel) {
    const slides = [...heroCarousel.querySelectorAll(".hero-photo")];
    let activeSlide = 0;
    let intervalId = null;
    let isInView = true;

    const showSlide = index => {
      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === index;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
      activeSlide = index;
    };
    const stopCarousel = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };
    const startCarousel = () => {
      if (intervalId !== null || reducedMotionQuery.matches || document.hidden || !isInView || slides.length < 2) return;
      intervalId = window.setInterval(() => showSlide((activeSlide + 1) % slides.length), 7000);
    };

    if ("IntersectionObserver" in window) {
      const carouselObserver = new IntersectionObserver(entries => {
        isInView = entries.some(entry => entry.isIntersecting);
        if (isInView) startCarousel();
        else stopCarousel();
      }, { threshold: 0.15 });
      carouselObserver.observe(heroCarousel);
    }
    document.addEventListener("visibilitychange", () => document.hidden ? stopCarousel() : startCarousel());
    reducedMotionQuery.addEventListener?.("change", event => event.matches ? stopCarousel() : startCarousel());

    Promise.all(slides.map(slide => slide.decode ? slide.decode().catch(() => null) : Promise.resolve()))
      .then(() => {
        if (slides.every(slide => slide.complete && slide.naturalWidth > 0)) startCarousel();
      });
  }
  const ticker = document.querySelector(".topline");
  const tickerToggle = ticker?.querySelector(".topline-toggle");
  tickerToggle?.addEventListener("click", () => {
    const isPaused = ticker.classList.toggle("is-paused");
    tickerToggle.setAttribute("aria-pressed", String(isPaused));
    tickerToggle.setAttribute("aria-label", isPaused ? "Resume moving brand message" : "Pause moving brand message");
  });

  let revealObserver = null;
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    document.querySelectorAll("main > section:not(.hero):not([hidden])").forEach(section => revealObserver.observe(section));
  }
  const observeReveal = element => {
    if (!element) return;
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add("is-revealed");
  };

  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    menuToggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
    document.querySelector(".main-nav")?.classList.toggle("nav-open", !open);
    document.body.classList.toggle("menu-open", !open);
  });

  const guideNudge = document.querySelector(".guide-browse-nudge");
  if (guideNudge) {
    const dismissButton = guideNudge.querySelector(".guide-nudge-dismiss");
    let wasDismissed = false;
    let wasShown = false;
    try {
      wasDismissed = sessionStorage.getItem("obest-guide-nudge-dismissed") === "true";
      wasShown = sessionStorage.getItem("obest-guide-nudge-shown") === "true";
    } catch {
      // Dismissal still works for this page if storage is unavailable.
    }
    if (wasDismissed || wasShown) {
      guideNudge.hidden = true;
    } else {
      guideNudge.hidden = false;
      guideNudge.classList.add("is-pending");
      window.setTimeout(() => {
        guideNudge.classList.remove("is-pending");
        guideNudge.classList.add("is-ready");
        try {
          sessionStorage.setItem("obest-guide-nudge-shown", "true");
        } catch {
          // The prompt still appears once on this page if browser storage is unavailable.
        }
      }, prefersReducedMotion ? 0 : 700);
    }
    dismissButton?.addEventListener("click", () => {
      guideNudge.classList.add("is-dismissed");
      try {
        sessionStorage.setItem("obest-guide-nudge-dismissed", "true");
      } catch {
        // Keep the visual dismissal functional without browser storage.
      }
      guideNudge.addEventListener("transitionend", event => {
        if (event.target === guideNudge && event.propertyName === "max-height") guideNudge.hidden = true;
      }, { once: true });
    });
  }

  const grid = document.getElementById("product-grid");
  const categoryGrid = document.getElementById("category-grid");
  if (grid && categoryGrid) {
    const search = document.getElementById("product-search");
    const backButton = document.getElementById("category-back");
    const resultCount = document.getElementById("result-count");
    const emptyResults = document.getElementById("empty-results");
    const catalogCategories = [
      { id: "power", name: "Power & charging", description: "Power banks, chargers and cables", icon: "charger", types: ["power-banks", "chargers", "cables"] },
      { id: "audio", name: "Audio & listening", description: "Earbuds and headphones", icon: "headphones", types: ["earbuds", "headphones"] },
      { id: "protection", name: "Phone protection", description: "Cases and screen protectors", icon: "case", types: ["cases", "screen-protectors"] },
      { id: "parts", name: "Phone parts", description: "Screens, batteries and repair parts", icon: "screenpart", types: ["phone-screens", "phone-batteries", "sub-boards", "power-flex", "charging-ports"] }
    ];
    const typeIcons = { "power-banks": "bank", chargers: "charger", cables: "cable", earbuds: "earbuds", headphones: "headphones", cases: "case", "screen-protectors": "screen", "phone-screens": "screenpart", "phone-batteries": "battery", "sub-boards": "board", "power-flex": "flex", "charging-ports": "port" };
    let activeCategory = new URLSearchParams(location.search).get("category");
    if (!categoryNames[activeCategory]) activeCategory = "";
    let activeItemType = new URLSearchParams(location.search).get("type") || "";
    // Batch 1 is approved; batch 2 is now open for the next owner review.
    const products = (window.OBEST_PRODUCTS || []).filter(product => product.batch <= 2);
    const renderCategories = () => {
      const term = (search?.value || "").trim().toLowerCase();
      const matchingProducts = products.filter(product => `${product.name} ${product.categoryName} ${itemTypeNames[product.itemType] || ""} ${product.description}`.toLowerCase().includes(term));
      if (activeCategory) {
        const category = catalogCategories.find(item => item.id === activeCategory);
        const shownTypes = category.types.filter(type => {
          const knownName = itemTypeNames[type] || type.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
          return !term || `${knownName} ${category.name} ${category.description}`.toLowerCase().includes(term) || matchingProducts.some(product => product.itemType === type && `${product.name} ${product.description}`.toLowerCase().includes(term));
        });
        categoryGrid.innerHTML = shownTypes.length ? `<div class="catalog-category-group"><div class="catalog-category-heading"><p class="eyebrow eyebrow-dark"><span class="eyebrow-line"></span> ${category.name}</p><h2>Choose what you need.</h2><p>${category.description}</p></div><div class="catalog-category-options">${shownTypes.map(type => {
          const count = products.filter(product => product.category === category.id && product.itemType === type).length;
          const label = itemTypeNames[type] || type.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
          return `<button class="catalog-category-card catalog-subcategory-card" type="button" data-category="${category.id}" data-type="${type}"><span class="catalog-category-icon">${iconMarkup(typeIcons[type])}</span><span class="catalog-category-copy"><strong>${label}</strong><small>${count ? `${count} product${count === 1 ? "" : "s"}` : "Ask us about options"}</small><small class="card-action-cue">See options</small></span></button>`;
        }).join("")}</div></div>` : "";
      } else {
        const shownCategories = catalogCategories.filter(category => (!term || `${category.name} ${category.description}`.toLowerCase().includes(term) || matchingProducts.some(product => product.category === category.id && `${product.name} ${product.description}`.toLowerCase().includes(term))));
        categoryGrid.innerHTML = shownCategories.map(category => `<section class="catalog-category-group"><div class="catalog-category-heading"><h2>${category.name}</h2><p>${category.description}</p></div><div class="catalog-category-options">${category.types.filter(type => {
          const label = itemTypeNames[type] || type.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
          return !term || `${label} ${category.name} ${category.description}`.toLowerCase().includes(term) || matchingProducts.some(product => product.category === category.id && product.itemType === type && `${product.name} ${product.description}`.toLowerCase().includes(term));
        }).map(type => {
          const label = itemTypeNames[type] || type.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
          const count = products.filter(product => product.category === category.id && product.itemType === type).length;
          return `<button class="catalog-category-card catalog-subcategory-card" type="button" data-category="${category.id}" data-type="${type}"><span class="catalog-category-icon">${iconMarkup(typeIcons[type])}</span><span class="catalog-category-copy"><strong>${label}</strong><small>${count ? `${count} product${count === 1 ? "" : "s"}` : "Ask us about options"}</small><small class="card-action-cue">See options</small></span></button>`;
        }).join("")}</div></section>`).join("");
      }
      categoryGrid.hidden = false;
      grid.hidden = true;
      observeReveal(categoryGrid);
      backButton.hidden = !activeCategory;
      backButton.textContent = "All categories";
      resultCount.textContent = activeCategory ? catalogCategories.find(item => item.id === activeCategory).name : term ? "Matching categories" : "Browse a category";
      emptyResults.hidden = categoryGrid.innerHTML !== "";
    };
    const renderProducts = () => {
      const term = (search?.value || "").trim().toLowerCase();
      const items = products.filter(product => product.category === activeCategory && (!activeItemType || product.itemType === activeItemType) && (!term || `${product.name} ${product.categoryName} ${itemTypeNames[product.itemType] || ""} ${product.description}`.toLowerCase().includes(term)));
      grid.innerHTML = items.map(productCard).join("");
      categoryGrid.hidden = true;
      grid.hidden = false;
      observeReveal(grid);
      backButton.hidden = false;
      backButton.textContent = `${categoryNames[activeCategory]}`;
      resultCount.textContent = `${items.length} ${items.length === 1 ? "product" : "products"} in ${activeItemType ? itemTypeNames[activeItemType] : categoryNames[activeCategory]}`;
      emptyResults.hidden = items.length !== 0;
    };
    const render = () => activeCategory && activeItemType ? renderProducts() : renderCategories();
    const openCategory = (category, type = "") => {
      activeCategory = category;
      activeItemType = type;
      history.replaceState(null, "", `?category=${encodeURIComponent(category)}${type ? `&type=${encodeURIComponent(type)}` : ""}`);
      render();
      document.querySelector(".catalog-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    categoryGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (button) openCategory(button.dataset.category, button.dataset.type || "");
    });
    backButton.addEventListener("click", () => {
      if (activeItemType) {
        activeItemType = "";
        history.replaceState(null, "", `?category=${encodeURIComponent(activeCategory)}`);
      } else {
        activeCategory = "";
        history.replaceState(null, "", location.pathname);
      }
      render();
    });
    search?.addEventListener("input", render);
    render();
  }

  const detail = document.getElementById("product-detail");
  if (detail) {
    const id = new URLSearchParams(location.search).get("id");
    const product = (window.OBEST_PRODUCTS || []).find(p => p.id === id);
    if (!product) {
      detail.innerHTML = `<div class="not-found"><span>✳</span><h1>That item isn’t here yet.</h1><p>Explore the catalogue or tell us what you’re looking for.</p><a class="button button-blue" href="catalog.html">Browse catalogue </a></div>`;
    } else {
      document.title = `${product.name} | O-BEST`;
      const descriptionMeta = document.querySelector('meta[name="description"]');
      if (descriptionMeta) descriptionMeta.content = `${product.description} Ask O-BEST to check current availability.`;
      const specs = [product.brand && ["Brand", product.brand], product.model && ["Model", product.model], product.capacity && ["Capacity", product.capacity], product.output && ["Output", product.output], product.details && ["Details", product.details]].filter(Boolean);
      const specsMarkup = specs.length ? `<dl class="detail-specs">${specs.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>` : "";
      detail.innerHTML = `<div class="detail-art-wrap">${cardArt(product, 1)}${product.image ? "" : "<span class=\"detail-art-note\">PHOTO<br />TO ADD</span>"}</div><div class="detail-copy"><p class="eyebrow eyebrow-dark"><span class="eyebrow-line"></span> ${product.categoryName}</p><h1>${product.name}</h1><p class="availability-pill"><span class="availability-dot"></span> Ask us to check availability</p><p class="detail-description">${product.description}</p>${specsMarkup}<div class="detail-note"><span>✳</span><p>Need help checking compatibility? Send us your device model and ask us about this item.</p></div><a class="button button-yellow" href="request.html?item=${encodeURIComponent(product.name)}">Ask about this item </a><a class="text-link detail-back" href="catalog.html">Back to all products</a></div>`;
    }
  }

  const requestForm = document.getElementById("request-form");
  let retryKey = "";
  let retryPayload = "";
  requestForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const status = document.getElementById("form-status");
    if (!requestForm.reportValidity()) return;
    const submit = requestForm.querySelector('[type="submit"]');
    const data = new FormData(requestForm);
    const payload = JSON.stringify(Object.fromEntries(data.entries()));
    if (payload !== retryPayload) {
      retryPayload = payload;
      retryKey = crypto.randomUUID();
    }
    status.classList.remove("status-warning", "status-success");
    status.textContent = "Sending your request securely…";
    if (submit) {
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML = 'Sending request <span aria-hidden="true">…</span>';
    }

    try {
      const response = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Idempotency-Key": retryKey },
        body: payload
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || "We couldn’t send your request just now. Please try again shortly.");
      }

      status.textContent = "The email service accepted your request for processing. This doesn’t guarantee inbox delivery, confirm availability, or mean the shop has read or replied yet.";
      status.classList.add("status-success");
      requestForm.reset();
      retryKey = "";
      retryPayload = "";
    } catch (error) {
      status.textContent = error.message || "We couldn’t send your request just now. Please check your connection and try again.";
      status.classList.add("status-warning");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
        submit.innerHTML = 'Send item request ';
      }
    }
  });

  const requestItem = new URLSearchParams(location.search).get("item");
  const itemInput = document.getElementById("item-name");
  if (requestItem && itemInput) itemInput.value = requestItem;
})();
