/**
 * TagSystemUtils - Slimmad version för Tabulator tagg-hantering
 * Endast funktionalitet som används i main.js!
 * - Formatter, Editor, HeaderFilter, AND/OR-logik, filter utilities
 */

class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND';
    this.table = null;

    // Konfig för AND/OR-toggle i header
    this.toggleConfig = {
      AND: {
        html: '<i class="fa fa-eye"></i> ALLA',
        title: 'AND-filter: Alla valda taggar måste finnas (klicka för OR)',
        activeStyle: 'background:#007bff;color:white;border:none;border-radius:3px;padding:2px 6px;font-size:10px;margin-left:3px;cursor:pointer;opacity:1;',
        inactiveStyle: 'background:#007bff;color:white;border:none;border-radius:3px;padding:2px 6px;font-size:10px;margin-left:3px;cursor:pointer;opacity:0.4;'
      },
      OR: {
        html: 'OR',
        title: 'OR-filter: Minst en vald tagg måste finnas (klicka för AND)',
        activeStyle: 'background:#28a745;color:white;border:none;border-radius:3px;padding:2px 6px;font-size:10px;margin-left:3px;cursor:pointer;opacity:1;',
        inactiveStyle: 'background:#28a745;color:white;border:none;border-radius:3px;padding:2px 6px;font-size:10px;margin-left:3px;cursor:pointer;opacity:0.4;'
      }
    };
  }

  /**
   * Initiera mot Tabulator-instans
   * @param {Tabulator} tabulatorInstance
   * @param {Object} options
   */
  init(tabulatorInstance, options = {}) {
    this.table = tabulatorInstance;
    if (options.filterLogic) this.filterLogic = options.filterLogic;
    if (options.toggleConfig) Object.assign(this.toggleConfig, options.toggleConfig);
    // Debug event (valfritt)
    if (options.debugMode !== undefined) this.debugMode = options.debugMode;
  }

  /**
   * Formatter: visas som badges
   */
  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (tags.length === 0) return "";
    return (
      '<div class="tag-cell">' +
      tags.map((tag) => `<span class="tag-badge">${tag}</span>`).join("") +
      "</div>"
    );
  }

  /**
   * Editor: denna överskrivs av main.js för AJAX och overlay!
   * Men behövs för Tabulator.
   */
  tagEditor(cell, onRendered, success, cancel) {
    // Enkel fallback, ska överskrivas i main.js.
    const input = document.createElement("input");
    input.type = "text";
    input.value = (cell.getValue() || []).join(", ");
    input.addEventListener("blur", () => {
      success(input.value.split(",").map(s => s.trim()).filter(Boolean));
    });
    onRendered(() => input.focus());
    return input;
  }

  /**
   * Hämtar alla unika taggar från data (fältet kan variera!)
   * main.js patchar denna för rätt fältnamn.
   */
  getAllUniqueTags(data) {
    const tags = new Set();
    data.forEach((row) => {
      if (Array.isArray(row.tags)) {
        row.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }

  /**
   * AND/OR-logik för header filter
   */
  customTagHeaderFilter(headerValue, rowValue, rowData, filterParams) {
    // Om inget filter, visa allt
    if (!headerValue || !Array.isArray(headerValue) || headerValue.length === 0) return true;
    // Om raden saknar taggar, döljs
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false;

    if (this.filterLogic === 'AND') {
      return headerValue.every((selectedTag) => rowValue.includes(selectedTag));
    } else {
      return headerValue.some((selectedTag) => rowValue.includes(selectedTag));
    }
  }

  /**
   * Header filter element med AND/OR-toggle, multi-select badges
   */
  customTagHeaderFilterElement(cell, onRendered, success, cancel, editorParams) {
    const container = document.createElement("div");
    container.className = "custom-tag-header-filter";

    const button = document.createElement("div");
    button.className = "tag-filter-button";
    container.appendChild(button);

    const selectedContainer = document.createElement("div");
    selectedContainer.className = "tag-filter-selected";
    button.appendChild(selectedContainer);

    const logicToggle = document.createElement("button");
    logicToggle.className = "tag-filter-logic-toggle";
    logicToggle.style.display = "none";
    button.appendChild(logicToggle);

    const clearButton = document.createElement("button");
    clearButton.className = "tag-filter-clear";
    clearButton.innerHTML = "×";
    clearButton.title = "Rensa filter";
    clearButton.style.display = "none";
    button.appendChild(clearButton);

    const arrow = document.createElement("div");
    arrow.className = "tag-filter-arrow";
    button.appendChild(arrow);

    const dropdown = document.createElement("div");
    dropdown.className = "tag-filter-dropdown-fixed";
    dropdown.style.display = "none";
    let overlay = null;

    let selectedTags = [];
    let isOpen = false;
    let allTags = this.getAllUniqueTags(this.table.getData());

    // Uppdatera toggle display
    const updateLogicToggleDisplay = () => {
      const config = this.toggleConfig[this.filterLogic];
      logicToggle.innerHTML = config.html;
      logicToggle.title = config.title;
      logicToggle.style.cssText = (selectedTags.length > 0) ? config.activeStyle : config.inactiveStyle;
    };

    const updateDisplay = () => {
      selectedContainer.innerHTML = "";
      if (selectedTags.length === 0) {
        selectedContainer.textContent = "Filtrera taggar...";
        clearButton.style.display = "none";
        logicToggle.style.display = "block";
      } else {
        selectedTags.forEach(tag => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "tag-badge";
          tagBadge.textContent = tag;
          selectedContainer.appendChild(tagBadge);
        });
        clearButton.style.display = "block";
        logicToggle.style.display = "block";
      }
      updateLogicToggleDisplay();
    };

    const updateDropdown = () => {
      dropdown.innerHTML = "";
      allTags = this.getAllUniqueTags(this.table.getData());
      allTags.forEach(tag => {
        const option = document.createElement("div");
        option.className = "tag-filter-option";
        option.textContent = tag;
        if (selectedTags.includes(tag)) option.classList.add("selected");
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleTag(tag);
        });
        dropdown.appendChild(option);
      });
    };

    const toggleTag = (tag) => {
      const idx = selectedTags.indexOf(tag);
      if (idx > -1) {
        selectedTags.splice(idx, 1);
      } else {
        selectedTags.push(tag);
      }
      this.currentFilter = [...selectedTags];
      updateDisplay();
      updateDropdown();
      const filterValue = selectedTags.length > 0 ? [...selectedTags] : null;
      success(filterValue);
    };

    const closeDropdown = () => {
      isOpen = false;
      dropdown.style.display = "none";
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      arrow.classList.remove("open");
    };

    const toggleDropdown = () => {
      if (isOpen) {
        closeDropdown();
        return;
      }
      isOpen = true;
      arrow.classList.add("open");
      updateDropdown();
      overlay = document.createElement("div");
      overlay.className = "dropdown-overlay";
      document.body.appendChild(overlay);

      document.body.appendChild(dropdown);
      const rect = button.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (rect.bottom + 2) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';
      dropdown.style.display = 'block';
      dropdown.style.zIndex = '99999';

      overlay.addEventListener("click", closeDropdown);
    };

    button.addEventListener("click", (e) => {
      if (e.target === logicToggle) {
        e.stopPropagation();
        this.filterLogic = this.filterLogic === 'AND' ? 'OR' : 'AND';
        updateDisplay();
        if (selectedTags.length > 0) this.table.refreshFilter();
        return;
      }
      if (e.target === clearButton) {
        e.stopPropagation();
        selectedTags = [];
        this.currentFilter = [];
        updateDisplay();
        success(null);
        return;
      }
      toggleDropdown();
    });

    clearButton.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedTags = [];
      this.currentFilter = [];
      updateDisplay();
      success(null);
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target) && !dropdown.contains(e.target) && isOpen) {
        closeDropdown();
      }
    });

    // Init value
    const initialValue = cell.getValue();
    if (initialValue && Array.isArray(initialValue)) {
      selectedTags = [...initialValue];
      this.currentFilter = [...selectedTags];
    }

    onRendered(() => {
      updateDisplay();
    });

    return container;
  }

  // Utilities
  setFilterLogic(logic) { this.filterLogic = logic; }
  getFilterLogic() { return this.filterLogic; }
  getCurrentFilter() { return [...this.currentFilter]; }

  /**
   * Skapa kolumn-konfiguration (main.js patchar editor etc vid behov)
   */
  getColumnConfig(fieldName = 'tags') {
    return {
      title: "Taggar",
      field: fieldName,
      formatter: this.tagFormatter.bind(this),
      editor: this.tagEditor.bind(this),
      headerFilter: this.customTagHeaderFilterElement.bind(this),
      headerFilterFunc: this.customTagHeaderFilter.bind(this),
      headerFilterEmptyCheck: function (value) {
        return !value || !Array.isArray(value) || value.length === 0;
      }
    };
  }
}

// Endast nödvändiga exports
export default TagSystemUtils;
