/**
 * Produkt-Info Block – JavaScript (v2)
 * =====================================
 * Handles:
 * - Variant selection (option dropdowns → find matching variant)
 * - Price updates (price, compare_at_price, unit_price)
 * - Featured image switching (variant image + thumbnail gallery)
 * - Availability status updates
 * - Add-to-cart button state
 * - Quantity +/- buttons
 * - AJAX add-to-cart with spinner feedback
 */

(function () {
  'use strict';

  document.querySelectorAll('[data-pib-section]').forEach(initSection);

  function initSection(section) {
    var variants = [];
    try {
      variants = JSON.parse(section.getAttribute('data-pib-variants') || '[]');
    } catch (e) {
      console.warn('PIB: Could not parse variants', e);
      return;
    }

    var moneyFormat = section.getAttribute('data-pib-money-format') || '{{amount}} EUR';

    // DOM refs
    var optionSelects = section.querySelectorAll('[data-pib-option]');
    var variantIdInput = section.querySelector('[data-pib-variant-id]');
    var priceEl = section.querySelector('[data-pib-price]');
    var comparePriceEl = section.querySelector('[data-pib-compare-price]');
    var unitPriceEl = section.querySelector('[data-pib-unit-price]');
    var availabilityEl = section.querySelector('[data-pib-availability]');
    var addBtn = section.querySelector('[data-pib-add-btn]');
    var addText = section.querySelector('[data-pib-add-text]');
    var spinner = section.querySelector('[data-pib-spinner]');
    var featuredImage = section.querySelector('[data-pib-featured-image]');
    var form = section.querySelector('[data-pib-form]');
    var qtyInput = section.querySelector('[data-pib-quantity]');
    var qtyMinus = section.querySelector('[data-pib-qty-minus]');
    var qtyPlus = section.querySelector('[data-pib-qty-plus]');
    var thumbs = section.querySelectorAll('[data-pib-thumb]');

    // ── Variant Selection ──
    optionSelects.forEach(function (select) {
      select.addEventListener('change', onOptionChange);
    });

    function onOptionChange() {
      var selectedOptions = [];
      optionSelects.forEach(function (sel) {
        selectedOptions.push(sel.value);
      });

      var matched = findVariant(selectedOptions);
      if (matched) {
        updateVariant(matched);
      }
    }

    function findVariant(selectedOptions) {
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        for (var j = 0; j < selectedOptions.length; j++) {
          if (v.options[j] !== selectedOptions[j]) {
            match = false;
            break;
          }
        }
        if (match) return v;
      }
      return null;
    }

    function updateVariant(variant) {
      // Update hidden variant ID
      if (variantIdInput) {
        variantIdInput.value = variant.id;
      }

      // Update price
      if (priceEl) {
        priceEl.textContent = formatMoney(variant.price, moneyFormat);
      }

      // Update compare-at price
      if (comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          comparePriceEl.textContent = formatMoney(variant.compare_at_price, moneyFormat);
          comparePriceEl.style.display = '';
        } else {
          comparePriceEl.style.display = 'none';
        }
      }

      // Update unit price
      if (unitPriceEl) {
        if (variant.unit_price) {
          var m = variant.unit_price_measurement;
          unitPriceEl.textContent = formatMoney(variant.unit_price, moneyFormat) + ' / ' + (m ? m.reference_value + m.reference_unit : '');
          unitPriceEl.style.display = '';
        } else {
          unitPriceEl.style.display = 'none';
        }
      }

      // Update availability
      if (availabilityEl) {
        if (variant.available) {
          availabilityEl.innerHTML =
            '<span class="pib__availability-dot pib__availability-dot--in-stock"></span>' +
            '<span>Auf Lager</span>';
        } else {
          availabilityEl.innerHTML =
            '<span class="pib__availability-dot pib__availability-dot--out-of-stock"></span>' +
            '<span>Ausverkauft</span>';
        }
      }

      // Update button
      if (addBtn) {
        addBtn.disabled = !variant.available;
      }
      if (addText) {
        addText.textContent = variant.available ? (addBtn.closest('form').dataset.addText || 'In den Warenkorb') : 'Ausverkauft';
      }

      // Update featured image
      if (featuredImage && variant.featured_image) {
        featuredImage.src = variant.featured_image;
      }

      // Update URL without reload
      if (history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      }
    }

    // ── Thumbnail Gallery ──
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var src = this.getAttribute('data-pib-thumb-src');
        if (featuredImage && src) {
          featuredImage.src = src;
        }
        // Update active state
        thumbs.forEach(function (t) { t.classList.remove('pib__thumbnail--active'); });
        this.classList.add('pib__thumbnail--active');
      });
    });

    // ── Quantity Buttons ──
    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener('click', function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        if (val > 1) qtyInput.value = val - 1;
      });
    }
    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener('click', function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        if (val < 99) qtyInput.value = val + 1;
      });
    }

    // ── AJAX Add-to-Cart ──
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (addBtn && addBtn.disabled) return;

        // Show spinner
        if (addText) addText.style.display = 'none';
        if (spinner) spinner.style.display = '';
        if (addBtn) addBtn.disabled = true;

        var formData = new FormData(form);
        var body = {
          id: parseInt(formData.get('id'), 10),
          quantity: parseInt(formData.get('quantity') || '1', 10)
        };

        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(body)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Add to cart failed');
            return res.json();
          })
          .then(function () {
            // Success: update cart count in header
            updateCartCount();

            // Brief success state
            if (addText) {
              addText.textContent = 'Hinzugefuegt!';
              addText.style.display = '';
            }
            if (spinner) spinner.style.display = 'none';

            setTimeout(function () {
              if (addText) addText.textContent = 'In den Warenkorb';
              if (addBtn) addBtn.disabled = false;
            }, 1500);
          })
          .catch(function (err) {
            console.error('PIB: Add to cart error', err);
            if (addText) {
              addText.textContent = 'Fehler – bitte erneut versuchen';
              addText.style.display = '';
            }
            if (spinner) spinner.style.display = 'none';
            if (addBtn) addBtn.disabled = false;

            setTimeout(function () {
              if (addText) addText.textContent = 'In den Warenkorb';
            }, 2000);
          });
      });
    }
  }

  // ── Update Cart Count (Shopify standard) ──
  function updateCartCount() {
    fetch('/cart.js', {
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        // Update all cart count bubbles on the page
        document.querySelectorAll('.cart-count-bubble span[aria-hidden="true"]').forEach(function (el) {
          el.textContent = cart.item_count;
        });
        // Also try standard Dawn cart-icon-bubble
        var bubble = document.getElementById('cart-icon-bubble');
        if (bubble) {
          var countEl = bubble.querySelector('[aria-hidden="true"]');
          if (countEl) countEl.textContent = cart.item_count;
        }
      })
      .catch(function () { /* silent */ });
  }

  // ── Money Formatter ──
  function formatMoney(cents, format) {
    var amount = (cents / 100).toFixed(2).replace('.', ',');
    return format
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount)
      .replace('{{amount_no_decimals_with_comma_separator}}', Math.round(cents / 100));
  }
})();
