// Exempel på korrekt modulstruktur
const MaterialLinksModule = {
  config: {
    materialTypes: ["SV-ENR", "Type 2", "Type 5"],
    selectors: { modal: 'linksModal', container: 'linksContainer', title: 'modalLinksTitle' }
  },
  modal: null,
  linksContainer: null,
  title: null,
  initialized: false,

  sanitizeForHTML(str) { /* ... */ },
  sanitizeForAttribute(str) { /* ... */ },
  validateMaterialNumber(materialNumber) { /* ... */ },

  // Formatter används via main.js
  linksModalUtils: {
    generateLinks(materialNumber, materialName, itemType) { /* ... */ },
    show(materialNumber, materialName, itemType, parentModule) { /* ... */ },
    hide(parentModule) { /* ... */ }
  },

  updateMaterialLinkColumn(row) {
    const linkCell = row.getCell("tsk_material_link");
    if (linkCell) {
      row.update(row.getData());
    }
  },

  init() {
    if (this.initialized) return;
    this.modal = document.getElementById(this.config.selectors.modal);
    this.linksContainer = document.getElementById(this.config.selectors.container);
    this.title = document.getElementById(this.config.selectors.title);
    if (!this.modal || !this.linksContainer || !this.title) {
      console.warn('MaterialLinksModule: Required DOM elements not found');
      return;
    }
    this.setupEventListeners();
    this.initialized = true;
  },

  setupEventListeners() {
    const closeBtn = document.getElementById('closeLinks');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.linksModalUtils.hide(this));
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.linksModalUtils.hide(this);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
        this.linksModalUtils.hide(this);
      }
    });
  }
};

export default MaterialLinksModule;
