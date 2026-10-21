// Aplicação E-Commerce & Backoffice Privado (CMS Produtos + DSers/AliExpress) — Cãofrade (www.caofrade.pt)

(function () {
  const FREE_SHIPPING_THRESHOLD = 39.90;
  const FREE_GIFT_THRESHOLD = 65.00;
  const STANDARD_SHIPPING_COST = 3.90;
  const ADMIN_SECRET_PASS = "caofrade2026";

  // Load saved custom catalog if modified in Backoffice, otherwise use default products.js
  const savedCatalog = localStorage.getItem("caofrade_catalog_v2");
  if (savedCatalog) {
    try {
      const parsed = JSON.parse(savedCatalog);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.CAOFRADE_PRODUCTS = parsed;
      }
    } catch (err) {
      console.error("Erro ao carregar catálogo personalizado:", err);
    }
  }

  let state = {
    category: "todos",
    petFilter: "todos",
    search: "",
    sortBy: "featured",
    cart: JSON.parse(localStorage.getItem("caofrade_cart") || "[]"),
    coupon: null,
    selectedPayment: "mbway",
    isAdminAuthenticated: sessionStorage.getItem("caofrade_admin_auth") === "1",
    orders: JSON.parse(localStorage.getItem("caofrade_orders") || "[]")
  };

  if (state.orders.length === 0) {
    state.orders = [
      {
        id: "CF-84920",
        date: "20/10/2026 21:15",
        customer: "Ana Sofia Martins",
        email: "anasofia.demo@gmail.com",
        phone: "+351 912 345 678",
        address: "Av. da República 45, 3º Esq",
        postalCode: "1050-188",
        city: "Lisboa",
        nif: "245891023",
        paymentMethod: "MB WAY",
        status: "Pago — Pronto p/ Envio",
        trackingCode: "LP006482918472PT",
        total: 56.80,
        items: [
          { id: "escova-vapor-3em1", sku: "CF-HIG-001", title: "Escova a Vapor 3-em-1 Anti-Pelo", variant: "Branco Pérola", qty: 1, price: 24.90, supplierCost: 4.20 },
          { id: "cama-janela-ventosas-gato", sku: "CF-CON-010", title: "Cama de Janela Panorâmica SunCat™", variant: "Creme & Cinza Reversível", qty: 1, price: 32.90, supplierCost: 7.80 }
        ]
      }
    ];
    localStorage.setItem("caofrade_orders", JSON.stringify(state.orders));
  }

  function formatEUR(value) {
    return Number(value).toFixed(2).replace(".", ",") + " €";
  }

  function saveCatalog() {
    localStorage.setItem("caofrade_catalog_v2", JSON.stringify(window.CAOFRADE_PRODUCTS));
    renderCatalog();
  }

  function saveCart() {
    localStorage.setItem("caofrade_cart", JSON.stringify(state.cart));
    updateCartUI();
  }

  function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<img src="assets/logo-caofrade.jpg" alt="" style="width:26px;height:26px;border-radius:50%;border:1.5px solid var(--friar-gold);" /> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  // Render Product Catalog
  function renderCatalog() {
    const grid = document.getElementById("productsGrid");
    const countLabel = document.getElementById("catalogCount");
    if (!grid) return;

    let filtered = window.CAOFRADE_PRODUCTS.filter((p) => {
      const matchCat = state.category === "todos" || p.category === state.category;
      const matchPet = state.petFilter === "todos" || (p.petType && p.petType.includes(state.petFilter));
      const q = state.search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q));
      return matchCat && matchPet && matchSearch;
    });

    if (state.sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (state.sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (state.sortBy === "reviews") {
      filtered.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }

    if (countLabel) {
      countLabel.textContent = `${filtered.length} artigo${filtered.length !== 1 ? "s" : ""} disponível${filtered.length !== 1 ? "eis" : ""}`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 48px 20px; background: #fff; border-radius: 16px; border: 1px solid var(--border);">
          <img src="assets/logo-caofrade.jpg" alt="Cãofrade" style="width:68px;height:68px;border-radius:50%;margin:0 auto 12px;border:2px solid var(--friar-gold);" />
          <p style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px;">Nenhum artigo encontrado para esta pesquisa</p>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Tenta limpar os filtros ou pesquisar por outro termo.</p>
          <button class="btn-primary" onclick="window.CaofradeApp.resetFilters()">Ver Todos os Produtos</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((p) => {
        const discountPct = p.compareAtPrice > p.price
          ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
          : 20;
        const defaultVariant = p.variants?.options?.[0] || "Padrão";
        return `
        <article class="product-card">
          <div class="product-media" onclick="window.CaofradeApp.openProductModal('${p.id}')">
            <span class="product-badge ${p.badgeType || 'hot'}">${p.badge || '🔥 Destaque'}</span>
            <span class="discount-tag">-${discountPct}%</span>
            <img src="${p.images[0]}" alt="${p.title}" loading="lazy" />
          </div>
          <div class="product-body">
            <div class="product-meta-top">
              <span>${p.categoryLabel || 'Confraria Pet'}</span>
              <span class="rating-stars">★★★★★ <span>(${p.reviewsCount || 48})</span></span>
            </div>
            <h3 class="product-title" onclick="window.CaofradeApp.openProductModal('${p.id}')">${p.title}</h3>
            <p class="product-subtitle">${p.subtitle}</p>
            <div class="product-price-row">
              <span class="price-current">${formatEUR(p.price)}</span>
              <span class="price-compare">${formatEUR(p.compareAtPrice)}</span>
            </div>
            <div class="product-card-actions">
              <button class="btn-add-card" onclick="window.CaofradeApp.addToCart('${p.id}', '${defaultVariant.replace(/'/g, "")}', 1, 0)">
                <span>+ Adicionar</span>
              </button>
              <button class="btn-quickview" onclick="window.CaofradeApp.openProductModal('${p.id}')" title="Ver fotos e detalhes">
                Ver +
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  // Product Detail Modal
  function openProductModal(productId) {
    const p = window.CAOFRADE_PRODUCTS.find((item) => item.id === productId);
    if (!p) return;

    const modal = document.getElementById("productModal");
    const content = document.getElementById("productModalContent");
    const discountPct = p.compareAtPrice > p.price
      ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
      : 20;
    const twoPackPrice = +(p.price * 2 * 0.85).toFixed(2);
    const highlights = p.highlights && p.highlights.length > 0
      ? p.highlights
      : ["Material seguro, resistente e aprovado para cães e gatos", "Envio expresso rastreável para todo Portugal", "Garantia de satisfação de 14 dias"];
    const reviews = p.reviews && p.reviews.length > 0
      ? p.reviews
      : [{ author: "Cliente Verificado (Portugal)", rating: 5, date: "Recente", text: "Excelente qualidade, chegou bem embalado e o meu patudo adorou!" }];

    content.innerHTML = `
      <div class="product-modal-grid">
        <div>
          <div class="modal-gallery-main">
            <img id="modalMainImg" src="${p.images[0]}" alt="${p.title}" />
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${p.images
              .map(
                (img, idx) => `
              <img src="${img}" alt="" onclick="document.getElementById('modalMainImg').src='${img}'"
                style="width:74px; height:74px; object-fit:contain; background:#fff; padding:4px; border-radius:10px; cursor:pointer; border:2px solid ${idx === 0 ? "var(--primary)" : "var(--border)"};" />
            `
              )
              .join("")}
          </div>

          <div style="margin-top:18px; background:var(--friar-gold-light); border:1.5px solid var(--friar-gold); border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:12px;">
            <img src="assets/logo-caofrade.jpg" alt="Cãofrade" style="width:46px; height:46px; border-radius:50%; border:2px solid var(--friar-brown); flex-shrink:0;" />
            <div style="font-size:0.8rem; color:var(--friar-brown);">
              <strong>Selo de Qualidade Mestre Cãofrade®</strong><br/>
              Artigo original verificado com garantia de satisfação de 14 dias em Portugal.
            </div>
          </div>
        </div>
        <div>
          <span class="hero-pill" style="margin-bottom:10px;">${p.badge || '🔥 Destaque'} • Em Stock (${p.stock || 25} un.)</span>
          <h2 style="font-size:1.55rem; font-weight:800; line-height:1.22; margin-bottom:8px; color:var(--friar-brown);">${p.title}</h2>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; font-size:0.88rem;">
            <span class="rating-stars">★★★★★ <strong>${p.rating || 4.9}/5</strong> (${p.reviewsCount || 48} avaliações verificadas)</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:12px; margin-bottom:16px;">
            <span style="font-size:1.85rem; font-weight:800; color:var(--primary);" id="modalDynamicPrice">${formatEUR(p.price)}</span>
            <span style="font-size:1.05rem; color:var(--text-muted); text-decoration:line-through;">${formatEUR(p.compareAtPrice)}</span>
            <span style="background:var(--success-bg); color:var(--success); font-weight:800; font-size:0.78rem; padding:4px 10px; border-radius:999px;">Poupas ${discountPct}%</span>
          </div>
          <p style="color:var(--text-body); font-size:0.93rem; margin-bottom:16px;">${p.shortDesc}</p>

          <div style="margin-bottom:16px;">
            <label style="display:block; font-size:0.82rem; font-weight:700; margin-bottom:6px;">Escolhe ${p.variants?.label || 'Opção'}:</label>
            <select id="modalVariantSelect" style="width:100%; padding:11px 14px; border-radius:10px; border:1px solid var(--border); font-weight:600; font-size:0.92rem;">
              ${(p.variants?.options || ["Padrão"]).map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
            </select>
          </div>

          <div class="bundle-selector">
            <label style="font-size:0.82rem; font-weight:700;">Oferta Cãofrade — Compra Junto & Poupa:</label>
            <div class="bundle-option selected" id="bundleOpt1" onclick="window.CaofradeApp.selectBundle(1, ${p.price})">
              <div>
                <strong>1 Unidade</strong>
                <div style="font-size:0.78rem; color:var(--text-muted);">Preço padrão de lançamento</div>
              </div>
              <strong>${formatEUR(p.price)}</strong>
            </div>
            <div class="bundle-option" id="bundleOpt2" onclick="window.CaofradeApp.selectBundle(2, ${twoPackPrice})">
              <div>
                <strong>🔥 Leva 2 Unidades (Poupa 15% + Portes Grátis)</strong>
                <div style="font-size:0.78rem; color:var(--primary); font-weight:700;">Mais escolhido pelos donos em Portugal</div>
              </div>
              <div style="text-align:right;">
                <strong style="color:var(--primary);">${formatEUR(twoPackPrice)}</strong>
                <div style="font-size:0.75rem; text-decoration:line-through; color:var(--text-muted);">${formatEUR(p.price * 2)}</div>
              </div>
            </div>
          </div>

          <input type="hidden" id="modalSelectedQty" value="1" />
          <input type="hidden" id="modalSelectedDiscount" value="0" />

          <button class="btn-primary" style="width:100%; margin-bottom:16px;"
            onclick="window.CaofradeApp.addFromModal('${p.id}')">
            🛒 Adicionar ao Cesto Agora
          </button>

          <div style="background:var(--bg-soft); padding:14px; border-radius:12px; font-size:0.83rem; margin-bottom:16px;">
            <div style="margin-bottom:6px;">🇵🇹 <strong>Entrega em Portugal:</strong> ${p.shippingTime || '7–10 dias úteis'} (Código de Rastreio CTT/Expresso incluído)</div>
            <div style="margin-bottom:6px;">🛡️ <strong>Sem Taxas Alfandegárias:</strong> IVA e sistema europeu IOSS incluídos no preço</div>
            <div>💳 <strong>Pagamento 100% Seguro:</strong> MB WAY, Multibanco, Visa, Mastercard ou Apple Pay</div>
          </div>

          <h4 style="font-size:0.9rem; font-weight:800; margin-bottom:8px;">Porque é que o teu patudo vai adorar:</h4>
          <ul style="padding-left:18px; font-size:0.86rem; color:var(--text-body); margin-bottom:18px;">
            ${highlights.map((h) => `<li style="margin-bottom:5px;">${h}</li>`).join("")}
          </ul>

          <div style="border-top:1px solid var(--border); padding-top:14px;">
            <h4 style="font-size:0.88rem; font-weight:800; margin-bottom:10px;">Avaliações de Clientes em Portugal:</h4>
            ${reviews
              .map(
                (r) => `
              <div style="background:var(--bg-cream); padding:10px 12px; border-radius:10px; margin-bottom:8px; font-size:0.82rem;">
                <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:3px;">
                  <span>${r.author} <span style="color:var(--success);">✓ Compra Verificada</span></span>
                  <span style="color:var(--text-muted); font-weight:500;">${r.date}</span>
                </div>
                <p style="color:var(--text-body);">"${r.text}"</p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    modal.classList.add("open");
  }

  function selectBundle(qty, totalDisplayPrice) {
    const opt1 = document.getElementById("bundleOpt1");
    const opt2 = document.getElementById("bundleOpt2");
    const qtyInput = document.getElementById("modalSelectedQty");
    const discountInput = document.getElementById("modalSelectedDiscount");
    const priceEl = document.getElementById("modalDynamicPrice");

    if (qty === 2) {
      opt1.classList.remove("selected");
      opt2.classList.add("selected");
      qtyInput.value = "2";
      discountInput.value = "0.15";
    } else {
      opt2.classList.remove("selected");
      opt1.classList.add("selected");
      qtyInput.value = "1";
      discountInput.value = "0";
    }
    if (priceEl) priceEl.textContent = formatEUR(totalDisplayPrice);
  }

  function addFromModal(productId) {
    const variant = document.getElementById("modalVariantSelect")?.value || "Padrão";
    const qty = parseInt(document.getElementById("modalSelectedQty")?.value || "1", 10);
    const discountRate = parseFloat(document.getElementById("modalSelectedDiscount")?.value || "0");
    addToCart(productId, variant, qty, discountRate);
    closeModal("productModal");
  }

  // Cart Actions
  function addToCart(productId, variant, qty = 1, discountRate = 0) {
    const product = window.CAOFRADE_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const unitPrice = +(product.price * (1 - discountRate)).toFixed(2);
    const existingIndex = state.cart.findIndex(
      (item) => item.id === productId && item.variant === variant
    );

    if (existingIndex > -1) {
      state.cart[existingIndex].qty += qty;
      if (discountRate > 0) {
        state.cart[existingIndex].price = unitPrice;
      }
    } else {
      state.cart.push({
        id: product.id,
        sku: product.sku,
        title: product.title,
        variant: variant || product.variants?.options?.[0] || "Padrão",
        price: unitPrice,
        supplierCost: product.supplierCost,
        image: product.images[0],
        qty: qty
      });
    }

    saveCart();
    showToast(`"${product.title}" adicionado ao cesto!`);
    openCartDrawer();
  }

  function updateQty(index, delta) {
    if (!state.cart[index]) return;
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) {
      state.cart.splice(index, 1);
    }
    saveCart();
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let discount = 0;
    if (state.coupon === "CAOFRADE10") {
      discount = subtotal * 0.10;
    } else if (state.coupon === "BEMVINDO15") {
      discount = subtotal * 0.15;
    }
    const afterDiscount = Math.max(0, subtotal - discount);
    const shipping = afterDiscount === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
    const total = afterDiscount + shipping;
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
    return { subtotal, discount, shipping, total, count };
  }

  function updateCartUI() {
    const { subtotal, discount, shipping, total, count } = getCartTotals();

    const countEl = document.getElementById("headerCartCount");
    if (countEl) countEl.textContent = count;

    const progressText = document.getElementById("shippingProgressText");
    const progressFill = document.getElementById("shippingProgressFill");

    if (progressText && progressFill) {
      if (subtotal < FREE_SHIPPING_THRESHOLD) {
        const missing = FREE_SHIPPING_THRESHOLD - subtotal;
        const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        progressText.innerHTML = `Faltam apenas <strong>${formatEUR(missing)}</strong> para ganhares <strong>Portes Grátis</strong>! 🚚`;
        progressFill.style.width = `${pct}%`;
      } else if (subtotal < FREE_GIFT_THRESHOLD) {
        const missingGift = FREE_GIFT_THRESHOLD - subtotal;
        const pct = Math.min(100, Math.round((subtotal / FREE_GIFT_THRESHOLD) * 100));
        progressText.innerHTML = `🎉 Já tens <strong>Portes Grátis</strong>! Adiciona <strong>${formatEUR(missingGift)}</strong> para ganhar um <strong>Brinde Surpresa Cãofrade</strong>!`;
        progressFill.style.width = `${pct}%`;
      } else {
        progressText.innerHTML = `🎁 Parabéns! Desbloqueaste <strong>Portes Grátis + Brinde Surpresa Cãofrade</strong>!`;
        progressFill.style.width = `100%`;
      }
    }

    const itemsContainer = document.getElementById("cartItemsContainer");
    if (!itemsContainer) return;

    if (state.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align:center; padding:44px 16px; color:var(--text-muted);">
          <img src="assets/logo-caofrade.jpg" alt="Cãofrade" style="width:74px; height:74px; border-radius:50%; margin:0 auto 12px; border:2px solid var(--friar-gold);" />
          <p style="font-weight:700; color:var(--text-dark); margin-bottom:6px;">O teu cesto ainda está vazio</p>
          <p style="font-size:0.85rem; margin-bottom:18px;">Descobre os artigos originais favoritos da Confraria.</p>
          <button class="btn-primary" onclick="window.CaofradeApp.closeCartDrawer()">Explorar Catálogo</button>
        </div>
      `;
    } else {
      itemsContainer.innerHTML = state.cart
        .map(
          (item, idx) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.title}" />
          <div>
            <div style="font-weight:700; font-size:0.88rem; line-height:1.25;">${item.title}</div>
            <div style="font-size:0.76rem; color:var(--text-muted); margin-top:2px;">${item.variant}</div>
            <div class="qty-control">
              <button onclick="window.CaofradeApp.updateQty(${idx}, -1)">−</button>
              <span>${item.qty}</span>
              <button onclick="window.CaofradeApp.updateQty(${idx}, 1)">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; font-size:0.94rem;">${formatEUR(item.price * item.qty)}</div>
            <button onclick="window.CaofradeApp.updateQty(${idx}, -99)" style="font-size:0.75rem; color:#DC2626; margin-top:6px;">Remover</button>
          </div>
        </div>
      `
        )
        .join("");
    }

    const upsellBox = document.getElementById("cartUpsellBox");
    if (upsellBox) {
      const hasRoller = state.cart.some((i) => i.id === "rolo-tira-pelos-reutilizavel");
      if (!hasRoller && state.cart.length > 0) {
        upsellBox.style.display = "flex";
        upsellBox.innerHTML = `
          <img src="https://crispcraftpaw.com/cdn/shop/files/1615203197971.jpg" alt="Rolo FurZero" style="width:48px; height:48px; border-radius:8px; object-fit:contain; background:#fff; border:1px solid var(--border);" />
          <div style="font-size:0.78rem; flex:1;">
            <strong style="color:var(--primary);">⚡ Oferta no Cesto (-18%):</strong><br/>
            Junta o <strong>Rolo Tira-Pelos FurZero™</strong> por <strong>13,90 €</strong>
          </div>
          <button class="btn-add-card" style="padding:8px 12px; font-size:0.76rem; white-space:nowrap;"
            onclick="window.CaofradeApp.addToCart('rolo-tira-pelos-reutilizavel', '1x Rolo FurZero™ Pro', 1, 0.177)">
            + Juntar
          </button>
        `;
      } else {
        upsellBox.style.display = "none";
      }
    }

    const subEl = document.getElementById("cartSubtotal");
    const discRow = document.getElementById("cartDiscountRow");
    const discEl = document.getElementById("cartDiscountVal");
    const shipEl = document.getElementById("cartShippingVal");
    const totEl = document.getElementById("cartTotalVal");

    if (subEl) subEl.textContent = formatEUR(subtotal);
    if (discRow && discEl) {
      discRow.style.display = discount > 0 ? "flex" : "none";
      discEl.textContent = "−" + formatEUR(discount);
    }
    if (shipEl) shipEl.textContent = shipping === 0 ? "GRÁTIS" : formatEUR(shipping);
    if (totEl) totEl.textContent = formatEUR(total);
  }

  function applyCoupon() {
    const input = document.getElementById("couponInput");
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (code === "CAOFRADE10" || code === "BEMVINDO15") {
      state.coupon = code;
      updateCartUI();
      showToast(`Cupão ${code} aplicado com sucesso!`);
    } else {
      showToast("Cupão inválido. Experimenta CAOFRADE10 ou BEMVINDO15");
    }
  }

  function openCartDrawer() {
    document.getElementById("cartDrawerBackdrop")?.classList.add("open");
    updateCartUI();
  }

  function closeCartDrawer() {
    document.getElementById("cartDrawerBackdrop")?.classList.remove("open");
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove("open");
  }

  // Checkout Modal
  function openCheckoutModal() {
    if (state.cart.length === 0) {
      showToast("Adiciona pelo menos um artigo ao cesto primeiro!");
      return;
    }
    closeCartDrawer();
    const { total, shipping } = getCartTotals();
    document.getElementById("checkoutTotalLabel").textContent = formatEUR(total);
    document.getElementById("checkoutShippingLabel").textContent = shipping === 0 ? "Grátis (Expresso Rastreável)" : formatEUR(shipping);
    document.getElementById("checkoutConfirmationBox").style.display = "none";
    document.getElementById("checkoutFormWrap").style.display = "block";
    document.getElementById("checkoutModal").classList.add("open");
  }

  function selectPaymentMethod(method) {
    state.selectedPayment = method;
    ["mbway", "multibanco", "card"].forEach((m) => {
      const el = document.getElementById(`payOpt-${m}`);
      if (el) el.classList.toggle("active", m === method);
    });
    const mbwayBox = document.getElementById("mbwayPhoneGroup");
    if (mbwayBox) {
      mbwayBox.style.display = method === "mbway" ? "block" : "none";
    }
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const { total } = getCartTotals();

    const name = document.getElementById("chkName").value.trim();
    const email = document.getElementById("chkEmail").value.trim();
    const phone = document.getElementById("chkPhone").value.trim();
    const address = document.getElementById("chkAddress").value.trim();
    const postalCode = document.getElementById("chkPostal").value.trim();
    const city = document.getElementById("chkCity").value.trim();
    const nif = document.getElementById("chkNif").value.trim();

    const orderId = "CF-" + Math.floor(10000 + Math.random() * 90000);
    const nowStr = new Date().toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });

    const newOrder = {
      id: orderId,
      date: nowStr,
      customer: name,
      email,
      phone,
      address,
      postalCode,
      city,
      nif,
      paymentMethod:
        state.selectedPayment === "mbway"
          ? "MB WAY"
          : state.selectedPayment === "multibanco"
          ? "Multibanco"
          : "Cartão / Apple Pay (Stripe)",
      status: "Pago — Pronto p/ Envio",
      trackingCode: "A aguardar despacho (24h)",
      total,
      items: JSON.parse(JSON.stringify(state.cart))
    };

    state.orders.unshift(newOrder);
    localStorage.setItem("caofrade_orders", JSON.stringify(state.orders));

    state.cart = [];
    state.coupon = null;
    saveCart();

    const confirmBox = document.getElementById("checkoutConfirmationBox");
    const formWrap = document.getElementById("checkoutFormWrap");
    formWrap.style.display = "none";
    confirmBox.style.display = "block";

    const randomRef =
      Math.floor(100 + Math.random() * 899) +
      " " +
      Math.floor(100 + Math.random() * 899) +
      " " +
      Math.floor(100 + Math.random() * 899);

    let paymentDetailsHtml = "";
    if (state.selectedPayment === "mbway") {
      paymentDetailsHtml = `
        <div style="background:var(--bg-soft); padding:16px; border-radius:12px; margin:16px 0; text-align:left;">
          <strong>📱 Pedido enviado para a tua App MB WAY (${phone})</strong>
          <p style="font-size:0.85rem; color:var(--text-body); margin-top:4px;">Aceita a notificação na App MB WAY nos próximos 4 minutos para confirmar o envio expresso da tua encomenda.</p>
        </div>
      `;
    } else if (state.selectedPayment === "multibanco") {
      paymentDetailsHtml = `
        <div style="background:var(--bg-soft); padding:16px; border-radius:12px; margin:16px 0; text-align:left;">
          <strong>🏧 Dados para Pagamento Multibanco / Homebanking:</strong>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px; font-size:0.9rem;">
            <div><span style="color:var(--text-muted);">Entidade:</span><br/><strong>11249</strong></div>
            <div><span style="color:var(--text-muted);">Referência:</span><br/><strong>${randomRef}</strong></div>
            <div><span style="color:var(--text-muted);">Montante:</span><br/><strong>${formatEUR(total)}</strong></div>
          </div>
        </div>
      `;
    } else {
      paymentDetailsHtml = `
        <div style="background:var(--success-bg); color:var(--success); padding:14px; border-radius:12px; margin:16px 0;">
          <strong>✓ Pagamento por Cartão processado com sucesso!</strong>
        </div>
      `;
    }

    confirmBox.innerHTML = `
      <div style="text-align:center; padding:18px 8px;">
        <img src="assets/logo-caofrade.jpg" alt="Mestre Cãofrade" style="width:86px; height:86px; border-radius:50%; margin:0 auto 12px; border:3px solid var(--friar-gold); box-shadow:var(--shadow-sm);" />
        <h3 style="font-size:1.5rem; font-weight:800; color:var(--friar-brown); margin-bottom:6px;">Bem-vindo à Ordem Cãofrade, ${name.split(" ")[0]}!</h3>
        <p style="color:var(--text-body); font-size:0.94rem;">Encomenda <strong>#${orderId}</strong> registada para envio para <strong>${postalCode} ${city}</strong>.</p>
        ${paymentDetailsHtml}
        <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:20px;">
          Enviámos a confirmação oficial da Confraria e o resumo para <strong>${email}</strong>. Podes acompanhar o estado em "Rastrear Encomenda" usando o código <strong>${orderId}</strong>.
        </p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="btn-primary" onclick="window.CaofradeApp.closeModal('checkoutModal')">Continuar na Loja</button>
        </div>
      </div>
    `;
  }

  // Order Tracking Modal
  function openTrackingModal() {
    document.getElementById("trackingModal").classList.add("open");
  }

  function lookupOrder(e) {
    e.preventDefault();
    const code = document.getElementById("trackInput").value.trim().toUpperCase();
    const resBox = document.getElementById("trackResultBox");
    const found = state.orders.find(
      (o) => o.id.toUpperCase() === code || o.trackingCode.toUpperCase() === code
    );

    if (found) {
      resBox.innerHTML = `
        <div style="background:var(--bg-soft); padding:18px; border-radius:12px; margin-top:16px; border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <strong>Encomenda #${found.id} (${found.customer})</strong>
            <span class="verified-pill">${found.status}</span>
          </div>
          <p style="font-size:0.86rem; color:var(--text-body); margin-bottom:6px;">📍 <strong>Destino:</strong> ${found.address}, ${found.postalCode} ${found.city}</p>
          <p style="font-size:0.86rem; color:var(--text-body); margin-bottom:6px;">📦 <strong>Código Logístico IOSS:</strong> ${found.trackingCode}</p>
          <p style="font-size:0.86rem; color:var(--text-body);">🕒 <strong>Previsão de Entrega CTT Expresso:</strong> 7 a 10 dias úteis</p>
        </div>
      `;
    } else {
      resBox.innerHTML = `
        <div style="background:#FEF2F2; color:#DC2626; padding:14px; border-radius:12px; margin-top:16px; font-size:0.88rem;">
          Não encontrámos nenhuma encomenda com o código <strong>${code}</strong>. Experimenta o código de demonstração <strong>CF-84920</strong>!
        </div>
      `;
    }
  }

  // PRIVATE BACKOFFICE AUTHENTICATION & MANAGEMENT
  function requestAdminAccess() {
    if (state.isAdminAuthenticated) {
      openAdminModal();
    } else {
      const input = document.getElementById("adminPassInput");
      if (input) input.value = "";
      document.getElementById("adminLoginModal").classList.add("open");
    }
  }

  function verifyAdminLogin(e) {
    e.preventDefault();
    const pass = document.getElementById("adminPassInput")?.value.trim();
    if (pass === ADMIN_SECRET_PASS) {
      state.isAdminAuthenticated = true;
      sessionStorage.setItem("caofrade_admin_auth", "1");
      closeModal("adminLoginModal");
      openAdminModal();
      showToast("Bem-vindo ao Backoffice Privado Cãofrade!");
    } else {
      showToast("Palavra-passe incorreta!");
    }
  }

  function logoutAdmin() {
    state.isAdminAuthenticated = false;
    sessionStorage.removeItem("caofrade_admin_auth");
    closeModal("adminModal");
    showToast("Sessão de administrador terminada.");
  }

  function switchAdminTab(tabName) {
    ["add", "dsers", "orders", "catalog", "comms"].forEach((t) => {
      const pane = document.getElementById(`adminTab-${t}`);
      const btn = document.getElementById(`adminTabBtn-${t}`);
      if (pane) pane.style.display = t === tabName ? "block" : "none";
      if (btn) btn.classList.toggle("active", t === tabName);
    });
  }

  function openAdminModal() {
    if (!state.isAdminAuthenticated) {
      requestAdminAccess();
      return;
    }
    renderAdminPanel();
    document.getElementById("adminModal").classList.add("open");
  }

  // Add or Edit Product in Store
  function handleSaveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById("prodEditId").value.trim();
    const title = document.getElementById("prodTitle").value.trim();
    const subtitle = document.getElementById("prodSubtitle").value.trim();
    const price = parseFloat(document.getElementById("prodPrice").value);
    const compareAtPrice = parseFloat(document.getElementById("prodComparePrice").value);
    const supplierCost = parseFloat(document.getElementById("prodCost").value);
    const category = document.getElementById("prodCategory").value;
    const petType = document.getElementById("prodPetType").value.split(",");
    const variantsRaw = document.getElementById("prodVariants").value;
    const img1 = document.getElementById("prodImage1").value.trim();
    const img2 = document.getElementById("prodImage2").value.trim();
    const supplierUrl = document.getElementById("prodSupplierUrl").value.trim();
    const shortDesc = document.getElementById("prodDesc").value.trim();

    const categoryLabels = {
      higiene: "Higiene & Saúde",
      passeio: "Passeio & Viagem",
      brinquedos: "Treino & Tecnologia",
      conforto: "Conforto & Sono"
    };

    const images = [img1];
    if (img2) images.push(img2);

    const options = variantsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editId) {
      const idx = window.CAOFRADE_PRODUCTS.findIndex((p) => p.id === editId);
      if (idx > -1) {
        window.CAOFRADE_PRODUCTS[idx] = {
          ...window.CAOFRADE_PRODUCTS[idx],
          title,
          subtitle,
          price,
          compareAtPrice,
          supplierCost,
          category,
          categoryLabel: categoryLabels[category] || "Confraria Pet",
          petType,
          variants: { label: "Opção", options: options.length ? options : ["Padrão"] },
          images,
          shortDesc,
          supplierInfo: {
            ...window.CAOFRADE_PRODUCTS[idx].supplierInfo,
            aliexpressUrl: supplierUrl,
            searchQuery: title
          }
        };
        showToast(`Produto "${title}" atualizado com sucesso!`);
      }
    } else {
      const newId =
        title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Math.floor(100 + Math.random() * 899);

      const newProduct = {
        id: newId,
        sku: "CF-NEW-" + Math.floor(100 + Math.random() * 899),
        title,
        subtitle,
        category,
        categoryLabel: categoryLabels[category] || "Confraria Pet",
        petType,
        badge: "🔥 Novo na Confraria",
        badgeType: "hot",
        price,
        compareAtPrice,
        supplierCost,
        shippingTime: "7–10 dias úteis",
        stock: 35,
        rating: 4.9,
        reviewsCount: 28,
        shortDesc,
        highlights: [
          subtitle,
          "Selecionado e testado pela Confraria Cãofrade®",
          "Envio expresso rastreável sem taxas alfandegárias (IOSS)",
          "Garantia de satisfação de 14 dias em Portugal"
        ],
        variants: {
          label: "Opção",
          options: options.length ? options : ["Modelo Padrão"]
        },
        images,
        supplierInfo: {
          platform: "AliExpress / DSers",
          searchQuery: title,
          aliexpressUrl: supplierUrl,
          zendropQuery: title,
          adHook: subtitle,
          weightGrams: 300
        },
        reviews: [
          {
            author: "Cliente Verificado (Lisboa)",
            rating: 5,
            date: "Recente",
            text: "Excelente qualidade! Chegou rápido pelos CTT Expresso e funciona exatamente como anunciado."
          }
        ]
      };

      window.CAOFRADE_PRODUCTS.unshift(newProduct);
      showToast(`Novo produto "${title}" publicado na loja!`);
    }

    saveCatalog();
    resetProductForm();
    renderAdminPanel();
  }

  function editProduct(productId) {
    const p = window.CAOFRADE_PRODUCTS.find((item) => item.id === productId);
    if (!p) return;

    document.getElementById("prodEditId").value = p.id;
    document.getElementById("prodTitle").value = p.title;
    document.getElementById("prodSubtitle").value = p.subtitle;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("prodComparePrice").value = p.compareAtPrice;
    document.getElementById("prodCost").value = p.supplierCost;
    document.getElementById("prodCategory").value = p.category || "higiene";
    document.getElementById("prodPetType").value = (p.petType || ["caes", "gatos"]).join(",");
    document.getElementById("prodVariants").value = (p.variants?.options || ["Padrão"]).join(", ");
    document.getElementById("prodImage1").value = p.images[0] || "";
    document.getElementById("prodImage2").value = p.images[1] || "";
    document.getElementById("prodSupplierUrl").value = p.supplierInfo?.aliexpressUrl || "";
    document.getElementById("prodDesc").value = p.shortDesc || "";

    const btn = document.getElementById("btnSaveProduct");
    if (btn) btn.textContent = "💾 Guardar Alterações no Produto";

    switchAdminTab("add");
    document.getElementById("addProductForm")?.scrollIntoView({ behavior: "smooth" });
  }

  function deleteProduct(productId) {
    const idx = window.CAOFRADE_PRODUCTS.findIndex((p) => p.id === productId);
    if (idx === -1) return;
    const removed = window.CAOFRADE_PRODUCTS.splice(idx, 1)[0];
    saveCatalog();
    renderAdminPanel();
    showToast(`Produto "${removed.title}" removido da loja.`);
  }

  function resetProductForm() {
    document.getElementById("addProductForm")?.reset();
    document.getElementById("prodEditId").value = "";
    const btn = document.getElementById("btnSaveProduct");
    if (btn) btn.textContent = "✓ Publicar Produto na Loja";
  }

  function exportCatalogFile() {
    const jsContent =
      "// Catálogo Oficial Cãofrade (www.caofrade.pt)\nwindow.CAOFRADE_PRODUCTS = " +
      JSON.stringify(window.CAOFRADE_PRODUCTS, null, 2) +
      ";\n";
    const blob = new Blob([jsContent], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.js";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Ficheiro products.js descarregado!");
  }

  function copyCustomerAddress(orderId) {
    const o = state.orders.find((ord) => ord.id === orderId);
    if (!o) return;
    const formatted = `${o.customer}\n${o.address}\n${o.postalCode} ${o.city}\nPortugal\nTel: ${o.phone}`;
    navigator.clipboard.writeText(formatted);
    showToast(`Morada de ${o.customer} copiada! Já podes colar no AliExpress/DSers.`);
  }

  function copyCommTemplate(tplId) {
    const el = document.getElementById(`commTpl-${tplId}`);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText.trim());
    showToast("Texto da comunicação Cãofrade copiado!");
  }

  function renderAdminPanel() {
    const products = window.CAOFRADE_PRODUCTS;
    const avgMarginPct = Math.round(
      products.reduce((acc, p) => acc + ((p.price - p.supplierCost) / p.price) * 100, 0) / products.length
    );
    const avgProfitEur = +(
      products.reduce((acc, p) => acc + (p.price - p.supplierCost), 0) / products.length
    ).toFixed(2);

    // Manage Products Table (Tab 1)
    const manageBody = document.getElementById("adminManageProductsBody");
    if (manageBody) {
      manageBody.innerHTML = products
        .map(
          (p) => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${p.images[0]}" alt="" style="width:44px; height:44px; border-radius:8px; object-fit:contain; background:#fff; border:1px solid var(--border);" />
              <div>
                <strong>${p.title}</strong><br/>
                <small style="color:var(--text-muted);">${p.subtitle}</small>
              </div>
            </div>
          </td>
          <td>${p.categoryLabel || p.category}</td>
          <td>${formatEUR(p.supplierCost)}</td>
          <td><strong>${formatEUR(p.price)}</strong></td>
          <td>
            <button class="supplier-link-btn" onclick="window.CaofradeApp.editProduct('${p.id}')">✏️ Editar</button>
            <a href="${p.supplierInfo?.aliexpressUrl || '#'}" target="_blank" rel="noopener" class="supplier-link-btn" style="background:var(--secondary-light); color:var(--secondary);">Fornecedor ↗</a>
            <button class="supplier-link-btn" style="background:#FEF2F2; color:#DC2626;" onclick="window.CaofradeApp.deleteProduct('${p.id}')">🗑️</button>
          </td>
        </tr>
      `
        )
        .join("");
    }

    // Suppliers Table (Tab 4)
    const tbody = document.getElementById("adminSuppliersTableBody");
    if (tbody) {
      tbody.innerHTML = products
        .map((p) => {
          const profit = +(p.price - p.supplierCost).toFixed(2);
          const marginPct = Math.round((profit / p.price) * 100);
          const zendropUrl = `https://app.zendrop.com/find-products?search=${encodeURIComponent(p.supplierInfo?.zendropQuery || p.title)}`;
          return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.images[0]}" alt="${p.title}" style="width:48px; height:48px; border-radius:8px; object-fit:contain; background:#fff; border:1px solid var(--border); padding:2px; flex-shrink:0;" />
                <div>
                  <strong>${p.title}</strong><br/>
                  <small style="color:var(--text-muted);">SKU: ${p.sku}</small>
                </div>
              </div>
            </td>
            <td><strong>${formatEUR(p.supplierCost)}</strong><br/><small style="color:var(--success);">c/ envio PT</small></td>
            <td><strong>${formatEUR(p.price)}</strong></td>
            <td>
              <strong style="color:var(--success);">+${formatEUR(profit)} (${marginPct}%)</strong>
            </td>
            <td style="max-width:250px; font-size:0.78rem; color:var(--text-body);">
              "${p.supplierInfo?.adHook || p.subtitle}"
            </td>
            <td>
              <a href="${p.supplierInfo?.aliexpressUrl || '#'}" target="_blank" rel="noopener" class="supplier-link-btn">Comprar no AliExpress ↗</a>
              <a href="${zendropUrl}" target="_blank" rel="noopener" class="supplier-link-btn" style="background:var(--secondary-light); color:var(--secondary);">Zendrop ↗</a>
            </td>
          </tr>
        `;
        })
        .join("");
    }

    // Orders Table (Tab 3)
    const ordersBody = document.getElementById("adminOrdersTableBody");
    if (ordersBody) {
      ordersBody.innerHTML = state.orders
        .map((o) => {
          const costTotal = o.items.reduce((s, i) => s + (i.supplierCost || 5) * i.qty, 0);
          const netProfit = +(o.total - costTotal).toFixed(2);
          return `
          <tr>
            <td><strong>#${o.id}</strong><br/><small>${o.date}</small></td>
            <td>
              <strong>${o.customer}</strong><br/>
              <small>${o.address}, ${o.postalCode} ${o.city}<br/>Tel: ${o.phone}</small>
            </td>
            <td>${o.items.map((i) => `${i.qty}x ${i.title} (${i.variant})`).join("<br/>")}</td>
            <td><strong>${formatEUR(o.total)}</strong><br/><small>${o.paymentMethod}</small></td>
            <td><strong style="color:var(--success);">+${formatEUR(netProfit)}</strong></td>
            <td>
              <button class="supplier-link-btn" onclick="window.CaofradeApp.copyCustomerAddress('${o.id}')">
                📋 Copiar Morada p/ AliExpress
              </button>
            </td>
          </tr>
        `;
        })
        .join("");
    }

    const totalProdEl = document.getElementById("adminStatTotalProducts");
    const avgMarginEl = document.getElementById("adminStatAvgMargin");
    const avgProfitEl = document.getElementById("adminStatAvgProfit");
    const totalOrdersEl = document.getElementById("adminStatTotalOrders");
    const tabOrderCount = document.getElementById("adminTabOrderCount");

    if (totalProdEl) totalProdEl.textContent = `${products.length} Artigos`;
    if (avgMarginEl) avgMarginEl.textContent = `${avgMarginPct}%`;
    if (avgProfitEl) avgProfitEl.textContent = `+${formatEUR(avgProfitEur)}`;
    if (totalOrdersEl) totalOrdersEl.textContent = state.orders.length;
    if (tabOrderCount) tabOrderCount.textContent = state.orders.length;

    updateProfitSimulator();
  }

  function updateProfitSimulator() {
    const dailyOrders = parseInt(document.getElementById("simDailyOrders")?.value || "8", 10);
    const avgTicket = parseFloat(document.getElementById("simAvgTicket")?.value || "42", 10);
    const cpaAds = parseFloat(document.getElementById("simCpaAds")?.value || "9", 10);

    const monthlyOrders = dailyOrders * 30;
    const monthlyRevenue = monthlyOrders * avgTicket;
    const productCost = monthlyRevenue * 0.24;
    const adSpend = monthlyOrders * cpaAds;
    const stripeFees = monthlyRevenue * 0.018;
    const netMonthlyProfit = monthlyRevenue - productCost - adSpend - stripeFees;

    const revEl = document.getElementById("simOutRevenue");
    const profitEl = document.getElementById("simOutNetProfit");
    const labelOrders = document.getElementById("simLabelDaily");
    if (labelOrders) labelOrders.textContent = `${dailyOrders} encomendas/dia (${monthlyOrders}/mês)`;
    if (revEl) revEl.textContent = formatEUR(monthlyRevenue);
    if (profitEl) profitEl.textContent = formatEUR(netMonthlyProfit);
  }

  function exportOrdersCSV() {
    const headers = [
      "Order ID",
      "Date",
      "Customer Name",
      "Email",
      "Phone",
      "Address",
      "Postal Code",
      "City",
      "Country",
      "SKU",
      "Product Title",
      "Variant",
      "Quantity",
      "Order Total EUR"
    ];

    const rows = [];
    state.orders.forEach((o) => {
      o.items.forEach((item) => {
        rows.push([
          o.id,
          o.date,
          `"${o.customer}"`,
          o.email,
          `"${o.phone}"`,
          `"${o.address}"`,
          o.postalCode,
          `"${o.city}"`,
          "PT",
          item.sku || "CF-ITEM",
          `"${item.title}"`,
          `"${item.variant}"`,
          item.qty,
          o.total.toFixed(2)
        ]);
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `caofrade_encomendas_dsers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Ficheiro CSV exportado para importar no DSers / Zendrop!");
  }

  function setCategory(cat) {
    state.category = cat;
    document.querySelectorAll(".filter-pill[data-cat]").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-cat") === cat);
    });
    renderCatalog();
  }

  function setPetFilter(pet) {
    state.petFilter = pet;
    renderCatalog();
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  }

  function resetFilters() {
    state.category = "todos";
    state.petFilter = "todos";
    state.search = "";
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    document.querySelectorAll(".filter-pill[data-cat]").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-cat") === "todos");
    });
    renderCatalog();
  }

  function addStarterBundleToCart() {
    addToCart("escova-vapor-3em1", "Branco Pérola", 1, 0.15);
    addToCart("rolo-tira-pelos-reutilizavel", "1x Rolo FurZero™ Pro", 1, 0.15);
    showToast("Pack Casa Sem Pelos Cãofrade adicionado com 15% de desconto + Portes Grátis!");
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderCatalog();
    updateCartUI();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.search = e.target.value;
        renderCatalog();
      });
    }

    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        renderCatalog();
      });
    }

    document.querySelectorAll(".faq-question").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.parentElement.classList.toggle("open");
      });
    });

    // Secret URL shortcut: www.caofrade.pt/?admin opens the owner login modal automatically
    const params = new URLSearchParams(window.location.search);
    if (params.has("admin") || window.location.hash === "#admin") {
      requestAdminAccess();
    }
  });

  window.CaofradeApp = {
    openProductModal,
    selectBundle,
    addFromModal,
    addToCart,
    updateQty,
    applyCoupon,
    openCartDrawer,
    closeCartDrawer,
    closeModal,
    openCheckoutModal,
    selectPaymentMethod,
    submitCheckout,
    openTrackingModal,
    lookupOrder,
    requestAdminAccess,
    verifyAdminLogin,
    logoutAdmin,
    switchAdminTab,
    openAdminModal,
    handleSaveProduct,
    editProduct,
    deleteProduct,
    resetProductForm,
    exportCatalogFile,
    copyCustomerAddress,
    copyCommTemplate,
    updateProfitSimulator,
    exportOrdersCSV,
    setCategory,
    setPetFilter,
    resetFilters,
    addStarterBundleToCart,
    showToast
  };
})();
