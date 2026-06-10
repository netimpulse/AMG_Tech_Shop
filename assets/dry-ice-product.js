/**
 * Trockeneis Produkt (dry-ice-product)
 * =====================================
 * Steuert die Kauf-Konfiguration der neuen Trockeneis-Produktsektion:
 *
 * - Varianten-Matching ueber Optionswerte (inkl. Verpackungs-Option)
 * - Lieferung: Selbstabholung (mit Box-Wahl) / Express (mit Carrier-Wahl)
 * - Varianten mit Metafield expresslieferung=false werden bei Express
 *   ausgeblendet (Kleinmengen nur Abholung), analog selbstabholung=false
 * - Preis-, Kilopreis-, Erspernis- und Summen-Anzeige
 * - Line-Item-Properties (Lieferoption, Versanddienstleister)
 *
 * Progressive Enhancement: ohne JS postet das Formular die
 * server-seitig vorausgewaehlte Variante.
 */
(function () {
  'use strict';

  class DryIceProduct extends HTMLElement {
    connectedCallback() {
      if (this.dipInitialized) return;
      this.dipInitialized = true;

      try {
        const dataEl = this.querySelector('[data-dip-variants]');
        this.variants = dataEl ? JSON.parse(dataEl.textContent) : [];
      } catch (e) {
        this.variants = [];
      }
      if (!this.variants.length) return;

      this.boxIndex = parseInt(this.dataset.boxIndex, 10);
      this.currency = this.dataset.currency || 'EUR';
      this.saveLabel = this.dataset.saveLabel || 'Sie sparen';
      this.optionCount = this.variants[0].opts.length;

      /* Nicht-Box-Werte der Verpackungs-Option ("Mit Box") als Default
         fuer Express ermitteln */
      this.boxValues = [];
      this.defaultBoxValue = null;
      if (this.boxIndex >= 0) {
        this.variants.forEach((v) => {
          const val = v.opts[this.boxIndex];
          if (val && this.boxValues.indexOf(val) === -1) this.boxValues.push(val);
        });
        this.defaultBoxValue =
          this.boxValues.find((v) => !/eigen/i.test(v)) || this.boxValues[0] || null;
      }

      /* DOM-Referenzen */
      this.priceEl = this.querySelector('[data-dip-price]');
      this.unitEl = this.querySelector('[data-dip-unit]');
      this.anfrageEl = this.querySelector('[data-dip-anfrage]');
      this.boxPanel = this.querySelector('[data-dip-box-panel]');
      this.carrierPanel = this.querySelector('[data-dip-carrier-panel]');
      this.carrierError = this.querySelector('[data-dip-carrier-error]');
      this.expressMeta = this.querySelector('[data-dip-express-meta]');
      this.summary = this.querySelector('[data-dip-summary]');
      this.variantInput = this.querySelector('[data-dip-variant-id]');
      this.propDelivery = this.querySelector('[data-dip-prop-delivery]');
      this.propCarrier = this.querySelector('[data-dip-prop-carrier]');
      this.atcBtn = this.querySelector('[data-dip-atc]');
      this.atcLabel = this.querySelector('[data-dip-atc-label]');
      this.form = this.querySelector('form.dip-form, form[action*="/cart/add"]');

      this.atcText = this.atcLabel ? this.atcLabel.textContent.trim() : 'In den Warenkorb';

      this.bindOptions();
      this.bindDelivery();
      this.bindBox();
      this.bindCarriers();
      this.bindGallery();
      this.bindForm();

      this.update();
    }

    /* ── Bindings ─────────────────────────────────────────── */

    bindOptions() {
      this.optionGroups = Array.from(this.querySelectorAll('[data-dip-option-group]'));
      this.optionGroups.forEach((group) => {
        group.addEventListener('change', () => this.update());
      });
    }

    bindDelivery() {
      this.methodCards = Array.from(this.querySelectorAll('[data-dip-method]'));
      this.methodCards.forEach((card) => {
        const input = card.querySelector('input[type="radio"]');
        if (!input) return;
        input.addEventListener('change', () => {
          if (this.carrierError) this.carrierError.hidden = true;
          this.update();
        });
      });
    }

    bindBox() {
      this.boxCards = Array.from(this.querySelectorAll('[data-dip-box]'));
      this.boxCards.forEach((card) => {
        const input = card.querySelector('input[type="radio"]');
        if (!input) return;
        input.addEventListener('change', () => this.update());
      });
    }

    bindCarriers() {
      this.carrierCards = Array.from(this.querySelectorAll('[data-dip-carrier]'));
      this.carrierCards.forEach((card) => {
        const input = card.querySelector('input[type="radio"]');
        if (!input) return;
        input.addEventListener('change', () => {
          if (this.carrierError) this.carrierError.hidden = true;
          this.update();
        });
      });
    }

    bindGallery() {
      const thumbs = Array.from(this.querySelectorAll('[data-dip-thumb]'));
      const slides = Array.from(this.querySelectorAll('[data-dip-slide]'));
      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const idx = thumb.getAttribute('data-dip-thumb');
          slides.forEach((s) => s.classList.toggle('is-active', s.getAttribute('data-dip-slide') === idx));
          thumbs.forEach((t) => t.classList.toggle('is-active', t === thumb));
        });
      });
    }

    bindForm() {
      if (!this.form) return;
      this.form.addEventListener('submit', (e) => {
        const state = this.readState();
        if (state.anfrage || !state.variant || !state.variant.available) {
          e.preventDefault();
          return;
        }
        if (state.method === 'express' && !state.carrier) {
          e.preventDefault();
          if (this.carrierError) this.carrierError.hidden = false;
          if (this.carrierPanel) this.carrierPanel.scrollIntoView({ block: 'center' });
        }
      });
    }

    /* ── State ────────────────────────────────────────────── */

    readState() {
      const selections = new Array(this.optionCount).fill(null);
      let anfrage = false;

      this.optionGroups.forEach((group) => {
        const idx = parseInt(group.getAttribute('data-option-index'), 10);
        const checked = group.querySelector('input:checked');
        if (!checked) return;
        if (checked.value === '__anfrage__') {
          anfrage = true;
        } else {
          selections[idx] = checked.value;
        }
      });

      const methodInput = this.querySelector('[data-dip-method] input:checked');
      const method = methodInput ? methodInput.value : null;

      let boxValue = null;
      if (this.boxIndex >= 0) {
        const boxInput = this.querySelector('[data-dip-box] input:checked');
        boxValue = method === 'express'
          ? this.defaultBoxValue
          : (boxInput ? boxInput.value : this.defaultBoxValue);
        selections[this.boxIndex] = boxValue;
      }

      const carrierCard = this.carrierCards && this.carrierCards.length
        ? this.carrierCards.find((c) => {
            const i = c.querySelector('input');
            return i && i.checked;
          })
        : null;
      const carrier = method === 'express' && carrierCard
        ? {
            name: carrierCard.getAttribute('data-name') || '',
            price: parseInt(carrierCard.getAttribute('data-price'), 10) || 0
          }
        : null;

      const variant = anfrage ? null : this.matchVariant(selections);

      return { selections, anfrage, method, boxValue, carrier, variant };
    }

    matchVariant(selections) {
      return (
        this.variants.find((v) =>
          v.opts.every((val, i) => selections[i] === null || val === selections[i])
        ) || null
      );
    }

    /** Beste verfuegbare Variante zu einem einzelnen Optionswert */
    variantsForValue(idx, value) {
      return this.variants.filter((v) => v.opts[idx] === value);
    }

    /* ── Update-Pipeline ──────────────────────────────────── */

    update() {
      let state = this.readState();

      /* 1. Pills ausblenden, die zur Liefermethode nicht passen
            (z. B. Kleinmengen nur Abholung) */
      if (state.method) {
        const flag = state.method === 'pickup' ? 'pickup' : 'express';
        let reselect = false;

        this.optionGroups.forEach((group) => {
          const idx = parseInt(group.getAttribute('data-option-index'), 10);
          const pills = Array.from(group.querySelectorAll('[data-dip-pill]'));
          pills.forEach((pill) => {
            const value = pill.getAttribute('data-value');
            if (value === '__anfrage__') return;
            const supported = this.variantsForValue(idx, value).some((v) => v[flag]);
            pill.hidden = !supported;
            const input = pill.querySelector('input');
            if (!supported && input && input.checked) {
              input.checked = false;
              reselect = true;
            }
          });

          if (reselect) {
            const firstVisible = pills.find((p) => !p.hidden);
            const input = firstVisible ? firstVisible.querySelector('input') : null;
            const anyChecked = group.querySelector('input:checked');
            if (input && !anyChecked) input.checked = true;
          }
        });

        if (reselect) state = this.readState();
      }

      /* 2. Panels ein-/ausblenden */
      if (this.boxPanel) this.boxPanel.hidden = state.method !== 'pickup';
      if (this.carrierPanel) this.carrierPanel.hidden = state.method !== 'express';

      /* 3. Auswahl-Optik (Fallback ohne :has) */
      this.querySelectorAll('.dip-pill, .dip-card').forEach((el) => {
        const input = el.querySelector('input[type="radio"]');
        el.classList.toggle('is-selected', !!(input && input.checked));
      });

      /* 4. Box-Preise + Erspernis */
      this.updateBoxPrices(state);

      /* 5. Preis + Kilopreis */
      this.updatePrice(state);

      /* 6. Zusammenfassung */
      this.updateSummary(state);

      /* 7. Formular */
      this.updateForm(state);

      /* 8. Anfrage-Hinweis */
      if (this.anfrageEl) this.anfrageEl.hidden = !state.anfrage;
    }

    updateBoxPrices(state) {
      if (this.boxIndex < 0 || !this.boxCards || !this.boxCards.length) return;

      const prices = {};
      this.boxCards.forEach((card) => {
        const value = card.getAttribute('data-value');
        const sel = state.selections.slice();
        sel[this.boxIndex] = value;
        const variant = state.anfrage ? null : this.matchVariant(sel);
        prices[value] = variant ? variant.price : null;

        const priceEl = card.querySelector('[data-dip-box-price]');
        if (priceEl) priceEl.textContent = variant ? this.money(variant.price) : '–';
      });

      /* Erspernis-Badge auf der "Eigene Box"-Karte */
      const ownCard = this.boxCards.find((c) => /eigen/i.test(c.getAttribute('data-value') || ''));
      if (ownCard && this.defaultBoxValue) {
        const saveEl = ownCard.querySelector('[data-dip-box-save]');
        const ownPrice = prices[ownCard.getAttribute('data-value')];
        const withPrice = prices[this.defaultBoxValue];
        if (saveEl) {
          if (ownPrice !== null && withPrice !== null && withPrice > ownPrice) {
            saveEl.textContent = this.saveLabel + ' ' + this.money(withPrice - ownPrice);
            saveEl.hidden = false;
          } else {
            saveEl.hidden = true;
          }
        }
      }
    }

    updatePrice(state) {
      if (!this.priceEl) return;

      if (state.anfrage) {
        this.priceEl.textContent = 'Auf Anfrage';
        if (this.unitEl) this.unitEl.textContent = '';
        return;
      }

      if (!state.variant) {
        this.priceEl.textContent = '–';
        if (this.unitEl) this.unitEl.textContent = '';
        return;
      }

      this.priceEl.textContent = this.money(state.variant.price);

      if (this.unitEl) {
        const kg = this.selectedKg(state);
        this.unitEl.textContent =
          kg > 0 ? '(' + this.money(state.variant.price / kg) + ' / kg)' : '';
      }
    }

    updateSummary(state) {
      if (!this.summary) return;

      const productLabel = this.summary.querySelector('[data-dip-sum-product-label]');
      const productValue = this.summary.querySelector('[data-dip-sum-product-value]');
      const shipValue = this.summary.querySelector('[data-dip-sum-ship-value]');
      const totalEl = this.summary.querySelector('[data-dip-sum-total]');

      if (state.anfrage || !state.variant) {
        if (productLabel) productLabel.textContent = '–';
        if (productValue) productValue.textContent = '–';
        if (shipValue) shipValue.textContent = '–';
        if (totalEl) totalEl.textContent = state.anfrage ? 'Auf Anfrage' : '–';
        return;
      }

      const parts = state.variant.opts.filter(Boolean);
      if (productLabel) productLabel.textContent = parts.join(', ');
      if (productValue) productValue.textContent = this.money(state.variant.price);

      let shipping = 0;
      let shipText = '–';
      if (state.method === 'pickup') {
        shipText = 'Selbstabholung – Kostenlos';
      } else if (state.method === 'express' && state.carrier) {
        if (state.carrier.price > 0) {
          shipping = state.carrier.price;
          shipText = state.carrier.name + ' – ' + this.money(shipping);
        } else {
          shipText = state.carrier.name + ' – auf Anfrage';
        }
      } else if (state.method === 'express') {
        shipText = 'Dienstleister wählen';
      }
      if (shipValue) shipValue.textContent = shipText;

      if (totalEl) {
        let total = this.money(state.variant.price + shipping);
        if (state.method === 'express' && state.carrier && state.carrier.price === 0) {
          total += ' zzgl. Versand';
        }
        totalEl.textContent = total;
      }

      if (this.expressMeta && state.method === 'express' && state.carrier) {
        this.expressMeta.textContent = state.carrier.name;
      }
    }

    updateForm(state) {
      if (this.variantInput && state.variant) this.variantInput.value = state.variant.id;

      if (this.propDelivery) {
        if (state.method) {
          this.propDelivery.disabled = false;
          this.propDelivery.value =
            state.method === 'pickup' ? 'Selbstabholung' : 'Expresslieferung';
        } else {
          this.propDelivery.disabled = true;
        }
      }

      if (this.propCarrier) {
        if (state.method === 'express' && state.carrier) {
          this.propCarrier.disabled = false;
          this.propCarrier.value = state.carrier.name;
        } else {
          this.propCarrier.disabled = true;
          this.propCarrier.value = '';
        }
      }

      if (this.atcBtn) {
        const purchasable = !state.anfrage && state.variant && state.variant.available;
        this.atcBtn.disabled = !purchasable;
        if (this.atcLabel) {
          if (state.anfrage) {
            this.atcLabel.textContent = 'Auf Anfrage';
          } else if (!state.variant) {
            this.atcLabel.textContent = 'Nicht verfügbar';
          } else if (!state.variant.available) {
            this.atcLabel.textContent = 'Ausverkauft';
          } else {
            this.atcLabel.textContent = this.atcText;
          }
        }
      }

      /* Variante in der URL halten (Reload/Teilen) */
      if (state.variant && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', state.variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }

    /* ── Helpers ──────────────────────────────────────────── */

    selectedKg(state) {
      for (let i = 0; i < this.optionGroups.length; i++) {
        const group = this.optionGroups[i];
        const idx = parseInt(group.getAttribute('data-option-index'), 10);
        const label = (group.querySelector('.dip-group__label') || {}).textContent || '';
        if (!/gewicht|menge|kg/i.test(label)) continue;
        const value = state.selections[idx];
        if (!value) continue;
        const m = String(value).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
        if (m) return parseFloat(m[1]);
      }
      return 0;
    }

    money(cents) {
      const locale = document.documentElement.lang || 'de-DE';
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: this.currency
        }).format(cents / 100);
      } catch (e) {
        return (cents / 100).toFixed(2) + ' ' + this.currency;
      }
    }
  }

  if (!customElements.get('dry-ice-product')) {
    customElements.define('dry-ice-product', DryIceProduct);
  }

  /* Theme-Editor: Section-Reload neu initialisieren */
  document.addEventListener('shopify:section:load', (e) => {
    const el = e.target.querySelector('dry-ice-product');
    if (el) {
      el.dipInitialized = false;
      el.connectedCallback();
    }
  });
})();
