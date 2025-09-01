// MaterialLinksModule.js
// UI-only modal and formatter logic for material link columns (no AJAX/data-handling)

const MaterialLinksModule = {
  config: {
    materialTypes: ["SV-ENR", "Type 2", "Type 5"],
    selectors: { modal: 'linksModal', container: 'linksContainer', title: 'modalLinksTitle' }
  },
  modal: null,
  linksContainer: null,
  title: null,
  initialized: false,

  // Simple HTML sanitizer (XSS-safe for label usage)
  sanitizeForHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[m]));
  },
  // For attribute values
  sanitizeForAttribute(str) {
    return this.sanitizeForHTML(str).replace(/"/g, '');
  },
  validateMaterialNumber(materialNumber) {
    return typeof materialNumber === "string" && materialNumber.trim().length > 0;
  },

  linksModalUtils: {
    /**
     * Generate array of {url, label} for modal display,
     * based on number, name, type fields.
     */
    generateLinks(materialNumber, materialName, itemType) {
      const links = [];
      if (materialNumber)
        links.push({
          url: `https://search.example.com/material/${encodeURIComponent(materialNumber)}`,
          label: `Sök på materialnummer: ${materialNumber}`
        });
      if (materialName)
        links.push({
          url: `https://search.example.com/material-name/${encodeURIComponent(materialName)}`,
          label: `Sök på materialnamn: ${materialName}`
        });
      if (itemType)
        links.push({
          url: `https://search.example.com/material-type/${encodeURIComponent(itemType)}`,
          label: `Sök på materialtyp: ${itemType}`
        });
      return links;
    },

    /**
     * Show the modal overlay with generated links.
     * Accepts sanitized data.
     */
    show(materialNumber, materialName, itemType, parentModule) {
      // Title
      if (parentModule.title) {
        parentModule.title.textContent =
          `Länkar för ${materialNumber || materialName || "okänt material"} (${itemType || "-"})`;
      }
      // Links rendering
      if (parentModule.linksContainer) {
        const links = this.generateLinks(materialNumber, materialName, itemType);
        parentModule.linksContainer.innerHTML = links.length
          ? links.map(link =>
              `<div class="tab-modal-link-item"><a href="${link.url}" target="_blank" rel="noopener noreferrer">${parentModule.sanitizeForHTML(link.label)}</a></div>`
            ).join("")
          : '<div class="tab-modal-link-item">Inga länkar för detta material.</div>';
      }
      // Show modal
      if (parentModule.modal) {
        parentModule.modal.style.display = "flex";
        setTimeout(() => parentModule.modal.classList.add("active"), 10);
      }
    },

    /**
     * Hide the modal overlay.
     */
    hide(parentModule) {
      if (parentModule.modal) {
        parentModule.modal.classList.remove("active");
        setTimeout(() => { parentModule.modal.style.display = "none"; }, 200);
      }
    }
  },

  /**
   * Updates the "Material Links" column cell when underlying values change.
   */
  updateMaterialLinkColumn(row) {
    const linkCell = row.getCell("tsk_material_link");
    if (linkCell) {
      row.update(row.getData());
    }
  },

  /**
   * Initializes modal DOM references and event listeners.
   * Should be called ONCE on application start.
   */
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

  /**
   * Sets up close/ESC/click listeners for modal UI.
   */
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
