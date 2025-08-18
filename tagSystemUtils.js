/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Stöder AND/OR-logik, debug-läge, konfigurerbar UI och AJAX-integrering
 */

class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND'; // 'AND' eller 'OR'
    this.table = null;
    this.ajaxCallback = null; // För AJAX-hantering

    // KONFIGURATION FÖR TOGGLE-KNAPPEN
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

  /**
   * Initialiserar tag-systemet med en Tabulator-instans
   * @param {Tabulator} tabulatorInstance - Tabulator-instansen
   * @param {Object} options - Konfigurationsalternativ
   */
  init(tabulatorInstance, options = {}) {
    this.table = tabulatorInstance;

    // Konfigurera alternativ
    if (options.debugMode !== undefined) this.debugMode = options.debugMode;
    if (options.filterLogic) this.filterLogic = options.filterLogic;
    if (options.ajaxCallback) this.ajaxCallback = options.ajaxCallback;
    if (options.toggleConfig) {
      Object.assign(this.toggleConfig, options.toggleConfig);
    }

    // Lyssna på dataFiltered event för att uppdatera debug info
    this.table.on("dataFiltered", (filters, rows) => {
      if (this.debugMode) {
        this.updateDebugInfo(this.currentFilter);
      }
    });
  }

  /**
   * Sätt AJAX-callback funktion
   * @param {Function} callback - Callback-funktion för AJAX-anrop
   */
  setAjaxCallback(callback) {
    this.ajaxCallback = callback;
  }

  /**
   * Funktion för att uppdatera toggle-konfiguration
   */
  updateToggleConfig(logic, newConfig) {
    if (this.toggleConfig[logic]) {
      Object.assign(this.toggleConfig[logic], newConfig);
    }
  }

  /**
   * Förbättrad funktion för att räkna synliga rader med DOM
   */
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

  /**
   * Uppdaterar debug-information
   */
  updateDebugInfo(selectedTags) {
    if (!this.debugMode) return;

    const debugElement = document.getElementById('debug-text');
    if (!debugElement) return;

    // Vänta lite för att DOM ska uppdateras efter filtrering
    setTimeout(() => {
      const visibleRows = this.countVisibleRows();

      if (selectedTags.length === 0) {
        debugElement.textContent = `Inget filter aktivt - ${visibleRows} rader visas`;
      } else {
        debugElement.textContent = `Filter: [${selectedTags.join(', ')}] - ${visibleRows} rader visas (${this.filterLogic}-logik)`;
      }
    }, 100);
  }

  /**
   * Hämtar alla unika taggar från data
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
   * Formatter: visar taggar som badges UTAN kryss i visningsläge
   */
  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (tags.length === 0) return "";
    return (
      '<div class="tag-cell">' +
      tags
        .map((tag) => `<span class="tag-badge">${tag}</span>`)
        .join("") +
      "</div>"
    );
  }

  /**
   * Editor: lägga till/ta bort taggar med dropdown för befintliga taggar
   * Inkluderar AJAX-hantering för taggändringar
   */
  tagEditor(cell, onRendered, success, cancel) {
    const container = document.createElement("div");
    container.className = "tag-editor-container";

    let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()] : [];
    const originalTags = [...currentTags];

    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-display-container";
    container.appendChild(tagContainer);

    const inputContainer = document.createElement("div");
    inputContainer.className = "input-group mt-2 position-relative";
    container.appendChild(inputContainer);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.placeholder = "Lägg till tagg...";
    inputContainer.appendChild(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary";
    button.textContent = "Lägg till";
    inputContainer.appendChild(button);

    // Dropdown för befintliga taggar
    const dropdown = document.createElement("div");
    dropdown.className = "tag-suggestions-dropdown";
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 40px;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    inputContainer.appendChild(dropdown);

    // FIXAD - Säker hämtning av befintliga taggar
    const getAllExistingTags = () => {
      const allTags = new Set();

      // Kontrollera att table finns och är initialiserad
      if (!this.table || typeof this.table.getData !== 'function') {
        console.warn('Tabulator-instansen är inte tillgänglig');
        return [];
      }

      try {
        const tableData = this.table.getData();
        if (!Array.isArray(tableData)) {
          console.warn('Table data är inte en array');
          return [];
        }

        tableData.forEach(row => {
          if (Array.isArray(row.tags)) {
            row.tags.forEach(tag => allTags.add(tag));
          }
        });
      } catch (error) {
        console.error('Fel vid hämtning av tabelldata:', error);
        return [];
      }

      return Array.from(allTags).sort();
    };

    // Uppdatera dropdown baserat på input
    const updateDropdown = (searchText = '') => {
      const existingTags = getAllExistingTags();
      const filteredTags = existingTags.filter(tag =>
        !currentTags.includes(tag) &&
        tag.toLowerCase().includes(searchText.toLowerCase())
      );

      dropdown.innerHTML = '';

      if (filteredTags.length === 0 || searchText === '') {
        dropdown.style.display = 'none';
        return;
      }

      filteredTags.slice(0, 10).forEach(tag => {
        const option = document.createElement("div");
        option.className = "tag-suggestion-option";
        option.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
          transition: background-color 0.2s;
        `;
        option.textContent = tag;

        option.addEventListener('mouseenter', () => {
          option.style.backgroundColor = '#f8f9fa';
        });

        option.addEventListener('mouseleave', () => {
          option.style.backgroundColor = 'transparent';
        });

        option.addEventListener('click', (e) => {
          e.stopPropagation();
          addTag(tag);
          input.value = '';
          dropdown.style.display = 'none';
          input.focus();
        });

        dropdown.appendChild(option);
      });

      dropdown.style.display = 'block';
    };

    // Event listeners för input
    input.addEventListener('input', (e) => {
      updateDropdown(e.target.value);
    });

    input.addEventListener('focus', (e) => {
      if (e.target.value) {
        updateDropdown(e.target.value);
      }
    });

    // Dölj dropdown när man klickar utanför
    document.addEventListener('click', (e) => {
      if (!inputContainer.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Hantera piltangenter för navigation
    input.addEventListener('keydown', (e) => {
      const options = dropdown.querySelectorAll('.tag-suggestion-option');

      if (e.key === 'ArrowDown' && options.length > 0) {
        e.preventDefault();
        const activeOption = dropdown.querySelector('.active') || options[0];
        const currentIndex = Array.from(options).indexOf(activeOption);
        const nextIndex = Math.min(currentIndex + 1, options.length - 1);

        options.forEach(opt => opt.classList.remove('active'));
        options[nextIndex].classList.add('active');
        options[nextIndex].style.backgroundColor = '#007bff';
        options[nextIndex].style.color = 'white';
      }

      if (e.key === 'ArrowUp' && options.length > 0) {
        e.preventDefault();
        const activeOption = dropdown.querySelector('.active');
        if (activeOption) {
          const currentIndex = Array.from(options).indexOf(activeOption);
          const prevIndex = Math.max(currentIndex - 1, 0);

          options.forEach(opt => {
            opt.classList.remove('active');
            opt.style.backgroundColor = 'transparent';
            opt.style.color = 'inherit';
          });
          options[prevIndex].classList.add('active');
          options[prevIndex].style.backgroundColor = '#007bff';
          options[prevIndex].style.color = 'white';
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const activeOption = dropdown.querySelector('.active');
        if (activeOption) {
          addTag(activeOption.textContent);
          input.value = '';
          dropdown.style.display = 'none';
        } else {
          addTag(input.value.trim());
          input.value = '';
          dropdown.style.display = 'none';
        }
      }

      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        input.blur();
      }
    });

    const addTag = (tag) => {
      if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
        updateTagDisplay();
      }
    };

    const removeTag = (tag) => {
      const idx = currentTags.indexOf(tag);
      if (idx > -1) {
        currentTags.splice(idx, 1);
        updateTagDisplay();
      }
    };

    const updateTagDisplay = () => {
      tagContainer.innerHTML = "";

      if (currentTags.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "text-muted small p-2";
        emptyMessage.textContent = "Inga taggar tillagda";
        tagContainer.appendChild(emptyMessage);
        return;
      }

      currentTags.forEach((tag) => {
        const tagElement = document.createElement("div");
        tagElement.className = "tag-badge d-inline-flex align-items-center";

        const tagText = document.createElement("span");
        tagText.textContent = tag;
        tagElement.appendChild(tagText);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "btn-close btn-close-white ms-1 remove-tag-btn";
        removeButton.setAttribute("data-tag", tag);
        removeButton.setAttribute("tabindex", "-1");
        removeButton.setAttribute("aria-label", "Ta bort");
        removeButton.addEventListener("click", function (e) {
          e.stopPropagation();
          removeTag(tag);
        });

        tagElement.appendChild(removeButton);
        tagContainer.appendChild(tagElement);
      });
    };

    updateTagDisplay();

    button.addEventListener("click", function () {
      addTag(input.value.trim());
      input.value = "";
      dropdown.style.display = 'none';
      input.focus();
    });

    // FIXAD - Använd arrow function för att bevara this-kontext
    // Lägg till AJAX-hantering när taggar ändras
    container.addEventListener("focusout", (e) => {
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          success(currentTags);
          const tagsChanged = JSON.stringify(originalTags) !== JSON.stringify(currentTags);
          if (tagsChanged) {
            // Säker kontroll av table-instans
            if (this.table && typeof this.table.getData === 'function') {
              setTimeout(() => {
                try {
                  this.table.setData(this.table.getData());
                } catch (error) {
                  console.error('Fel vid uppdatering av tabelldata:', error);
                }
              }, 10);
            }

            // AJAX-anrop för taggändring (hanteras av den omslutande koden)
            console.log('Taggar ändrade:', {
              old: originalTags,
              new: currentTags,
              rowData: cell.getRow().getData()
            });
          }
        }
      }, 200);
    });

    onRendered(function () {
      input.focus();
      const cellRect = cell.getElement().getBoundingClientRect();
      container.style.minWidth = Math.max(cellRect.width, 250) + "px";
      container.style.position = "absolute";
    });

    return container;
  }

  /**
   * Custom Tag HeaderFilter med AND/OR-logik
   */
  customTagHeaderFilter(headerValue, rowValue, rowData, filterParams) {
    // Debug logging
    if (this.debugMode) {
      console.log('=== TAG SYSTEM FILTER CHECK ===');
      console.log('Row:', rowData.namn || rowData.itm_name || rowData.prt_name || rowData.tsk_name);
      console.log('Selected filter tags:', headerValue);
      console.log('Row tags:', rowValue);
      console.log('Filter logic:', this.filterLogic);
    }

    // Om inget filter är satt, visa alla rader
    if (!headerValue || !Array.isArray(headerValue) || headerValue.length === 0) {
      if (this.debugMode) console.log('No filter active - showing row');
      return true;
    }

    // Om raden inte har några taggar, dölj den
    if (!Array.isArray(rowValue) || rowValue.length === 0) {
      if (this.debugMode) console.log('Row has no tags - hiding row');
      return false;
    }

    let result;

    if (this.filterLogic === 'AND') {
      // AND-logik: ALLA valda taggar måste finnas i raden
      result = headerValue.every((selectedTag) => {
        const hasTag = rowValue.includes(selectedTag);
        if (this.debugMode) {
          console.log(`  AND - Checking if row has tag "${selectedTag}":`, hasTag);
        }
        return hasTag;
      });
    } else {
      // OR-logik: MINST EN vald tagg måste finnas i raden
      result = headerValue.some((selectedTag) => {
        const hasTag = rowValue.includes(selectedTag);
        if (this.debugMode) {
          console.log(`  OR - Checking if row has tag "${selectedTag}":`, hasTag);
        }
        return hasTag;
      });
    }

    if (this.debugMode) {
      console.log(`Final result (${this.filterLogic} logic - show row):`, result);
      console.log('===================');
    }

    return result;
  }

  /**
   * Custom Tag Header Filter Element
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

    const placeholder = document.createElement("span");
    placeholder.className = "tag-filter-placeholder";
    placeholder.textContent = "Filtrera taggar...";
    selectedContainer.appendChild(placeholder);

    // AND/OR Toggle Button med konfigurerbar HTML
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

    // Overlay-baserad dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "tag-filter-dropdown-fixed";
    dropdown.style.display = "none";

    let overlay = null;
    let selectedTags = [];
    let isOpen = false;
    let allTags = this.getAllUniqueTags(this.table.getData());

    // Funktion för att uppdatera toggle-knappen med konfigurerbar HTML
    const updateLogicToggleDisplay = () => {
      const config = this.toggleConfig[this.filterLogic];

      logicToggle.innerHTML = config.html;
      logicToggle.title = config.title;

      // Bestäm vilken stil som ska användas baserat på om filter är aktivt
      const isActive = selectedTags.length > 0;
      logicToggle.style.cssText = isActive ? config.activeStyle : config.inactiveStyle;
    };

    const updateDisplay = () => {
      selectedContainer.innerHTML = "";

      if (selectedTags.length === 0) {
        const placeholder = document.createElement("span");
        placeholder.className = "tag-filter-placeholder";
        placeholder.textContent = "Filtrera taggar...";
        selectedContainer.appendChild(placeholder);
        clearButton.style.display = "none";

        // Visa toggle-knappen alltid
        logicToggle.style.display = "block";
      } else {
        selectedTags.forEach(tag => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "tag-badge";
          tagBadge.textContent = tag;
          selectedContainer.appendChild(tagBadge);
        });
        clearButton.style.display = "block";

        // Visa toggle-knappen med full opacitet när aktiv
        logicToggle.style.display = "block";
      }

      // Uppdatera toggle-knappens utseende
      updateLogicToggleDisplay();
    };

    const updateDropdown = () => {
      dropdown.innerHTML = "";
      allTags.forEach(tag => {
        const option = document.createElement("div");
        option.className = "tag-filter-option";
        option.textContent = tag;

        if (selectedTags.includes(tag)) {
          option.classList.add("selected");
        }

        option.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleTag(tag);
        });

        dropdown.appendChild(option);
      });
    };

    const toggleTag = (tag) => {
      const index = selectedTags.indexOf(tag);
      if (index > -1) {
        selectedTags.splice(index, 1);
      } else {
        selectedTags.push(tag);
      }

      // Uppdatera currentFilter för debug
      this.currentFilter = [...selectedTags];

      updateDisplay();
      updateDropdown();

      // Skicka filter till Tabulator - viktigt att skicka array eller null
      const filterValue = selectedTags.length > 0 ? [...selectedTags] : null;
      success(filterValue);

      // Uppdatera debug info
      this.updateDebugInfo(selectedTags);
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
      allTags = this.getAllUniqueTags(this.table.getData());

      // Overlay-metod
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

      updateDropdown();

      // Stäng dropdown när man klickar på overlay
      overlay.addEventListener("click", closeDropdown);
    };

    button.addEventListener("click", (e) => {
      // Hantera logic toggle
      if (e.target === logicToggle) {
        e.stopPropagation();
        this.filterLogic = this.filterLogic === 'AND' ? 'OR' : 'AND';
        updateDisplay();

        // Tvinga om-filtrering
        if (selectedTags.length > 0) {
          this.table.refreshFilter();
        }

        this.updateDebugInfo(selectedTags);
        return;
      }

      // Hantera clear button
      if (e.target === clearButton) {
        e.stopPropagation();
        selectedTags = [];
        this.currentFilter = [];
        updateDisplay();
        success(null);
        this.updateDebugInfo(selectedTags);
        return;
      }

      // Öppna dropdown
      toggleDropdown();
    });

    clearButton.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedTags = [];
      this.currentFilter = [];
      updateDisplay();
      success(null);
      this.updateDebugInfo(selectedTags);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target) && !dropdown.contains(e.target) && isOpen) {
        closeDropdown();
      }
    });

    // Set initial value if provided
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

  /**
   * Rensa alla filter
   */
  clearFilters() {
    this.currentFilter = [];
    this.table.clearHeaderFilter();
    this.updateDebugInfo([]);
  }

  /**
   * Växla debug-läge
   */
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

  /**
   * Sätt filter-logik
   */
  setFilterLogic(logic) {
    this.filterLogic = logic;
  }

  /**
   * Hämta nuvarande filter-logik
   */
  getFilterLogic() {
    return this.filterLogic;
  }

  /**
   * Hämta nuvarande filter
   */
  getCurrentFilter() {
    return [...this.currentFilter];
  }

  /**
   * Kontrollera om debug-läge är aktivt
   */
  isDebugMode() {
    return this.debugMode;
  }

  /**
   * Hämta toggle-konfiguration
   */
  getToggleConfig() {
    return this.toggleConfig;
  }

  /**
   * Hämta kolumn-konfiguration för Tabulator
   * Inkluderar AJAX-hantering om callback är satt
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

// ======= SÄKRA FLYTTADE FUNKTIONER =======

/**
 * Hämtar alla existerande taggar i projektet (delad utility)
 * @param {Object} project - projektobjektet med prt_parts
 * @returns {string[]} - sorterad array av unika taggar
 */
export function getAllExistingTags(project) {
  const allTags = new Set();
  // Samla taggar från parts
  project.prt_parts?.forEach(part => {
    if (Array.isArray(part.prt_tags)) {
      part.prt_tags.forEach(tag => allTags.add(tag));
    }
    // Samla taggar från items
    part.prt_items?.forEach(item => {
      if (Array.isArray(item.itm_tags)) {
        item.itm_tags.forEach(tag => allTags.add(tag));
      }
      // Samla taggar från tasks
      item.itm_tasks?.forEach(task => {
        if (Array.isArray(task.tsk_tags)) {
          task.tsk_tags.forEach(tag => allTags.add(tag));
        }
      });
    });
  });
  return Array.from(allTags).sort();
}

/**
 * Skicka AJAX-anrop för tagguppdatering (delad utility)
 * @param {string} entityType - "part", "item" eller "task"
 * @param {number|string} entityId
 * @param {string[]} newTags
 * @param {string[]} [oldTags=[]]
 */
export function handleTagUpdate(entityType, entityId, newTags, oldTags = []) {
  // Kräver att ajaxHandler är globalt tillgänglig
  if (typeof ajaxHandler !== "undefined" && ajaxHandler.queuedEchoAjax) {
    const ajaxData = {
      action: "updateTags",
      entityType: entityType, // "part", "item", eller "task"
      entityId: entityId,
      tags: newTags,
      oldTags: oldTags
    };
    ajaxHandler.queuedEchoAjax(ajaxData);
  }
}

/**
 * Säkerställ att alla rader har tags-array (delad utility)
 * @param {Tabulator} table
 * @param {string} entityType - "part", "item" eller "task"
 */
export function ensureTagsArray(table, entityType) {
  // Säkerställ att alla rader har tags-array
  const data = table.getData();
  let dataChanged = false;

  const tagField = entityType === "part" ? "prt_tags" : 
                   entityType === "item" ? "itm_tags" : 
                   "tsk_tags";

  data.forEach(row => {
    if (!Array.isArray(row[tagField])) {
      row[tagField] = [];
      dataChanged = true;
    }
  });
}

// Exportera som default export för ES6 modules
export default TagSystemUtils;
