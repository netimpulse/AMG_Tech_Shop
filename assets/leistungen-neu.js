class LeistungenCarousel {
  constructor(section) {
    this.section = section;
    this.viewport = this.section.querySelector('.carousel-viewport');
    this.track = this.section.querySelector('.carousel-track');
    this.prevButton = this.section.querySelector('.carousel-arrow--prev');
    this.nextButton = this.section.querySelector('.carousel-arrow--next');
    this.isTransitioning = false;

    // Auf Mobile-Geräten wird natives Scrollen verwendet, daher kein JS nötig.
    if (window.innerWidth <= 749) {
      this.disableJsCarousel();
      return;
    }
    
    this.init();
    // Beobachter, um das Karussell bei Größenänderungen neu zu initialisieren
    new ResizeObserver(() => this.reInit()).observe(this.viewport);
  }

  init() {
    this.originalSlides = Array.from(this.track.children).filter(child => !child.classList.contains('is-clone'));
    if (this.originalSlides.length === 0) return;

    // Berechnen, wie viele Slides sichtbar sind
    const slideWidth = this.originalSlides[0].offsetWidth;
    const viewportWidth = this.viewport.offsetWidth;
    const visibleSlidesCount = Math.floor(viewportWidth / slideWidth);

    // Karussell nur aktivieren, wenn mehr Slides als sichtbar vorhanden sind
    if (this.originalSlides.length <= visibleSlidesCount) {
      this.disableJsCarousel();
      return;
    }

    this.setupClones();
    this.allSlides = Array.from(this.track.children);
    this.slideWidth = this.allSlides[0].offsetWidth;

    // Startposition auf dem ersten "echten" Slide
    this.currentIndex = this.originalSlides.length;
    this.positionTrack(false);

    this.bindEvents();
  }

  reInit() {
    if (window.innerWidth <= 749) {
      this.disableJsCarousel();
      return;
    }
    // Entferne alte Klone und setze das Karussell zurück
    this.track.querySelectorAll('.is-clone').forEach(clone => clone.remove());
    this.track.style.transition = 'none';
    this.track.style.transform = 'translateX(0px)';
    if(this.prevButton) this.prevButton.style.display = 'flex';
    if(this.nextButton) this.nextButton.style.display = 'flex';
    this.init();
  }

  disableJsCarousel() {
    if(this.prevButton) this.prevButton.style.display = 'none';
    if(this.nextButton) this.nextButton.style.display = 'none';
    this.viewport.style.overflowX = 'auto'; // Fallback auf natives Scrollen
  }

  setupClones() {
    // Klone das Ende und stelle es an den Anfang
    this.originalSlides.slice().reverse().forEach(slide => {
      const clone = slide.cloneNode(true);
      clone.classList.add('is-clone');
      this.track.prepend(clone);
    });

    // Klone den Anfang und stelle es ans Ende
    this.originalSlides.forEach(slide => {
      const clone = slide.cloneNode(true);
      clone.classList.add('is-clone');
      this.track.appendChild(clone);
    });
  }

  bindEvents() {
    this.prevButton.addEventListener('click', () => this.move(-1));
    this.nextButton.addEventListener('click', () => this.move(1));
    this.track.addEventListener('transitionend', () => this.handleTransitionEnd());
  }

  move(direction) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.currentIndex += direction;
    this.positionTrack(true);
  }

  positionTrack(animated = true) {
    const offset = -this.currentIndex * this.slideWidth;
    this.track.style.transition = animated ? 'transform 0.5s ease-in-out' : 'none';
    this.track.style.transform = `translateX(${offset}px)`;
  }

  handleTransitionEnd() {
    this.isTransitioning = false;

    // Wenn am Ende der Klone, springe zum Anfang der echten Slides
    if (this.currentIndex >= this.originalSlides.length * 2) {
      this.currentIndex = this.originalSlides.length;
      this.positionTrack(false);
    }

    // Wenn am Anfang der Klone, springe zum Ende der echten Slides
    if (this.currentIndex < this.originalSlides.length) {
      this.currentIndex = this.originalSlides.length * 2 - 1;
      this.positionTrack(false);
    }
  }
}

// Initialisierung der Sektion
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.leistungen-neu-section');
  sections.forEach(section => {
    new LeistungenCarousel(section);
  });
});

// Sicherstellen, dass es auch im Shopify Theme Editor funktioniert
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('.leistungen-neu-section');
    if (section) {
      new LeistungenCarousel(section);
    }
  });
   document.addEventListener('shopify:section:reorder', (event) => {
    const section = event.target.querySelector('.leistungen-neu-section');
    if (section) {
      new LeistungenCarousel(section);
    }
  });
}
