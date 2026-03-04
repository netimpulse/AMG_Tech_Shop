document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.kundenbewertung-karussell');
  if (!carousel) return;

  const container = carousel.querySelector('.kundenbewertung-container');
  const prevButton = carousel.querySelector('.prev-button');
  const nextButton = carousel.querySelector('.next-button');
  if (!container || !prevButton || !nextButton) return;

  const items = Array.from(container.children);
  const itemsCount = items.length;

  // Immer initialisieren – auch wenn <= 3 Items vorhanden sind
  const gap = parseFloat(getComputedStyle(container).gap) || 30;

  // Klone für Endlos-Effekt
  items.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    container.appendChild(clone);
  });

  let currentIndex = 0;
  let isTransitioning = false;

  function moveCarousel(instant = false) {
    const first = container.children[0];
    const itemWidth = first.getBoundingClientRect().width + gap;
    const offset = -currentIndex * itemWidth;
    container.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
    container.style.transform = `translateX(${offset}px)`;
  }

  function handleTransitionEnd() {
    isTransitioning = false;

    if (currentIndex >= itemsCount) {
      currentIndex = 0;
      moveCarousel(true);
    }
    if (currentIndex < 0) {
      currentIndex = itemsCount - 1;
      moveCarousel(true);
    }
  }

  function shiftItems(direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex += direction;
    moveCarousel();
  }

  container.addEventListener('transitionend', handleTransitionEnd);
  nextButton.addEventListener('click', () => shiftItems(1));
  prevButton.addEventListener('click', () => shiftItems(-1));

  // Initiale Position setzen
  moveCarousel(true);
});
