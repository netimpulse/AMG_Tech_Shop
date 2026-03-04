class CustomIconCarousel {
  constructor(sectionElement) {
    this.section = sectionElement;
    this.viewport = this.section.querySelector('.carousel-viewport');
    this.track = this.section.querySelector('.carousel-track');
    this.slides = Array.from(this.track.children);
    this.prevButton = this.section.querySelector('.carousel-arrow--prev');
    this.nextButton = this.section.querySelector('.carousel-arrow--next');
    
    if (this.slides.length === 0) return;
    
    // Start with the middle item (index 1) for the 3-item view
    this.currentIndex = 1;
    if (this.slides.length < 3) this.currentIndex = 0;

    // Adjust for mobile
    if (window.innerWidth <= 749) this.currentIndex = 0;

    this.init();
  }

  init() {
    this.bindEvents();
    requestAnimationFrame(() => this.update());
  }

  bindEvents() {
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.moveTo(this.currentIndex - 1));
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.moveTo(this.currentIndex + 1));
    }
    
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.update(), 150);
    });
  }

  moveTo(newIndex) {
    if (newIndex < 0 || newIndex >= this.slides.length) return;
    this.currentIndex = newIndex;
    this.update();
  }

  update() {
    if (!this.slides[0]) return; // Exit if no slides
    const slideWidth = this.slides[0].offsetWidth;
    
    const offset = (this.viewport.offsetWidth / 2) - (slideWidth / 2);
    const newTransform = -(this.currentIndex * slideWidth) + offset;
    
    this.track.style.transform = `translateX(${newTransform}px)`;

    this.slides.forEach((slide, index) => {
      if (index === this.currentIndex) {
        slide.classList.add('is-selected');
        slide.setAttribute('aria-current', 'true');
      } else {
        slide.classList.remove('is-selected');
        slide.removeAttribute('aria-current');
      }
    });

    if (this.prevButton && this.nextButton) {
      this.prevButton.disabled = this.currentIndex === 0;
      this.nextButton.disabled = this.currentIndex === this.slides.length - 1;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const carouselSections = document.querySelectorAll('.custom-icon-carousel-section');
  carouselSections.forEach(section => {
    if (section.closest('.shopify-app-block')) return;
    new CustomIconCarousel(section);
  });
});

if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('.custom-icon-carousel-section');
    if (section) {
      new CustomIconCarousel(section);
    }
  });
}
