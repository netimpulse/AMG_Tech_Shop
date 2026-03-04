/**
 * karussel-leistungen.js
 * - Desktop/Tablet (>=640px): Endloses Karussell mit Pre-Wrap (wie Beispiel)
 * - Mobile (<640px): Nativer Slider (scrollbar), Pfeile = kleiner Pixel-Scroll
 * - Funktioniert mit bestehendem Markup (.svc-scroller / .svc-row / .svc-card)
 * - Theme-Editor kompatibel (shopify:section:load)
 */

(function () {
  "use strict";

  const SELECTOR_SECTION = '[data-kl-section], section.svc-wrap, .svc-wrap'; // robust
  const MOBILE_MEDIA = window.matchMedia('(max-width: 639px)');
  const MOBILE_PIXEL_STEP = 80; // Pfeil-Scroll auf Mobile (px)

  /* ================================
   * Helpers
   * ================================ */
  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  function getGapPx(el) {
    const cs = getComputedStyle(el);
    const gap = parseFloat(cs.gap) || parseFloat(cs.columnGap) || 0;
    return isNaN(gap) ? 0 : gap;
  }

  function readNumberAttr(el, name, fallback) {
    const v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  function readNumberCSSVar(el, name, fallback) {
    const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }

  /* ================================
   * Desktop/Tablet: Karussell (wie Beispiel)
   * ================================ */
  class DesktopCarousel {
    constructor(section) {
      this.section = section;
      this.viewport = section.querySelector('.svc-scroller');
      this.track = section.querySelector('.svc-row');
      this.prevBtn = section.querySelector('.svc-arrow--prev');
      this.nextBtn = section.querySelector('.svc-arrow--next');

      if (!this.viewport || !this.track) {
        this.disabled = true;
        return;
      }

      // Originale echten Slides sichern
      this.realSlides = Array.from(this.track.children).filter(n => !n.classList.contains('is-clone'));
      this.realCount = this.realSlides.length;
      if (this.realCount === 0) {
        this.disabled = true;
        return;
      }

      // Bindings
      this.onResize = debounce(this.handleResize.bind(this), 120);
      this.onPrev = () => this.moveBy(-1);
      this.onNext = () => this.moveBy(1);
      this.onPointerDown = this.pointerDown.bind(this);
      this.onPointerMove = this.pointerMove.bind(this);
      this.onPointerUp = this.pointerUp.bind(this);

      // Mode-Stile aktivieren
      this.enableStyles();
      // Setup
      this.setup();
      // Events
      this.bind();
    }

    enableStyles() {
      // Viewport: Transform-Karussell -> overflow hidden
      this.prevOverflowX = this.viewport.style.overflowX;
      this.viewport.style.overflowX = 'hidden';

      // Track: flex + kein scroll-snap nötig
      this.prevDisplay = this.track.style.display;
      this.prevScrollSnapType = this.track.style.scrollSnapType;
      this.track.style.display = 'flex';
      this.track.style.scrollSnapType = 'none';
    }

    restoreStyles() {
      this.viewport.style.overflowX = this.prevOverflowX || '';
      this.track.style.display = this.prevDisplay || '';
      this.track.style.scrollSnapType = this.prevScrollSnapType || '';
    }

    getPerView() {
      // 1) aus data-cols-* am Viewport
      const colsDesktop = readNumberAttr(this.viewport, 'data-cols-desktop', NaN);
      const colsTablet  = readNumberAttr(this.viewport, 'data-cols-tablet', NaN);

      // 2) Fallback: CSS-Variablen am Track (aus deinem Section-Style)
      const cssDesktop = readNumberCSSVar(this.track, '--svc-cols-desktop', NaN);
      const cssTablet  = readNumberCSSVar(this.track, '--svc-cols-tablet', NaN);

      const isDesktopWide = window.matchMedia('(min-width: 992px)').matches;
      const isTablet = window.matchMedia('(min-width: 640px)').matches && !isDesktopWide;

      let pv;
      if (isDesktopWide) {
        pv = !isNaN(colsDesktop) ? colsDesktop : (!isNaN(cssDesktop) ? cssDesktop : 4);
      } else if (isTablet) {
        pv = !isNaN(colsTablet) ? colsTablet : (!isNaN(cssTablet) ? cssTablet : 3);
      } else {
        pv = 1; // sollte in diesem Modus nicht vorkommen, Sicherheit
      }
      return Math.max(1, Math.floor(pv));
    }

    calcSlideMetrics() {
      this.gap = getGapPx(this.track);
      this.perView = this.getPerView();
      const vw = this.viewport.clientWidth;
      // genaue Breite pro Slide (mit Flexbasis) -> alle Slides bekommen gleiche Breite
      this.slideWidth = Math.max(120, (vw - (this.perView - 1) * this.gap) / this.perView);
      this.slideWwithGap = this.slideWidth + this.gap;
    }

    applyItemWidths() {
      const all = Array.from(this.track.children);
      all.forEach(el => {
        el.style.flex = `0 0 ${this.slideWidth}px`;
        el.style.maxWidth = `${this.slideWidth}px`;
      });
      this.track.style.columnGap = this.gap + 'px';
      this.track.style.gap = this.gap + 'px';
    }

    removeClones() {
      this.track.querySelectorAll('.is-clone').forEach(n => n.remove());
    }

    makeClones() {
      // vorne/hinten je perView klonen
      const head = this.realSlides.slice(0, this.perView).map(n => this.clone(n));
      const tail = this.realSlides.slice(-this.perView).map(n => this.clone(n));
      // vorne (vor firstChild) die Tail-Klone einfügen
      tail.forEach(n => this.track.insertBefore(n, this.track.firstChild));
      // hinten die Head-Klone anhängen
      head.forEach(n => this.track.appendChild(n));
      this.slides = Array.from(this.track.children);
    }

    clone(node) {
      const c = node.cloneNode(true);
      c.classList.add('is-clone');
      c.setAttribute('aria-hidden', 'true');
      // Breite nach Setup erneut gesetzt
      return c;
    }

    setup() {
      // vorherige Clones/Transition zurücksetzen
      this.track.style.transition = 'none';
      this.track.style.transform = 'translate3d(0,0,0)';
      this.removeClones();

      // Metriken & Breiten
      this.calcSlideMetrics();
      this.applyItemWidths();
      this.makeClones();

      // Startposition: direkt hinter den vorderen Klonen (perView)
      this.at = this.perView; // Track-Index (inkl. Klone)
      this.current = 0;       // Real-Index
      this.withoutTransition(() => this.translateRaw(this.at));

      // Controls ein/aus
      if (this.prevBtn) this.prevBtn.style.display = (this.realCount <= this.perView) ? 'none' : '';
      if (this.nextBtn) this.nextBtn.style.display = (this.realCount <= this.perView) ? 'none' : '';
    }

    withoutTransition(cb) {
      const prev = this.track.style.transition;
      this.track.style.transition = 'none';
      cb();
      void this.track.offsetHeight;
      this.track.style.transition = prev || '';
    }

    translateRaw(idx) {
      const x = -idx * this.slideWwithGap;
      this.track.style.transform = `translate3d(${x}px,0,0)`;
    }

    leftBound()  { return this.perView; }
    rightBound() { return this.perView + this.realCount - 1; }
    norm(i)      { return ((i % this.realCount) + this.realCount) % this.realCount; }

    moveBy(step) {
      if (!step || this.realCount <= this.perView) {
        // zurückschnappen
        this.track.style.transition = 'transform 200ms ease';
        this.translateRaw(this.at);
        return;
      }

      const left = this.leftBound();
      const right = this.rightBound();

      // Pre-Wrap (unsichtbar) VOR der Transition – wie im Beispielcode
      if (step > 0 && this.at >= right) {
        this.at = this.at - this.realCount;
        this.withoutTransition(() => this.translateRaw(this.at));
      } else if (step < 0 && this.at <= left) {
        this.at = this.at + this.realCount;
        this.withoutTransition(() => this.translateRaw(this.at));
      }

      const target = this.at + (step > 0 ? 1 : -1);
      this.track.style.transition = 'transform 400ms ease';
      this.translateRaw(target);

      const onEnd = () => {
        this.track.removeEventListener('transitionend', onEnd);
        this.at = target;
        this.current = this.norm(this.at - this.perView);
      };
      this.track.addEventListener('transitionend', onEnd, { once: true });
    }

    // Drag/Swipe (nur ±1 Schritt)
    pointerDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.isDragging = true;
      this.startX = e.clientX;
      const m = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
      this.baseX = m.m41;
      this.dragX = 0;
      this.track.style.transition = 'none';
      this.track.setPointerCapture?.(e.pointerId);
    }

    pointerMove(e) {
      if (!this.isDragging) return;
      this.dragX = e.clientX - this.startX;
      const x = this.baseX + this.dragX;
      this.track.style.transform = `translate3d(${x}px,0,0)`;
    }

    pointerUp(e) {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.track.releasePointerCapture?.(e.pointerId);

      const threshold = Math.max(50, this.slideWwithGap * 0.15);
      let step = 0;
      if (Math.abs(this.dragX) > threshold) {
        step = this.dragX < 0 ? 1 : -1;
      } else {
        // zurückschnappen
        const m = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
        const xNow = m.m41;
        const idxFloat = -xNow / this.slideWwithGap;
        step = Math.round(idxFloat - this.at);
      }
      this.dragX = 0;

      if (step === 0) {
        this.track.style.transition = 'transform 200ms ease';
        this.translateRaw(this.at);
      } else {
        this.moveBy(step > 0 ? 1 : -1);
      }
    }

    handleResize() {
      const prevReal = this.current || 0;
      this.setup();
      // zum vorherigen realen Index (kürzester Weg)
      const base = this.perView + this.norm(prevReal);
      const k = Math.round((this.at - base) / this.realCount);
      const target = base + k * this.realCount;
      this.withoutTransition(() => {
        this.at = target;
        this.translateRaw(this.at);
      });
    }

    bind() {
      this.prevBtn && this.prevBtn.addEventListener('click', this.onPrev);
      this.nextBtn && this.nextBtn.addEventListener('click', this.onNext);

      this.track.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);

      window.addEventListener('resize', this.onResize);
    }

    destroy() {
      // Events
      this.prevBtn && this.prevBtn.removeEventListener('click', this.onPrev);
      this.nextBtn && this.nextBtn.removeEventListener('click', this.onNext);
      this.track.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);
      window.removeEventListener('resize', this.onResize);

      // Clones entfernen & Stile zurücksetzen
      this.track.style.transition = 'none';
      this.track.style.transform = '';
      this.removeClones();

      // Breiten der Items zurücksetzen
      Array.from(this.track.children).forEach(el => {
        el.style.flex = '';
        el.style.maxWidth = '';
      });

      this.restoreStyles();
    }
  }

  /* ================================
   * Mobile: nativer Slider
   * ================================ */
  class MobileSlider {
    constructor(section) {
      this.section = section;
      this.viewport = section.querySelector('.svc-scroller');
      this.track = section.querySelector('.svc-row');
      this.prevBtn = section.querySelector('.svc-arrow--prev');
      this.nextBtn = section.querySelector('.svc-arrow--next');

      if (!this.viewport || !this.track) {
        this.disabled = true;
        return;
      }

      // Sämtliche Desktop-Manipulationen rückgängig machen
      this.viewport.style.overflowX = 'auto';
      this.track.style.display = '';         // zurück auf Grid (aus CSS)
      this.track.style.scrollSnapType = '';  // vom CSS gesteuert
      this.track.style.transition = 'none';
      this.track.style.transform = '';

      // Clones entfernen & Item-Breiten zurücksetzen
      this.track.querySelectorAll('.is-clone').forEach(n => n.remove());
      Array.from(this.track.children).forEach(el => {
        el.style.flex = '';
        el.style.maxWidth = '';
      });

      // Events
      this.onPrev = () => this.viewport.scrollBy({ left: -MOBILE_PIXEL_STEP, behavior: 'smooth' });
      this.onNext = () => this.viewport.scrollBy({ left:  MOBILE_PIXEL_STEP, behavior: 'smooth' });

      this.prevBtn && this.prevBtn.addEventListener('click', this.onPrev);
      this.nextBtn && this.nextBtn.addEventListener('click', this.onNext);
    }

    destroy() {
      this.prevBtn && this.prevBtn.removeEventListener('click', this.onPrev);
      this.nextBtn && this.nextBtn.removeEventListener('click', this.onNext);
    }
  }

  /* ================================
   * Mode Manager pro Section
   * ================================ */
  class KLController {
    constructor(section) {
      this.section = section;
      this.mode = null;          // 'mobile' | 'desktop'
      this.instance = null;

      this.applyMode();
      this.onMediaChange = () => this.applyMode();
      MOBILE_MEDIA.addEventListener('change', this.onMediaChange);

      // Theme Editor: Reinit bei Section-Load
      document.addEventListener('shopify:section:load', (evt) => {
        if (evt.target && evt.target.contains(this.section)) {
          this.destroy();
          this.section = evt.target.querySelector('.svc-wrap') || evt.target;
          this.applyMode();
        }
      });
    }

    applyMode() {
      const wantMobile = MOBILE_MEDIA.matches; // < 640px
      const newMode = wantMobile ? 'mobile' : 'desktop';

      if (newMode === this.mode && this.instance) {
        // dennoch einmal Recalculate bei Desktop (Breite kann sich geändert haben)
        if (this.mode === 'desktop' && this.instance.handleResize) {
          this.instance.handleResize();
        }
        return;
      }

      // alten Modus aufräumen
      if (this.instance && this.instance.destroy) this.instance.destroy();

      // neuen Modus starten
      if (newMode === 'desktop') {
        this.instance = new DesktopCarousel(this.section);
      } else {
        this.instance = new MobileSlider(this.section);
      }
      this.mode = newMode;
    }

    destroy() {
      MOBILE_MEDIA.removeEventListener('change', this.onMediaChange);
      this.instance && this.instance.destroy && this.instance.destroy();
    }
  }

  /* ================================
   * Init
   * ================================ */
  function initAll() {
    document.querySelectorAll(SELECTOR_SECTION).forEach((el) => {
      // nur Sections mit .svc-scroller/.svc-row initialisieren
      const scroller = el.querySelector('.svc-scroller');
      const row = el.querySelector('.svc-row');
      if (!scroller || !row) return;
      if (el.__kl_inited) return;
      el.__kl_inited = true;
      new KLController(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

