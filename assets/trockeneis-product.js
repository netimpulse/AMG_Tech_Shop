/**
 * Trockeneis Product – Interaktive Produktseite (v3)
 * ====================================================
 * Robust variant matching via lookup map.
 * option1 = Pelletgröße, option2 = Menge (kg).
 * Prices update on every selection change.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var roots = document.querySelectorAll('[data-trockeneis-section]');
    roots.forEach(initSection);
  });

  function initSection(root) {
    /* ── DOM refs ──────────────────────────────────── */
    var sizeInputs    = root.querySelectorAll('[name="te-size"]');
    var qtyInputs     = root.querySelectorAll('[name="te-qty"]');
    var priceEl       = root.querySelector('[data-te-price]');
    var unitPriceEl   = root.querySelector('[data-te-unit-price]');
    var priceInfoEl   = root.querySelector('[data-te-price-info]');
    var anfragHint    = root.querySelector('[data-te-anfrage-hint]');
    var addBtn        = root.querySelector('[data-te-add-btn]');
    var shipMethods   = root.querySelectorAll('[data-ship-method]');
    var pickupMethod  = root.querySelector('[data-ship-method="pickup"]');
    var expressMethod = root.querySelector('[data-ship-method="express"]');
    var carriers      = root.querySelectorAll('[data-carrier]');
    var carriersWrap  = root.querySelector('[data-te-carriers]');
    var summaryEl     = root.querySelector('[data-te-summary]');
    var variantInput  = root.querySelector('[data-te-variant-id]');
    var shippingProp  = root.querySelector('[data-te-shipping-prop]');
    var carrierProp   = root.querySelector('[data-te-carrier-prop]');

    /* ── Eigene-Box-Toggle refs ── */
    var ownBoxWrap    = root.querySelector('[data-te-own-box]');
    var ownBoxToggle  = root.querySelector('[data-te-own-box-toggle]');
    var ownBoxHint    = root.querySelector('[data-te-own-box-hint]');
    var ownBoxProp    = root.querySelector('[data-te-own-box-prop]');

    /* ── Variant data from Liquid (embedded as data attr) ── */
    var variants = [];
    try {
      variants = JSON.parse(root.getAttribute('data-variant-data') || '[]');
    } catch (e) { /* fallback: empty */ }

    /* ── Per-kg configuration (delivery options + grey note per kg size) ── */
    var kgConfig = {};
    try {
      kgConfig = JSON.parse(root.getAttribute('data-kg-config') || '{}') || {};
    } catch (e) { /* fallback: empty */ }

    var defaultNote = root.getAttribute('data-default-note') || '';

    /* ── Weight-based shipping config ── */
    var weightBasedShipping = root.getAttribute('data-weight-based') === 'true';
    var pricePerKg = parseFloat((root.getAttribute('data-price-per-kg') || '0').replace(',', '.')) || 0;

    /* ── "Eigene Box" discount (EUR, deducted from product price on pickup) ── */
    var ownBoxDiscount = parseFloat((root.getAttribute('data-own-box-discount') || '0').replace(',', '.')) || 0;

    /* ── Build variant lookup map ─────────────────── */
    var variantMap = {};
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var k1 = norm(v.option1 || '');
      var k2 = norm(v.option2 || '');
      // Store with option1|option2 key
      variantMap[k1 + '|' + k2] = v;
      // Also store reverse for safety
      if (k2) {
        variantMap[k2 + '|' + k1] = v;
      }
      // Single-option product: key with empty option2
      if (!v.option2) {
        variantMap[k1 + '|'] = v;
      }
    }

    /* ── State ────────────────────────────────────── */
    var state = {
      size: '',
      qty: '',
      isAnfrage: false,
      shipMethod: '',
      carrier: '',
      carrierName: '',
      productPrice: 0,
      shippingPrice: 0,
      ownBox: false,
      currentVariant: null
    };

    /* ── Init default selection ───────────────────── */
    var checkedSize = root.querySelector('[name="te-size"]:checked');
    if (checkedSize) state.size = checkedSize.value;

    var checkedQty = root.querySelector('[name="te-qty"]:checked');
    if (checkedQty) {
      if (checkedQty.value === 'anfrage') {
        state.isAnfrage = true;
      } else {
        state.qty = checkedQty.value;
      }
    }

    /* ── Event handlers ───────────────────────────── */
    sizeInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        state.size = input.value;
        findAndSetVariant();
      });
    });

    qtyInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.value === 'anfrage') {
          state.isAnfrage = true;
          state.qty = '';
        } else {
          state.isAnfrage = false;
          state.qty = input.value;
        }
        findAndSetVariant();
      });
    });

    /* Shipping method selection */
    shipMethods.forEach(function (method) {
      var header = method.querySelector('.te-ship-method__header');
      if (!header) return;

      function handleSelect() {
        var type = method.getAttribute('data-ship-method');
        state.shipMethod = type;

        shipMethods.forEach(function (m) { m.classList.remove('is-selected'); });
        method.classList.add('is-selected');

        if (shippingProp) {
          shippingProp.value = type === 'pickup' ? 'Selbstabholung' : 'Expresslieferung';
        }

        if (carriersWrap) {
          if (type === 'express') {
            carriersWrap.classList.add('is-open');
          } else {
            carriersWrap.classList.remove('is-open');
            state.carrier = '';
            state.carrierName = '';
            state.shippingPrice = 0;
            if (carrierProp) carrierProp.value = '';
            carriers.forEach(function (c) { c.classList.remove('is-selected'); });
          }
        }

        /* "Eigene Box"-Toggle nur bei Selbstabholung zeigen */
        if (ownBoxWrap) {
          if (type === 'pickup') {
            ownBoxWrap.hidden = false;
            state.ownBox = !!(ownBoxToggle && ownBoxToggle.checked);
          } else {
            ownBoxWrap.hidden = true;
            state.ownBox = false;
            if (ownBoxToggle) ownBoxToggle.checked = false;
            if (ownBoxProp) ownBoxProp.value = '';
          }
        }

        updatePriceDisplay();
        updateSummary();
      }

      header.addEventListener('click', handleSelect);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });
    });

    /* Carrier selection + accordion */
    carriers.forEach(function (carrier) {
      var header = carrier.querySelector('.te-carrier__header');
      if (!header) return;

      header.addEventListener('click', function () {
        var id = carrier.getAttribute('data-carrier');

        if (state.carrier === id) {
          carrier.classList.toggle('is-expanded');
          return;
        }

        state.carrier = id;
        var nameEl = carrier.querySelector('.te-carrier__name');
        state.carrierName = nameEl ? nameEl.textContent.trim() : id.toUpperCase();
        carriers.forEach(function (c) {
          c.classList.remove('is-selected', 'is-expanded');
        });
        carrier.classList.add('is-selected', 'is-expanded');

        var priceStr = carrier.getAttribute('data-carrier-price') || '0';
        state.shippingPrice = parseFloat(priceStr.replace(',', '.')) || 0;

        if (carrierProp) carrierProp.value = state.carrierName;

        updateSummary();
      });
    });

    /* "Eigene Box" toggle – nur bei Selbstabholung relevant */
    if (ownBoxToggle) {
      ownBoxToggle.addEventListener('change', function () {
        state.ownBox = ownBoxToggle.checked && state.shipMethod === 'pickup';
        if (ownBoxProp) {
          ownBoxProp.value = state.ownBox ? 'Ja (eigene Box, Isolierbox entfällt)' : '';
        }
        updatePriceDisplay();
        updateSummary();
      });
    }

    /* ── Find matching variant (map-based) ────────── */
    function findAndSetVariant() {
      if (state.isAnfrage) {
        if (priceEl) priceEl.textContent = 'Auf Anfrage';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (anfragHint) anfragHint.classList.add('is-visible');
        if (addBtn) {
          addBtn.disabled = true;
          setBtnText('Auf Anfrage');
        }
        updateSummary();
        return;
      }

      if (anfragHint) anfragHint.classList.remove('is-visible');

      /* Apply per-kg delivery options + grey note for the selected kg size */
      applyKgConfig();

      /* Look up variant via map */
      var sizeKey = norm(state.size);
      var qtyKey = norm(state.qty);
      var matched = null;

      if (qtyKey) {
        // Two-option product: try both key orderings
        matched = variantMap[sizeKey + '|' + qtyKey] || variantMap[qtyKey + '|' + sizeKey] || null;
      }

      // Fallback: single-option product (no qty option)
      if (!matched && !qtyKey) {
        matched = variantMap[sizeKey + '|'] || null;
      }

      // Fallback: title-based partial matching
      if (!matched) {
        for (var j = 0; j < variants.length; j++) {
          var vf = variants[j];
          var t = norm(vf.title || '');
          if (t.indexOf(sizeKey) !== -1 && (qtyKey === '' || t.indexOf(qtyKey) !== -1)) {
            matched = vf;
            break;
          }
        }
      }

      state.currentVariant = matched;

      if (matched) {
        if (variantInput) variantInput.value = matched.id;

        state.productPrice = matched.price / 100;
        updatePriceDisplay();

        if (addBtn) {
          addBtn.disabled = !matched.available;
          setBtnText(matched.available ? 'In den Warenkorb' : 'Ausverkauft');
        }
      } else {
        state.productPrice = 0;
        if (priceEl) priceEl.textContent = '–';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (addBtn) {
          addBtn.disabled = true;
          setBtnText('Nicht verfügbar');
        }
      }

      updateSummary();
    }

    /* ── Effective product price (incl. "eigene Box" discount on pickup) ── */
    function getEffectivePrice() {
      var price = state.productPrice;
      if (state.ownBox && state.shipMethod === 'pickup' && ownBoxDiscount > 0) {
        price = Math.max(0, price - ownBoxDiscount);
      }
      return price;
    }

    /* ── Update the big price + per-kg unit price ── */
    function updatePriceDisplay() {
      if (state.isAnfrage || !state.currentVariant) return;

      var effective = getEffectivePrice();

      if (priceEl) priceEl.textContent = formatCurrency(effective);

      /* Per-kg unit price */
      var kg = extractKg(state.qty);
      if (unitPriceEl) {
        unitPriceEl.textContent = kg > 0 ? formatCurrency(effective / kg) + ' / kg' : '';
      }

      /* Hint next to the toggle, e.g. "−5,00 €" */
      if (ownBoxHint) {
        ownBoxHint.textContent = ownBoxDiscount > 0 ? ' (−' + formatCurrency(ownBoxDiscount) + ')' : '';
      }
    }

    /* ── Apply per-kg delivery options + grey note ── */
    function applyKgConfig() {
      var cfg = kgConfig[norm(state.qty)] || null;

      /* Grey note under price */
      if (priceInfoEl) {
        var note = cfg && cfg.note ? cfg.note : defaultNote;
        priceInfoEl.textContent = note;
      }

      /* Delivery option availability for this kg size */
      var delivery = cfg && cfg.delivery ? cfg.delivery : 'both';
      var allowPickup = delivery === 'pickup' || delivery === 'both';
      var allowExpress = delivery === 'express' || delivery === 'both';

      setMethodVisible(pickupMethod, allowPickup);
      setMethodVisible(expressMethod, allowExpress);

      /* If the currently selected method is no longer allowed, switch / reset */
      if (state.shipMethod === 'pickup' && !allowPickup) {
        resetShipMethod();
        if (allowExpress && expressMethod) selectShipMethod(expressMethod);
      } else if (state.shipMethod === 'express' && !allowExpress) {
        resetShipMethod();
        if (allowPickup && pickupMethod) selectShipMethod(pickupMethod);
      }
    }

    function setMethodVisible(method, visible) {
      if (!method) return;
      method.hidden = !visible;
    }

    /* Reset shipping selection state (used when a method becomes unavailable) */
    function resetShipMethod() {
      state.shipMethod = '';
      state.carrier = '';
      state.carrierName = '';
      state.shippingPrice = 0;
      state.ownBox = false;
      shipMethods.forEach(function (m) { m.classList.remove('is-selected'); });
      carriers.forEach(function (c) { c.classList.remove('is-selected', 'is-expanded'); });
      if (carriersWrap) carriersWrap.classList.remove('is-open');
      if (shippingProp) shippingProp.value = '';
      if (carrierProp) carrierProp.value = '';
      if (ownBoxProp) ownBoxProp.value = '';
      if (ownBoxToggle) ownBoxToggle.checked = false;
      if (ownBoxWrap) ownBoxWrap.hidden = true;
    }

    /* Programmatically select a shipping method (re-uses the header click logic) */
    function selectShipMethod(method) {
      var header = method.querySelector('.te-ship-method__header');
      if (header) header.click();
    }

    /* ── Summary ──────────────────────────────────── */
    function updateSummary() {
      if (!summaryEl) return;

      if (state.isAnfrage || !state.shipMethod || !state.currentVariant) {
        summaryEl.classList.remove('is-visible');
        return;
      }

      summaryEl.classList.add('is-visible');

      var productLine  = summaryEl.querySelector('[data-summary-product]');
      var shippingLine = summaryEl.querySelector('[data-summary-shipping]');
      var totalLine    = summaryEl.querySelector('[data-summary-total]');

      var effectivePrice = getEffectivePrice();

      if (productLine) {
        var label = state.size;
        if (state.qty) label += ', ' + state.qty;
        if (state.ownBox && state.shipMethod === 'pickup' && ownBoxDiscount > 0) {
          label += ' (eigene Box)';
        }
        productLine.querySelector('.te-summary__label').textContent = label;
        productLine.querySelector('.te-summary__value').textContent = formatCurrency(effectivePrice);
      }

      var shipCost = 0;
      var selectedKg = extractKg(state.qty);

      if (state.shipMethod === 'pickup') {
        shipCost = 0;
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Selbstabholung';
          shippingLine.querySelector('.te-summary__value').textContent = 'Kostenlos';
        }
      } else if (state.shipMethod === 'express' && state.carrier) {
        if (weightBasedShipping && pricePerKg > 0 && selectedKg > 0) {
          shipCost = pricePerKg * selectedKg;
        } else {
          shipCost = state.shippingPrice;
        }
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Express (' + state.carrierName + ')';
          shippingLine.querySelector('.te-summary__value').textContent = shipCost > 0 ? formatCurrency(shipCost) : 'auf Anfrage';
        }
      } else if (state.shipMethod === 'express') {
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Expresslieferung';
          shippingLine.querySelector('.te-summary__value').textContent = 'Dienstleister wählen';
        }
      }

      if (totalLine) {
        var total = effectivePrice + shipCost;
        totalLine.querySelector('.te-summary__value').textContent = formatCurrency(total);
      }
    }

    /* ── Helpers ──────────────────────────────────── */

    /** Normalize a string for variant matching: lowercase, strip spaces, commas→dots */
    function norm(str) {
      return String(str).toLowerCase().trim()
        .replace(/\s+/g, '')
        .replace(/,/g, '.');
    }

    /** Extract numeric kg from string like "5 kg", "10kg", "15 Kg" */
    function extractKg(str) {
      var m = String(str).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }

    /** Format EUR currency */
    function formatCurrency(val) {
      return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    /** Set button text (preserving SVG icon) */
    function setBtnText(text) {
      if (!addBtn) return;
      var svg = addBtn.querySelector('svg');
      // Clear text nodes
      var nodes = addBtn.childNodes;
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].nodeType === 3) { // text node
          addBtn.removeChild(nodes[i]);
        }
      }
      // Add new text after SVG
      var textNode = document.createTextNode('\n            ' + text + '\n          ');
      if (svg && svg.nextSibling) {
        addBtn.insertBefore(textNode, svg.nextSibling);
      } else {
        addBtn.appendChild(textNode);
      }
    }

    /* ── Initial render ───────────────────────────── */
    findAndSetVariant();
  }
})();
