class ServiceTabsInteractive {
  constructor(sectionElement) {
    this.section = sectionElement;
    if (!this.section) return;

    this.tabs = this.section.querySelectorAll('[data-tab-for]');
    this.contentPanels = this.section.querySelectorAll('[data-content-for]');

    this.init();
  }

  init() {
    if (!this.tabs.length) return;

    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.handleTabClick(tab));
    });
  }

  handleTabClick(clickedTab) {
    const targetId = clickedTab.dataset.tabFor;

    // Deaktiviere alle anderen Tabs und Panels in dieser Sektion
    this.tabs.forEach(tab => tab.classList.remove('is-active'));
    this.contentPanels.forEach(panel => panel.classList.remove('is-active'));
    
    // Aktiviere das geklickte Tab
    clickedTab.classList.add('is-active');
    
    // Aktiviere den zugehörigen Inhalt
    const targetPanel = this.section.querySelector(`.interactive-content__panel[data-content-for="${targetId}"]`);
    if (targetPanel) {
      targetPanel.classList.add('is-active');
    }
  }
}

// Initialisierung für jede Sektion auf der Seite
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.service-tabs-interactive-section');
  sections.forEach(section => {
    new ServiceTabsInteractive(section);
  });
});

// Stellt sicher, dass es auch im Shopify Theme Editor funktioniert
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const sectionElement = event.target.querySelector('.service-tabs-interactive-section');
    if (sectionElement) {
      new ServiceTabsInteractive(sectionElement);
    }
  });
  document.addEventListener('shopify:section:reorder', () => {
     // Bei Neu-Sortierung alle Sektionen neu initialisieren
     document.querySelectorAll('.service-tabs-interactive-section').forEach(section => {
        new ServiceTabsInteractive(section);
     });
  });
}
