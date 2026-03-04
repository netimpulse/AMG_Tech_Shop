/* team-carousel.js – Endless/Seamless Loop
 * - Nahtloser unendlicher Loop (Pre-Wrap vor der Transition, kein sichtbarer Jump)
 * - Buttons & Swipe/Drag
 * - Dots
 * - Re-Init bei Resize & im Shopify Theme Editor
 */

(function () {
  class TeamCarousel {
    constructor(root) {
      this.root = root;
      this.viewport = root.querySelector('.team-carousel__viewport');
      this.track = root.querySelector('.team-carousel__track');
      this.prevBtn = root.querySelector('.team-carousel__btn--prev');
      this.nextBtn = root.querySelector('.team-carousel__btn--next');
      this.dotsEl = root.querySelector('.team-carousel__dots');

      this.items = Array.from(this.track.children);
      this.realCount = this.items.length;

      this.perView = this.getPerView();
      this.gap = this.getGap();

      this.current = 0;           // Index innerhalb der "realen" Slides
      this.at = 0;                // Index innerhalb der Track-Slides inkl. Clones
      this.slideW = 0;            // Breite einer Slide inkl. Lücke
      this.isDragging = false;
      this.startX = 0;
      this.dragX = 0;
      this.baseX = 0;
      this.dragPreventClick = false;

      if (this.realCount === 0) {
        this.disable();
        return;
      }

      this.setup();
      this.bind();
    }

    /* ===== Setup & Helpers ===== */

    getPerView() {
      const styles = window.getComputedStyle(this.track);
      const pv = parseFloat(styles.getPropertyValue('--per-view')) || 1;
      return Math.max(1, Math.floor(pv));
    }

    getGap() {
      const styles = window.getComputedStyle(this.track);
      const gap = parseFloat(styles.getPropertyValue('gap')) || parseFloat(styles.getPropertyValue('column-gap')) || 0;
      return isNaN(gap) ? 0 : gap;
    }

    calcSlideMetrics() {
      const first = this.track.querySelector('.team-carousel__item');
      if (!first) return;
      const rect = first.getBoundingClientRect();
      this.slideW = rect.width + this.gap;
    }

    setup() {
      // alte Clones entfernen
      this.track.querySelectorAll('.is-clone').forEach(n => n.remove());

      this.perView = this.getPerView();
      this.gap = this.getGap();

      // Wenn wenig Slides: Controls ausblenden
      if (this.realCount <= this.perView) {
        this.updateDots(); // 1 Dot
        if (this.prevBtn) this.prevBtn.style.display = 'none';
        if (this.nextBtn) this.nextBtn.style.display = 'none';
        this.at = 0;
        this.current = 0;
        this.calcSlideMetrics();
        this.jumpTo(0);
        return;
      } else {
        if (this.prevBtn) this.prevBtn.style.display = '';
        if (this.nextBtn) this.nextBtn.style.display = '';
      }

      // Clones: vorne & hinten je perView
      const headClones = this.items.slice(0, this.perView).map(n => this.cloneNode(n));
      const tailClones = this.items.slice(-this.perView).map(n => this.cloneNode(n));

      headClones.forEach(n => this.track.appendChild(n));
      tailClones.forEach(n => this.track.insertBefore(n, this.track.firstChild));

      this.slides = Array.from(this.track.children);
      this.calcSlideMetrics();

      // Startposition: direkt nach den Tail-Clones
      this.at = this.perView;
      this.current = 0;
      this.withoutTransition(() => this.translateRaw(this.at));

      // Dots
      this.updateDots();
      this.updateDotsActive();
    }

    cloneNode(node) {
      const c = node.cloneNode(true);
      c.classList.add('is-clone');
      c.setAttribute('aria-hidden', 'true');
      return c;
    }

    /* ===== Utilities ===== */

    withoutTransition(cb) {
      const prev = this.track.style.transition;
      this.track.style.transition = 'none';
      cb();
      void this.track.offsetHeight; // reflow
      this.track.style.transition = prev || '';
    }

    translateRaw(index) {
      const x = -index * this.slideW;
      this.track.style.transform = `translate3d(${x}px,0,0)`;
    }

    leftBound() { return this.perView; }
    rightBound() { return this.perView + this.realCount - 1; }

    normRealIndex(i) {
      const m = ((i % this.realCount) + this.realCount) % this.realCount;
      return m;
    }

    /* ===== Controls & Events ===== */

    bind() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

      this.dotsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-goto]');
        if (!btn) return;
        const target = parseInt(btn.getAttribute('data-goto'), 10) || 0;
        this.goTo(target);
      });

      // Drag/Swipe
      this.track.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });

      // Resize (debounced)
      this.onResize = this.debounce(() => {
        const prevReal = this.current;
        this.setup();
        this.goTo(prevReal, true);
      }, 150);
      window.addEventListener('resize', this.onResize);

      // Theme Editor Hooks
      document.addEventListener('shopify:section:load', (evt) => {
        if (evt.target && evt.target.contains(this.root)) {
          this.destroy();
          new TeamCarousel(evt.target.querySelector('.team-carousel'));
        }
      });

      document.addEventListener('shopify:block:reorder', (evt) => {
        if (!this.root.contains(evt.target)) return;
        this.destroy();
        this.root = evt.target.closest('.team-carousel') || this.root;
        new TeamCarousel(this.root);
      });

      // Clicks nach Drag verhindern
      this.track.addEventListener('click', (e) => {
        if (this.dragPreventClick) {
          e.preventDefault();
          e.stopPropagation();
          this.dragPreventClick = false;
        }
      });
    }

    destroy() {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);
      window.removeEventListener('pointermove', this.onPointerMove);
    }

    disable() {
      if (this.prevBtn) this.prevBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;
    }

    debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }

    /* ===== Navigation ===== */

    next() { this.moveBy(1); }
    prev() { this.moveBy(-1); }

    /**
     * Nahtlose Bewegung um ±1 (bei Drag auch nur ±1)
     * Pre-Wrap VOR der Transition, damit kein Transition-Ende-Jump nötig ist.
     */
    moveBy(step) {
      if (!step) return;

      const left = this.leftBound();
      const right = this.rightBound();

      // Vorbereitendes Wrapping, damit der Zielindex IMMER innerhalb [left..right] liegt
      if (step > 0 && this.at >= right) {
        // Wir stehen auf letztem realen Slide → unsichtbar eine "Etage" zurücksetzen
        this.at = this.at - this.realCount; // z.B. ... | perView-1 [perView..right] perView+realCount ...
        this.withoutTransition(() => this.translateRaw(this.at));
      } else if (step < 0 && this.at <= left) {
        // Wir stehen auf erstem realen Slide → unsichtbar eine "Etage" nach vorne setzen
        this.at = this.at + this.realCount;
        this.withoutTransition(() => this.translateRaw(this.at));
      }

      // Jetzt liegt at sicher im Bereich [left..right] → 1 Schritt animieren
      const target = this.at + (step > 0 ? 1 : -1);
      this.track.style.transition = 'transform 400ms ease';
      this.translateRaw(target);

      const onEnd = () => {
        this.track.removeEventListener('transitionend', onEnd);
        this.at = target;
        this.current = this.normRealIndex(this.at - this.perView);
        this.updateDotsActive();
      };
      this.track.addEventListener('transitionend', onEnd, { once: true });
    }

    /**
     * Springe zu realIndex (für Dots/Programmatisch)
     * Wählt die KÜRZESTE animierte Strecke (evtl. mit Vorab-Wrap).
     */
    goTo(realIndex, instant = false) {
      const left = this.leftBound();
      const base = this.perView + this.normRealIndex(realIndex);

      // Finde die nächste "entsprechende Spur" (± realCount), die am nächsten zur aktuellen Position liegt
      const k = Math.round((this.at - base) / this.realCount);
      let target = base + k * this.realCount;

      // Sicherstellen, dass wir nicht außerhalb der existierenden Clones landen:
      // Falls doch, vorab unsichtbar um eine "Etage" verschieben.
      const total = this.realCount + 2 * this.perView; // reale + clones
      const minIndex = 0;
      const maxIndex = total - 1;

      if (target < this.perView) {
        this.at = this.at + this.realCount;
        this.withoutTransition(() => this.translateRaw(this.at));
        target = base + (k + 1) * this.realCount;
      } else if (target > this.perView + this.realCount - 1) {
        this.at = this.at - this.realCount;
        this.withoutTransition(() => this.translateRaw(this.at));
        target = base + (k - 1) * this.realCount;
      }

      if (instant) {
        this.at = target;
        this.current = this.normRealIndex(this.at - this.perView);
        this.withoutTransition(() => this.translateRaw(this.at));
        this.updateDotsActive();
        return;
      }

      this.track.style.transition = 'transform 400ms ease';
      this.translateRaw(target);

      const onEnd = () => {
        this.track.removeEventListener('transitionend', onEnd);
        this.at = target;
        this.current = this.normRealIndex(this.at - this.perView);
        this.updateDotsActive();
      };
      this.track.addEventListener('transitionend', onEnd, { once: true });
    }

    /**
     * Interner Sprung ohne Animation (z. B. Initialisierung)
     */
    jumpTo(trackIndex) {
      this.withoutTransition(() => this.translateRaw(trackIndex));
    }

    /* ===== Dots ===== */

    updateDots() {
      this.dotsEl.innerHTML = '';
      const count = Math.max(1, this.realCount);
      for (let i = 0; i < count; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-goto', String(i));
        b.setAttribute('aria-label', `Gehe zu Slide ${i + 1}`);
        this.dotsEl.appendChild(b);
      }
    }

    updateDotsActive() {
      const dots = Array.from(this.dotsEl.querySelectorAll('button'));
      dots.forEach((d, i) => {
        if (i === this.current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    /* ===== Drag/Swipe (nur ±1 Schritt) ===== */

    onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // nur linker Mausklick
      this.isDragging = true;
      this.dragPreventClick = false;
      this.startX = e.clientX;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
      this.baseX = matrix.m41; // translateX
      this.track.style.transition = 'none';
      this.track.setPointerCapture(e.pointerId);
    };

    onPointerMove = (e) => {
      if (!this.isDragging) return;
      this.dragX = e.clientX - this.startX;
      const x = this.baseX + this.dragX;
      this.track.style.transform = `translate3d(${x}px,0,0)`;

      if (Math.abs(this.dragX) > 5) this.dragPreventClick = true;
    };

    onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.track.releasePointerCapture && this.track.releasePointerCapture(e.pointerId);

      const threshold = Math.max(50, this.slideW * 0.15);
      let step = 0;
      if (Math.abs(this.dragX) > threshold) {
        step = this.dragX < 0 ? 1 : -1; // nach links gezogen → nächstes
      } else {
        // Zur aktuellen Zelle zurückschnappen
        const matrix = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
        const xNow = matrix.m41;
        const idxFloat = -xNow / this.slideW;
        step = Math.round(idxFloat - this.at);
      }
      this.dragX = 0;

      if (step === 0) {
        // zurück auf die aktuelle Zelle
        this.track.style.transition = 'transform 200ms ease';
        this.translateRaw(this.at);
      } else {
        // nur ±1 bewegen → seamless via moveBy
        this.moveBy(step > 0 ? 1 : -1);
      }
    };
  }

  /* ===== Init auf allen Karussells ===== */

  function initAll() {
    document.querySelectorAll('.team-carousel').forEach((el) => {
      if (el.__tc_inited) return;
      el.__tc_inited = true;
      new TeamCarousel(el);
    });
  }

  document.addEventListener('DOMContentLoaded', initAll);
})();
