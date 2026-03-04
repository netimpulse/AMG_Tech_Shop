(function () {
  'use strict';

  function closeOthers(container, current) {
    if (!container) return;
    if (container.dataset.closeOthers !== 'true') return;

    container.querySelectorAll('.ah-hotspot.is-active').forEach(hs => {
      if (hs !== current) {
        hs.classList.remove('is-active');
        const btn = hs.querySelector('.ah-dot');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initSection(section) {
    const hotspots = section.querySelectorAll('[data-hotspot]');
    hotspots.forEach(hs => {
      const btn = hs.querySelector('.ah-dot');
      if (!btn) return;

      btn.addEventListener('click', () => {
        const isActive = hs.classList.toggle('is-active');
        btn.setAttribute('aria-expanded', String(isActive));
        if (isActive) closeOthers(section, hs);
      });

      // close when clicking outside
      document.addEventListener('click', (e) => {
        if (!section.contains(e.target)) {
          hs.classList.remove('is-active');
          btn.setAttribute('aria-expanded', 'false');
        }
      });

      // close on ESC
      hs.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          hs.classList.remove('is-active');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });
    });
  }

  // Init on load & when Shopify Theme Editor re-renders
  function initAll() {
    document.querySelectorAll('[data-section-id]').forEach(initSection);
  }

  document.addEventListener('DOMContentLoaded', initAll);
  document.addEventListener('shopify:section:load', function (e) {
    const section = e.target;
    if (section && section.matches('[data-section-id]')) initSection(section);
  });
  document.addEventListener('shopify:section:select', function (e) {
    const section = e.target;
    if (section && section.matches('[data-section-id]')) initSection(section);
  });
})();
