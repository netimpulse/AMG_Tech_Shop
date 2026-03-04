(function () {
  function initCarousel(root) {
    if (!root || root.__kbvInit) return; // mehrfach-Init verhindern
    const container = root.querySelector('.kundenbewertung-container');
    const prevButton = root.querySelector('.prev-button');
    const nextButton = root.querySelector('.next-button');
    if (!container || !prevButton || !nextButton) return;

    root.__kbvInit = true;

    const originals = Array.from(container.children);
    const itemsCount = originals.length;

    // Endlos-Klone (nur einmal)
    originals.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      container.appendChild(clone);
    });

    let currentIndex = 0;
    let isTransitioning = false;

    // Gap dynamisch lesen (ändert sich über Media Queries)
    function getGap() {
      const g = parseFloat(getComputedStyle(container).gap);
      return isNaN(g) ? 0 : g;
    }

    function itemWidth() {
      const first = container.children[0];
      return first ? first.getBoundingClientRect().width + getGap() : 0;
    }

    function moveCarousel(instant = false) {
      const offset = -currentIndex * itemWidth();
      container.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
      container.style.transform = `translateX(${offset}px)`;
    }

    function handleTransitionEnd() {
      isTransitioning = false;
      if (currentIndex >= itemsCount) {
        currentIndex = 0;
        moveCarousel(true);
      } else if (currentIndex < 0) {
        currentIndex = itemsCount - 1;
        moveCarousel(true);
      }
    }

    function shiftItems(dir) {
      if (isTransitioning) return;
      isTransitioning = true;
      currentIndex += dir;
      moveCarousel();
    }

    // Click-Listener
    container.addEventListener('transitionend', handleTransitionEnd);
    nextButton.addEventListener('click', e => { e.preventDefault(); shiftItems(1); });
    prevButton.addEventListener('click', e => { e.preventDefault(); shiftItems(-1); });

    // Resize: Layout neu berechnen
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => moveCarousel(true), 120);
    });

    /* ---- Touch/Swipe für Mobile ---- */
    let touchStartX = 0;
    let touchMoveX = 0;
    let touching = false;

    function onTouchStart(e) {
      touching = true;
      touchStartX = (e.touches ? e.touches[0].clientX : e.clientX);
      touchMoveX = touchStartX;
    }
    function onTouchMove(e) {
      if (!touching) return;
      touchMoveX = (e.touches ? e.touches[0].clientX : e.clientX);
    }
    function onTouchEnd() {
      if (!touching) return;
      const dx = touchMoveX - touchStartX;
      const threshold = 40; // minimaler Wischweg
      if (Math.abs(dx) > threshold) {
        shiftItems(dx < 0 ? 1 : -1);
      }
      touching = false;
    }

    const viewport = root.querySelector('.karussell-viewport') || container;
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: true });
    viewport.addEventListener('touchend', onTouchEnd);
    // optional: Maus-swipe (z. B. auf Tablets mit Maus)
    viewport.addEventListener('mousedown', onTouchStart);
    viewport.addEventListener('mousemove', onTouchMove);
    viewport.addEventListener('mouseup', onTouchEnd);
    viewport.addEventListener('mouseleave', onTouchEnd);

    // Startposition setzen
    moveCarousel(true);
  }

  function initAll() {
    document.querySelectorAll('.kundenbewertung-karussell').forEach(initCarousel);
  }

  // 1) Erstes Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // 2) Shopify Section dynamisch geladen (Theme-Editor / Ajax)
  document.addEventListener('shopify:section:load', evt => {
    const section = evt.target;
    section.querySelectorAll('.kundenbewertung-karussell').forEach(initCarousel);
  });
})();

