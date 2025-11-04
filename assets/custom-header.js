class CustomHeader extends HTMLElement {
  constructor() {
    super();
    this.mobileToggle = this.querySelector('.custom-header__mobile-toggle');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.closeButton = this.querySelector('.custom-header-drawer__close');
    this.overlay = this.querySelector('.custom-header-drawer__overlay');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    if (this.mobileToggle && this.mobileMenu) {
      this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
    }
    
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.closeMobileMenu());
    }
    
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeMobileMenu());
    }
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenu?.classList.contains('custom-header-drawer--open')) {
        this.closeMobileMenu();
      }
    });
  }
  
  toggleMobileMenu() {
    const isOpen = this.mobileMenu.classList.contains('custom-header-drawer--open');
    
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }
  
  openMobileMenu() {
    this.mobileMenu.classList.add('custom-header-drawer--open');
    this.mobileToggle.setAttribute('aria-expanded', 'true');
    this.mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  
  closeMobileMenu() {
    this.mobileMenu.classList.remove('custom-header-drawer--open');
    this.mobileToggle.setAttribute('aria-expanded', 'false');
    this.mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

customElements.define('custom-header', CustomHeader);

// Wrap the header element
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.custom-header');
  if (header && !header.matches('custom-header')) {
    const wrapper = document.createElement('custom-header');
    header.parentNode.insertBefore(wrapper, header);
    wrapper.appendChild(header);
  }
});
