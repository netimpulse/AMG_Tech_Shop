/**
 * Trockeneis Product – Interaktive Produktseite (v4)
 * ====================================================
 * - Robustes Variant-Matching via Lookup-Map (option1 = Pelletgröße, option2 = Menge).
 * - Preis-Update bei jeder Auswahl.
 * - Lieferart (Selbstabholung / Express) + sortier-/ausblendbare Versanddienstleister.
 * - Option „Eigene Box mitbringen" (Anzeige-Rabatt + Bestellnotiz).
 * - Wunschtermin-Kalender mit gesperrten Wochentagen/Feiertagen + Vorlauf/Max-Vorlauf.
 * - Per-Gewicht-Hinweise inkl. „nur Selbstabholung".
 * - Theme-Editor-kompatibel (Re-Init bei shopify:section:load).
 */
(function () {
  'use strict';

  function boot() {
    document.querySelectorAll('[data-trockeneis-section]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Theme-Editor: Section neu initialisieren */
  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target.querySelector('[data-trockeneis-section]');
    if (root && !root.__teInit) initSection(root);
  });

  function initSection(root) {
    if (root.__teInit) return;
    root.__teInit = true;

    /* ── DOM refs ──────────────────────────────────── */
    var sizeInputs    = root.querySelectorAll('[name="te-size"]');
    var qtyInputs     = root.querySelectorAll('[name="te-qty"]');
    var priceEl       = root.querySelector('[data-te-price]');
    var unitPriceEl   = root.querySelector('[data-te-unit-price]');
    var anfragHint    = root.querySelector('[data-te-anfrage-hint]');
    var addBtn        = root.querySelector('[data-te-add-btn]');
    var shipMethods   = root.querySelectorAll('[data-ship-method]');
    var expressMethod = root.querySelector('[data-ship-method="express"]');
    var carriers      = root.querySelectorAll('[data-carrier]');
    var carriersWrap  = root.querySelector('[data-te-carriers]');
    var summaryEl     = root.querySelector('[data-te-summary]');
    var variantInput  = root.querySelector('[data-te-variant-id]');
    var shippingProp  = root.querySelector('[data-te-shipping-prop]');
    var carrierProp   = root.querySelector('[data-te-carrier-prop]');
    var ownBoxCheck   = root.querySelector('[data-te-own-box]');
    var dateInput     = root.querySelector('[data-te-date]');
    var dateProp      = root.querySelector('[data-te-date-prop]');
    var dateError     = root.querySelector('[data-te-date-error]');
    var weightNotes   = root.querySelectorAll('[data-te-weight-notes] .te-weight-note');

    /* ── Variant data (embedded JSON) ── */
    var variants = [];
    try {
      var dataEl = root.querySelector('[data-te-variant-data]');
      variants = dataEl ? JSON.parse(dataEl.textContent) : [];
    } catch (e) { variants = []; }

    /* ── Config from data attributes ── */
    var weightBasedShipping = root.getAttribute('data-weight-based') === 'true';
    var pricePerKg   = toNum(root.getAttribute('data-price-per-kg'));
    var ownBoxDiscount = toNum(root.getAttribute('data-own-box-discount'));

    var dateCfg = {
      enabled: root.getAttribute('data-date-enabled') === 'true',
      required: root.getAttribute('data-date-required') === 'true',
      lead: parseInt(root.getAttribute('data-date-lead') || '0', 10) || 0,
      maxMonths: parseInt(root.getAttribute('data-date-max-months') || '3', 10) || 3,
      excludedWeekdays: (root.getAttribute('data-date-excluded-weekdays') || '')
        .split(',').filter(Boolean).map(function (n) { return parseInt(n, 10); }),
      holidays: (root.getAttribute('data-date-holidays') || '')
        .split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    };

    /* ── Variant lookup map ── */
    var variantMap = {};
    variants.forEach(function (v) {
      var k1 = norm(v.option1 || '');
      var k2 = norm(v.option2 || '');
      variantMap[k1 + '|' + k2] = v;
      if (k2) variantMap[k2 + '|' + k1] = v;
      if (!v.option2) variantMap[k1 + '|'] = v;
    });

    /* ── State ── */
    var state = {
      size: '', qty: '', isAnfrage: false,
      shipMethod: '', carrier: '', carrierName: '',
      productPrice: 0, shippingPrice: 0,
      currentVariant: null,
      ownBox: false,
      pickupOnly: false,
      dateValid: !dateCfg.required, dateDisplay: ''
    };

    var checkedSize = root.querySelector('[name="te-size"]:checked');
    if (checkedSize) state.size = checkedSize.value;
    var checkedQty = root.querySelector('[name="te-qty"]:checked');
    if (checkedQty) {
      if (checkedQty.value === 'anfrage') { state.isAnfrage = true; }
      else { state.qty = checkedQty.value; }
    }

    /* ── Events: size / qty ── */
    sizeInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        state.size = input.value;
        findAndSetVariant();
      });
    });
    qtyInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.value === 'anfrage') { state.isAnfrage = true; state.qty = ''; }
        else { state.isAnfrage = false; state.qty = input.value; }
        applyWeightNote();
        findAndSetVariant();
      });
    });

    /* ── Events: shipping method ── */
    shipMethods.forEach(function (method) {
      var header = method.querySelector('.te-ship-method__header');
      if (!header) return;
      function handle() { selectShipMethod(method.getAttribute('data-ship-method')); }
      header.addEventListener('click', handle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle(); }
      });
    });

    function selectShipMethod(type) {
      state.shipMethod = type;
      shipMethods.forEach(function (m) {
        m.classList.toggle('is-selected', m.getAttribute('data-ship-method') === type);
      });
      if (shippingProp) shippingProp.value = type === 'pickup' ? 'Selbstabholung' : 'Expresslieferung';
      if (carriersWrap) {
        if (type === 'express') {
          carriersWrap.classList.add('is-open');
        } else {
          carriersWrap.classList.remove('is-open');
          state.carrier = ''; state.carrierName = ''; state.shippingPrice = 0;
          if (carrierProp) carrierProp.value = '';
          carriers.forEach(function (c) { c.classList.remove('is-selected', 'is-expanded'); });
        }
      }
      updateSummary();
    }

    /* ── Events: carrier ── */
    carriers.forEach(function (carrier) {
      var header = carrier.querySelector('.te-carrier__header');
      if (!header) return;
      header.addEventListener('click', function () {
        var id = carrier.getAttribute('data-carrier');
        if (state.carrier === id) { carrier.classList.toggle('is-expanded'); return; }
        state.carrier = id;
        var nameEl = carrier.querySelector('.te-carrier__name');
        state.carrierName = nameEl ? nameEl.textContent.trim() : id;
        carriers.forEach(function (c) { c.classList.remove('is-selected', 'is-expanded'); });
        carrier.classList.add('is-selected', 'is-expanded');
        header.setAttribute('aria-expanded', 'true');
        state.shippingPrice = toNum(carrier.getAttribute('data-carrier-price'));
        if (carrierProp) carrierProp.value = state.carrierName;
        updateSummary();
      });
    });

    /* ── Events: own box ── */
    if (ownBoxCheck) {
      ownBoxCheck.addEventListener('change', function () {
        state.ownBox = ownBoxCheck.checked;
        updateSummary();
      });
    }

    /* ── Date picker ── */
    if (dateCfg.enabled && dateInput) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var minDate = addDays(today, dateCfg.lead);
      var maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth() + dateCfg.maxMonths);
      dateInput.min = isoDate(minDate);
      dateInput.max = isoDate(maxDate);
      dateInput.addEventListener('change', validateDate);
    }

    function validateDate() {
      if (!dateInput) return;
      var val = dateInput.value;
      hideDateError();
      if (!val) {
        setDateProp('');
        state.dateValid = !dateCfg.required;
        state.dateDisplay = '';
        updateSummary(); updateAddState();
        return;
      }
      var parts = val.split('-');
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      var weekday = d.getDay();
      if (dateCfg.excludedWeekdays.indexOf(weekday) !== -1) {
        showDateError('Dieser Wochentag ist nicht wählbar. Bitte anderen Termin wählen.');
        clearDate(); return;
      }
      if (dateCfg.holidays.indexOf(val) !== -1) {
        showDateError('Dieser Tag ist gesperrt (Feiertag). Bitte anderen Termin wählen.');
        clearDate(); return;
      }
      if (dateInput.min && val < dateInput.min) {
        showDateError('Bitte einen späteren Termin wählen.');
        clearDate(); return;
      }
      if (dateInput.max && val > dateInput.max) {
        showDateError('Der Termin liegt zu weit in der Zukunft.');
        clearDate(); return;
      }
      state.dateValid = true;
      state.dateDisplay = parts[2] + '.' + parts[1] + '.' + parts[0];
      setDateProp(state.dateDisplay);
      updateSummary(); updateAddState();
    }

    function clearDate() {
      if (dateInput) dateInput.value = '';
      setDateProp('');
      state.dateValid = !dateCfg.required;
      state.dateDisplay = '';
      updateSummary(); updateAddState();
    }
    function setDateProp(v) {
      if (!dateProp) return;
      if (v) { dateProp.value = v; dateProp.disabled = false; }
      else { dateProp.value = ''; dateProp.disabled = true; }
    }
    function showDateError(msg) { if (dateError) { dateError.textContent = msg; dateError.hidden = false; } }
    function hideDateError() { if (dateError) { dateError.hidden = true; dateError.textContent = ''; } }

    /* ── Weight notes + pickup-only ── */
    function applyWeightNote() {
      state.pickupOnly = false;
      var key = norm(state.qty);
      weightNotes.forEach(function (note) {
        var match = norm(note.getAttribute('data-weight') || '') === key && key !== '';
        note.hidden = !match;
        if (match && note.getAttribute('data-pickup-only') === 'true') state.pickupOnly = true;
      });
      if (expressMethod) {
        if (state.pickupOnly) {
          expressMethod.hidden = true;
          if (state.shipMethod === 'express') selectShipMethod('pickup');
        } else {
          expressMethod.hidden = false;
        }
      }
    }

    /* ── Variant resolution ── */
    function findAndSetVariant() {
      if (state.isAnfrage) {
        if (priceEl) priceEl.textContent = 'Auf Anfrage';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (anfragHint) anfragHint.classList.add('is-visible');
        updateAddState();
        updateSummary();
        return;
      }
      if (anfragHint) anfragHint.classList.remove('is-visible');

      var sizeKey = norm(state.size);
      var qtyKey = norm(state.qty);
      var matched = null;
      if (qtyKey) {
        matched = variantMap[sizeKey + '|' + qtyKey] || variantMap[qtyKey + '|' + sizeKey] || null;
      }
      if (!matched && !qtyKey) matched = variantMap[sizeKey + '|'] || null;
      if (!matched) {
        for (var j = 0; j < variants.length; j++) {
          var t = norm(variants[j].title || '');
          if (t.indexOf(sizeKey) !== -1 && (qtyKey === '' || t.indexOf(qtyKey) !== -1)) { matched = variants[j]; break; }
        }
      }
      state.currentVariant = matched;

      if (matched) {
        if (variantInput) variantInput.value = matched.id;
        var priceInEur = matched.price / 100;
        state.productPrice = priceInEur;
        if (priceEl) priceEl.textContent = formatCurrency(priceInEur);
        var kg = extractKg(state.qty);
        if (kg > 0 && unitPriceEl) unitPriceEl.textContent = formatCurrency(priceInEur / kg) + ' / kg';
        else if (unitPriceEl) unitPriceEl.textContent = '';
      } else {
        state.productPrice = 0;
        if (priceEl) priceEl.textContent = '–';
        if (unitPriceEl) unitPriceEl.textContent = '';
      }
      updateAddState();
      updateSummary();
    }

    /* ── Add-to-cart gating ── */
    function updateAddState() {
      if (!addBtn) return;
      var ok = !!state.currentVariant && state.currentVariant.available && !state.isAnfrage && state.dateValid;
      addBtn.disabled = !ok;
      var label = 'In den Warenkorb';
      if (state.isAnfrage) label = 'Auf Anfrage';
      else if (!state.currentVariant) label = 'Nicht verfügbar';
      else if (!state.currentVariant.available) label = 'Ausverkauft';
      else if (!state.dateValid) label = 'Bitte Termin wählen';
      setBtnText(label);
    }

    /* ── Summary ── */
    function updateSummary() {
      if (!summaryEl) return;
      if (state.isAnfrage || !state.shipMethod || !state.currentVariant) {
        summaryEl.classList.remove('is-visible');
        return;
      }
      summaryEl.classList.add('is-visible');

      setLine(summaryEl, '[data-summary-product]', labelFor(), formatCurrency(state.productPrice));

      var boxLine = summaryEl.querySelector('[data-summary-box]');
      if (boxLine) {
        if (state.ownBox && ownBoxDiscount > 0) {
          boxLine.hidden = false;
          setLine(summaryEl, '[data-summary-box]', 'Eigene Box', '− ' + formatCurrency(ownBoxDiscount));
        } else { boxLine.hidden = true; }
      }

      var shipCost = 0;
      var kg = extractKg(state.qty);
      if (state.shipMethod === 'pickup') {
        setLine(summaryEl, '[data-summary-shipping]', 'Selbstabholung', 'Kostenlos');
      } else if (state.shipMethod === 'express' && state.carrier) {
        shipCost = (weightBasedShipping && pricePerKg > 0 && kg > 0) ? pricePerKg * kg : state.shippingPrice;
        setLine(summaryEl, '[data-summary-shipping]', 'Express (' + state.carrierName + ')', shipCost > 0 ? formatCurrency(shipCost) : 'auf Anfrage');
      } else if (state.shipMethod === 'express') {
        setLine(summaryEl, '[data-summary-shipping]', 'Expresslieferung', 'Dienstleister wählen');
      }

      var dateLine = summaryEl.querySelector('[data-summary-date]');
      if (dateLine) {
        if (state.dateDisplay) { dateLine.hidden = false; setLine(summaryEl, '[data-summary-date]', 'Wunschtermin', state.dateDisplay); }
        else { dateLine.hidden = true; }
      }

      var discount = (state.ownBox && ownBoxDiscount > 0) ? ownBoxDiscount : 0;
      var total = Math.max(0, state.productPrice - discount) + shipCost;
      setLine(summaryEl, '[data-summary-total]', 'Gesamt', formatCurrency(total));
    }

    function labelFor() {
      var label = state.size;
      if (state.qty) label += (label ? ', ' : '') + state.qty;
      return label || 'Produkt';
    }
    function setLine(scope, sel, label, value) {
      var line = scope.querySelector(sel);
      if (!line) return;
      var l = line.querySelector('.te-summary__label');
      var v = line.querySelector('.te-summary__value');
      if (l) l.textContent = label;
      if (v) v.textContent = value;
    }

    /* ── Helpers ── */
    function norm(str) {
      return String(str).toLowerCase().trim().replace(/\s+/g, '').replace(/,/g, '.');
    }
    function extractKg(str) { var m = String(str).match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; }
    function toNum(s) { return parseFloat(String(s || '0').replace(',', '.')) || 0; }
    function formatCurrency(val) { return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
    function addDays(date, days) { var d = new Date(date); d.setDate(d.getDate() + days); return d; }
    function isoDate(d) {
      var m = ('0' + (d.getMonth() + 1)).slice(-2);
      var day = ('0' + d.getDate()).slice(-2);
      return d.getFullYear() + '-' + m + '-' + day;
    }
    function setBtnText(text) {
      if (!addBtn) return;
      var svg = addBtn.querySelector('svg');
      var nodes = addBtn.childNodes;
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].nodeType === 3) addBtn.removeChild(nodes[i]);
      }
      var textNode = document.createTextNode(' ' + text + ' ');
      if (svg && svg.nextSibling) addBtn.insertBefore(textNode, svg.nextSibling);
      else addBtn.appendChild(textNode);
    }

    /* ── Initial render ── */
    applyWeightNote();
    findAndSetVariant();
  }
})();
