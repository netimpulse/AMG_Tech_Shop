/**
 * Trockeneis Product – Interaktive Produktseite (v2)
 * ====================================================
 * Variantenbasierte Preisberechnung über Shopify-Varianten.
 * Matcht option1 (Pelletgröße) und option2 (Menge) dynamisch.
 * Speichert Lieferpräferenz als Line Item Properties.
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
    var anfragHint    = root.querySelector('[data-te-anfrage-hint]');
    var addBtn        = root.querySelector('[data-te-add-btn]');
    var shipMethods   = root.querySelectorAll('[data-ship-method]');
    var carriers      = root.querySelectorAll('[data-carrier]');
    var carriersWrap  = root.querySelector('[data-te-carriers]');
    var summaryEl     = root.querySelector('[data-te-summary]');
    var variantInput  = root.querySelector('[data-te-variant-id]');
    var shippingProp  = root.querySelector('[data-te-shipping-prop]');
    var carrierProp   = root.querySelector('[data-te-carrier-prop]');

    /* ── Variant data from Liquid (embedded as data attr) ── */
    var variants = [];
    try {
      variants = JSON.parse(root.getAttribute('data-variant-data') || '[]');
    } catch (e) { /* fallback: empty */ }

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
      currentVariant: null
    };

    /* ── Init default selection ───────────────────── */
    if (sizeInputs.length) {
      var checkedSize = root.querySelector('[name="te-size"]:checked');
      if (checkedSize) state.size = checkedSize.value;
    }
    if (qtyInputs.length) {
      var checkedQty = root.querySelector('[name="te-qty"]:checked');
      if (checkedQty) {
        if (checkedQty.value === 'anfrage') {
          state.isAnfrage = true;
        } else {
          state.qty = checkedQty.value;
        }
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

        /* Toggle selected state */
        shipMethods.forEach(function (m) { m.classList.remove('is-selected'); });
        method.classList.add('is-selected');

        /* Update line item property */
        if (shippingProp) {
          shippingProp.value = type === 'pickup' ? 'Selbstabholung' : 'Expresslieferung';
        }

        /* Show/hide carrier panel */
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

        /* If already selected, toggle expand */
        if (state.carrier === id) {
          carrier.classList.toggle('is-expanded');
          return;
        }

        /* Select this carrier */
        state.carrier = id;
        var nameEl = carrier.querySelector('.te-carrier__name');
        state.carrierName = nameEl ? nameEl.textContent.trim() : id.toUpperCase();
        carriers.forEach(function (c) {
          c.classList.remove('is-selected', 'is-expanded');
        });
        carrier.classList.add('is-selected', 'is-expanded');

        /* Parse shipping price */
        var priceStr = carrier.getAttribute('data-carrier-price') || '0';
        state.shippingPrice = parseFloat(priceStr.replace(',', '.')) || 0;

        /* Update line item property */
        if (carrierProp) carrierProp.value = state.carrierName;

        updateSummary();
      });
    });

    /* ── Find matching variant ─────────────────────── */
    function findAndSetVariant() {
      if (state.isAnfrage) {
        if (priceEl) priceEl.textContent = 'Auf Anfrage';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (anfragHint) anfragHint.classList.add('is-visible');
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.querySelector('svg + *') || (addBtn.textContent = 'Auf Anfrage');
        }
        updateSummary();
        return;
      }

      if (anfragHint) anfragHint.classList.remove('is-visible');

      /* Find variant by matching option1 and option2 */
      var matched = null;
      var sizeNorm = normalize(state.size);
      var qtyNorm = normalize(state.qty);

      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var o1 = normalize(v.option1 || '');
        var o2 = normalize(v.option2 || '');

        /* Match: option1=size, option2=qty (or vice versa) */
        if (o1 === sizeNorm && o2 === qtyNorm) {
          matched = v;
          break;
        }
        if (o1 === qtyNorm && o2 === sizeNorm) {
          matched = v;
          break;
        }
        /* Single option product: match option1 only */
        if (variants.length > 0 && !v.option2 && o1 === sizeNorm) {
          matched = v;
          break;
        }
      }

      /* Fallback: try partial matching */
      if (!matched) {
        for (var j = 0; j < variants.length; j++) {
          var vf = variants[j];
          var t = normalize(vf.title || '');
          if (t.indexOf(sizeNorm) !== -1 && t.indexOf(qtyNorm) !== -1) {
            matched = vf;
            break;
          }
        }
      }

      state.currentVariant = matched;

      if (matched) {
        /* Update variant ID in form */
        if (variantInput) variantInput.value = matched.id;

        /* Update price display (Shopify prices are in cents) */
        var priceInEur = matched.price / 100;
        state.productPrice = priceInEur;

        if (priceEl) priceEl.textContent = formatCurrency(priceInEur);

        /* Calculate per-kg price */
        var kgMatch = state.qty.match(/(\d+)/);
        if (kgMatch && unitPriceEl) {
          var kg = parseInt(kgMatch[1], 10);
          if (kg > 0) {
            unitPriceEl.textContent = formatCurrency(priceInEur / kg) + ' / kg';
          }
        }

        /* Update button */
        if (addBtn) {
          addBtn.disabled = !matched.available;
          var btnTextNode = addBtn.lastChild;
          if (btnTextNode && btnTextNode.nodeType === 3) {
            btnTextNode.textContent = matched.available ? '\n            In den Warenkorb\n          ' : '\n            Ausverkauft\n          ';
          }
        }
      } else {
        /* No matching variant found */
        state.productPrice = 0;
        if (priceEl) priceEl.textContent = '–';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (addBtn) addBtn.disabled = true;
      }

      updateSummary();
    }

    /* ── Summary ──────────────────────────────────── */
    function updateSummary() {
      if (!summaryEl) return;

      if (state.isAnfrage || !state.shipMethod || !state.currentVariant) {
        summaryEl.classList.remove('is-visible');
        return;
      }

      summaryEl.classList.add('is-visible');

      var productLine = summaryEl.querySelector('[data-summary-product]');
      var shippingLine = summaryEl.querySelector('[data-summary-shipping]');
      var totalLine = summaryEl.querySelector('[data-summary-total]');

      if (productLine) {
        var sizeLabel = state.size.replace('mm', ' mm').replace('1.5', '1,5');
        productLine.querySelector('.te-summary__label').textContent =
          sizeLabel + ' Pellets, ' + state.qty;
        productLine.querySelector('.te-summary__value').textContent =
          formatCurrency(state.productPrice);
      }

      var shipCost = 0;
      if (state.shipMethod === 'pickup') {
        shipCost = 0;
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Selbstabholung';
          shippingLine.querySelector('.te-summary__value').textContent = 'Kostenlos';
        }
      } else if (state.shipMethod === 'express' && state.carrier) {
        shipCost = state.shippingPrice;
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent =
            'Express (' + state.carrierName + ')';
          shippingLine.querySelector('.te-summary__value').textContent =
            shipCost > 0 ? formatCurrency(shipCost) : 'auf Anfrage';
        }
      } else if (state.shipMethod === 'express') {
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Expresslieferung';
          shippingLine.querySelector('.te-summary__value').textContent = 'Dienstleister wählen';
        }
      }

      if (totalLine) {
        var total = state.productPrice + shipCost;
        totalLine.querySelector('.te-summary__value').textContent = formatCurrency(total);
      }
    }

    /* ── Helpers ──────────────────────────────────── */
    function normalize(str) {
      return String(str).toLowerCase().trim()
        .replace(/\s+/g, '')
        .replace(/,/g, '.');
    }

    function formatCurrency(val) {
      return val.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR'
      });
    }

    /* ── Initial render ───────────────────────────── */
    findAndSetVariant();
  }
})();
