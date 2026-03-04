document.addEventListener('DOMContentLoaded', function () {
  const root = document.querySelector('.kb-carousel');
  if (!root) return;

  const track = root.querySelector('.kb-track');
  const prev = root.querySelector('.kb-prev');
  const next = root.querySelector('.kb-next');
  const cards = Array.from(track.children);
  if (!track || !prev || !next || cards.length === 0) return;

  // Gap dynamisch von CSS/Schema lesen
  const cssGap = getComputedStyle(track).gap || root.getAttribute('data-kb-gap') || '30px';
  const gap = parseFloat(cssGap) || 30;

  // Helper: aktuell sichtbare Karten je Viewport
  function slidesPerView() {
    const w = window.innerWidth;
    if (w <= 767) return 1;
    if (w <= 1023) return 2;
    return 3;
  }

  // Wenn nicht mehr als sichtbar, Pfeile ausblenden
  function updateArrows() {
    const spv = slidesPerView();
    const hide = cards.length <= spv;
    prev.style.display = hide ? 'none' : '';
    next.style.display = hide ? 'none' : '';
  }

  // Unendliches Karussell: Originale merken, Klone anhängen
  const originalCount = cards.length;
  cards.forEach((el) => {
    const clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  let index = 0;
  let animating = false;

  function cardWidth() {
    // Breite inkl. Gap
    const first = track.children[0];
    return first.getBoundingClientRect().width + gap;
  }

  function move(instant = false) {
    const offset = -index * cardWidth();
    track.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
    track.style.transform = `translateX(${offset}px)`;
  }

  function onEnd() {
    animating = false;
    if (index >= originalCount) {
      index = 0;
      move(true);
    } else if (index < 0) {
      index = originalCount - 1;
      move(true);
    }
  }

  function shift(dir) {
    if (animating) return;
    animating = true;
    index += dir;
    move();
  }

  track.addEventListener('transitionend', onEnd);
  next.addEventListener('click', () => shift(1));
  prev.addEventListener('click', () => shift(-1));

  // Touch/Swipe (optional, simpel)
  let startX = null;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (startX === null) return;
    const dx = e.touches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      shift(dx < 0 ? 1 : -1);
      startX = null;
    }
  }, { passive: true });
  root.addEventListener('touchend', () => { startX = null; });

  // Initial
  updateArrows();
  move(true);
  window.addEventListener('resize', updateArrows);
});
