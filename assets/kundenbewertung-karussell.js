document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.kundenbewertung-karussell');
  if (!carousel) return;

  const container = carousel.querySelector('.kundenbewertung-container');
  const prevButton = carousel.querySelector('.prev-button');
  const nextButton = carousel.querySelector('.next-button');

  if (!container || !prevButton || !nextButton) {
    return;
  }

  const items = Array.from(container.children);
  const itemsCount = items.length;

  // Karussell nur initialisieren, wenn es mehr Karten als sichtbar gibt
  if (itemsCount <= 3) {
    prevButton.style.display = 'none';
    nextButton.style.display = 'none';
    return;
  }

  // Verbessert: Liest den Abstand dynamisch aus dem CSS
  const gap = parseFloat(getComputedStyle(container).gap) || 30;

  // Klone die Elemente für den "unendlichen" Effekt
  items.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true'); // Wichtig für Barrierefreiheit
    container.appendChild(clone);
  });

  let currentIndex = 0;
  let isTransitioning = false;

  function moveCarousel(instant = false) {
    const itemWidth = items[0].offsetWidth + gap;
    const offset = -currentIndex * itemWidth;
    
    container.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
    container.style.transform = `translateX(${offset}px)`;
  }

  function handleTransitionEnd() {
    isTransitioning = false;

    // Wenn am Ende der geklonten Liste, springe ohne Animation zum Anfang
    if (currentIndex >= itemsCount) {
      currentIndex = 0;
      moveCarousel(true);
    }

    // Wenn vor dem Anfang der Liste, springe ohne Animation zum Ende
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
});
