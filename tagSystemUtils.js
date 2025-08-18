/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Stöder AND/OR-logik, debug-läge, konfigurerbar UI och AJAX-integrering
 */
class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND';
    this.table = null;
    this.ajaxCallback = null;
    this.toggleConfig = {
      AND: {
        html: '<i class="fa fa-eye text-success text-warning"></i> ALLA',
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

  // ======= Hjälpfunktioner för att hämta taggar per nivå =======
  static getExistingPartTags(project) {
    const partTags = new Set();
    project.prt_parts?.forEach(part => {
      if (Array.isArray(part.prt_tags)) part.prt_tags.forEach(tag => partTags.add(tag));
    });
    return Array.from(partTags).sort();
  }
  static getExistingItemTags(project) {
    const itemTags = new Set();
    project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        if (Array.isArray(item.itm_tags)) item.itm_tags.forEach(tag => itemTags.add(tag));
      });
    });
    return Array.from(itemTags).sort();
  }
  static getExistingTaskTags(project) {
    const taskTags = new Set();
    project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        item.itm_tasks?.forEach(task => {
          if (Array.isArray(task.tsk_tags)) task.tsk_tags.forEach(tag => taskTags.add(tag));
        });
      });
    });
    return Array.from(taskTags).sort();
  }
  static getExistingTagsForEntityType(project, entityType) {
    switch(entityType) {
      case 'part': return TagSystemUtils.getExistingPartTags(project);
      case 'item': return TagSystemUtils.getExistingItemTags(project);
      case 'task': return TagSystemUtils.getExistingTaskTags(project);
      default: return [];
    }
  }

  /**
   * Initialiserar tag-systemet med en Tabulator-instans
   * @param {Tabulator} tabulatorInstance - Tabulator-instansen
   * @param {Object} options - Konfigurationsalternativ
   */
  init(tabulatorInstance, options = {}) {
    this.table = tabulatorInstance;
    if (options.debugMode !== undefined) this.debugMode = options.debugMode;
    if (options.filterLogic) this.filterLogic = options.filterLogic;
    if (options.ajaxCallback) this.ajaxCallback = options.ajaxCallback;
    if (options.toggleConfig) {
      Object.assign(this.toggleConfig, options.toggleConfig);
    }

    this.table.on("dataFiltered", (filters, rows) => {
      if (this.debugMode) {
        this.updateDebugInfo(this.currentFilter);
      }
    });
  }

  setAjaxCallback(callback) {
    this.ajaxCallback = callback;
  }
  updateToggleConfig(logic, newConfig) {
    if (this.toggleConfig[logic]) {
      Object.assign(this.toggleConfig[logic], newConfig);
    }
  }
  countVisibleRows() {
    if (!this.table) return 0;
    const tableElement = this.table.element.querySelector(".tabulator-table");
    if (!tableElement) {
      console.error("Tabellens DOM-element hittades inte!");
      return 0;
    }
    const visibleRows = Array.from(tableElement.querySelectorAll(".tabulator-row"))
      .filter(row => row.style.display !== "none")
      .length;
    return visibleRows;
  }
  updateDebugInfo(selectedTags) {
    if (!this.debugMode) return;
    const debugElement = document.getElementById('debug-text');
    if (!debugElement) return;
    setTimeout(() => {
      const visibleRows = this.countVisibleRows();
      if (selectedTags.length === 0) {
        debugElement.textContent = `Inget filter aktivt - ${visibleRows} rader visas`;
      } else {
        debugElement.textContent = `Filter: [${selectedTags.join(', ')}] - ${visibleRows} rader visas (${this.filterLogic}-logik)`;
      }
    }, 100);
  }
  getAllUniqueTags(data) {
    const tags = new Set();
    data.forEach((row) => {
      if (Array.isArray(row.tags)) {
        row.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }
  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (tags.length === 0) return "";
    return (
      '<div class="tag-cell">' +
      tags.map((tag) => `<span class="tag-badge">${tag}</span>`).join("") +
      "</div>"
    );
  }
  tagEditor(cell, onRendered, success, cancel) {
    // Se din befintliga implementation
    // (behåll originaleditor om du inte flyttar editorn, annars byt ut till din custom-editor)
    return document.createElement("div");
  }
  customTagHeaderFilter(headerValue, rowValue, rowData, filterParams) {
    if (this.debugMode) {
      console.log('=== TAG SYSTEM FILTER CHECK ===');
      console.log('Row:', rowData.namn || rowData.itm_name || rowData.prt_name || rowData.tsk_name);
      console.log('Selected filter tags:', headerValue);
      console.log('Row tags:', rowValue);
      console.log('Filter logic:', this.filterLogic);
    }
    if (!headerValue || !Array.isArray(headerValue) || headerValue.length === 0) return true;
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false;
    let result;
    if (this.filterLogic === 'AND') {
      result = headerValue.every((selectedTag) => rowValue.includes(selectedTag));
    } else {
      result = headerValue.some((selectedTag) => rowValue.includes(selectedTag));
    }
    return result;
  }
  customTagHeaderFilterElement(cell, onRendered, success, cancel, editorParams) {
    // Se din befintliga implementation (UI för header-filter)
    return document.createElement("div");
  }
  clearFilters() {
    this.currentFilter = [];
    this.table.clearHeaderFilter();
    this.updateDebugInfo([]);
  }
  toggleDebug() {
    this.debugMode = !this.debugMode;
    const debugInfo = document.getElementById('debug-info-tag-system');
    if (debugInfo) {
      debugInfo.style.display = this.debugMode ? 'block' : 'none';
    }
    if (this.debugMode) {
      this.updateDebugInfo(this.currentFilter);
    }
  }
  setFilterLogic(logic) {
    this.filterLogic = logic;
  }
  getFilterLogic() {
    return this.filterLogic;
  }
  getCurrentFilter() {
    return [...this.currentFilter];
  }
  isDebugMode() {
    return this.debugMode;
  }
  getToggleConfig() {
    return this.toggleConfig;
  }
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

export default TagSystemUtils;
