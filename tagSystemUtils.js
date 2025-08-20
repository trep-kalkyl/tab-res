/**
 * TagSystemUtils - Slimmad version för Tabulator tagg-hantering
 * MED FÖRBÄTTRAT XSS-SKYDD
 */

class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND';
    this.table = null;
    this.plaintextMode = false;

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
    if (options.debugMode !== undefined) this.debugMode = options.debugMode;
    if (options.plaintextMode !== undefined) this.plaintextMode = options.plaintextMode;
  }

  /**
   * FÖRBÄTTRAD XSS-säker sanitering för taggar
   */
  sanitizeTag(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/javascript:/gi, "")  // Ta bort javascript: protokoll
      .replace(/data:/gi, "")        // Ta bort data: protokoll
      .replace(/vbscript:/gi, "")    // Ta bort vbscript: (IE)
      .replace(/on\w+=/gi, "")       // Ta bort onevent-attribut
      .trim();
  }

  /**
   * Bakåtkompatibilitet - använder den säkra sanitize-funktionen
   */
  cleanPlaintext(text) {
    return this.sanitizeTag(text);
  }

  /**
   * Formatter: visas som badges (med XSS-skydd)
   */
  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (tags.length === 0) return "";
    
    return (
      '<div class="tag-cell">' +
      tags.map((tag) => `<span class="tag-badge">${this.sanitizeTag(tag)}</span>`).join("") +
      "</div>"
    );
  }

  /**
   * Editor: enkel med XSS-skydd
   */
  tagEditor(cell, onRendered, success, cancel) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 100; // Begränsa längd för säkerhet
    input.value = (cell.getValue() || []).join(", ");
    
    input.addEventListener("blur", () => {
      const rawTags = input.value.split(",").map(s => s.trim()).filter(Boolean);
      const cleanTags = rawTags.map(tag => this.sanitizeTag(tag)).filter(Boolean);
      success(cleanTags);
    });
    
    // Extra säkerhet - förhindra paste av skadlig kod
    input.addEventListener("paste", (e) => {
      setTimeout(() => {
        input.value = this.sanitizeTag(input.value);
      }, 0);
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
        row.tags.forEach((tag) => {
          const cleanTag = this.sanitizeTag(tag);
          if (cleanTag) tags.add(cleanTag);
        });
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
        // Använd textContent för säkerhet
        selectedContainer.textContent = "Filtrera taggar...";
        clearButton.style.display = "none";
        logicToggle.style.display = "block";
      } else {
        selectedTags.forEach(tag => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "tag-badge";
          // Använd textContent istället för innerHTML
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
        // Använd textContent för säkerhet
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
      // Sanitera taggen innan den används
      const cleanTag = this.sanitizeTag(tag);
      if (!cleanTag) return;
      
      const idx = selectedTags.indexOf(cleanTag);
      if (idx > -1) {
        selectedTags.splice(idx, 1);
      } else {
        selectedTags.push(cleanTag);
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
      selectedTags = initialValue.map(tag => this.sanitizeTag(tag)).filter(Boolean);
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

  // ======= FLYTTADE FUNKTIONER FRÅN MAIN.JS =======

  /**
   * Säkerställ att alla rader har tags-array
   */
  ensureTagsArray(table, entityType) {
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

  /**
   * Hämta befintliga taggar för parts (med XSS-skydd)
   */
  getExistingPartTags(project) {
    const partTags = new Set();
    
    project.prt_parts?.forEach(part => {
      if (Array.isArray(part.prt_tags)) {
        part.prt_tags.forEach(tag => {
          const cleanTag = this.sanitizeTag(tag);
          if (cleanTag) partTags.add(cleanTag);
        });
      }
    });
    
    return Array.from(partTags).sort();
  }

  /**
   * Hämta befintliga taggar för items (med XSS-skydd)
   */
  getExistingItemTags(project) {
    const itemTags = new Set();
    
    project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        if (Array.isArray(item.itm_tags)) {
          item.itm_tags.forEach(tag => {
            const cleanTag = this.sanitizeTag(tag);
            if (cleanTag) itemTags.add(cleanTag);
          });
        }
      });
    });
    
    return Array.from(itemTags).sort();
  }

  /**
   * Hämta befintliga taggar för tasks (med XSS-skydd)
   */
  getExistingTaskTags(project) {
    const taskTags = new Set();
    
    project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        item.itm_tasks?.forEach(task => {
          if (Array.isArray(task.tsk_tags)) {
            task.tsk_tags.forEach(tag => {
              const cleanTag = this.sanitizeTag(tag);
              if (cleanTag) taskTags.add(cleanTag);
            });
          }
        });
      });
    });
    
    return Array.from(taskTags).sort();
  }

  /**
   * Hjälpfunktion för att få rätt tagg-funktion baserat på entitetstyp
   */
  getExistingTagsForEntityType(entityType, project) {
    switch(entityType) {
      case 'part': return this.getExistingPartTags(project);
      case 'item': return this.getExistingItemTags(project);
      case 'task': return this.getExistingTaskTags(project);
      default: return [];
    }
  }

  /**
   * Förbättrad tagg-editor med XSS-skydd (flyttad från main.js)
   */
  createTagEditor(cell, onRendered, success, cancel, tagField, entityType, project, handleTagUpdate, findPartById, findItemById, findTaskById) {
    // Skapa overlay
    const overlay = document.createElement("div");
    overlay.className = "tag-editor-overlay";
    
    // Skapa editor-box
    const editorBox = document.createElement("div");
    editorBox.className = "tag-editor-box";
    
    // Titel
    const title = document.createElement("h5");
    title.className = "tag-editor-title";
    title.textContent = "Redigera taggar";
    editorBox.appendChild(title);
    
    // Sanitera befintliga taggar
    let currentTags = Array.isArray(cell.getValue()) ? 
      cell.getValue().map(tag => this.sanitizeTag(tag)).filter(Boolean) : [];
    const existingTags = this.getExistingTagsForEntityType(entityType, project);
    
    // Sektion för valda taggar
    const selectedTagsSection = document.createElement("div");
    selectedTagsSection.className = "tag-section";
    
    const selectedLabel = document.createElement("label");
    selectedLabel.className = "tag-section-label";
    selectedLabel.textContent = "Valda taggar:";
    selectedTagsSection.appendChild(selectedLabel);
    
    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";
    selectedTagsSection.appendChild(tagContainer);
    
    editorBox.appendChild(selectedTagsSection);
    
    // Sektion för befintliga taggar
    const existingTagsSection = document.createElement("div");
    existingTagsSection.className = "tag-section";
    
    const existingLabel = document.createElement("label");
    existingLabel.className = "tag-section-label";
    existingLabel.textContent = "Tillgängliga taggar (klicka för att lägga till):";
    existingTagsSection.appendChild(existingLabel);
    
    const existingTagsContainer = document.createElement("div");
    existingTagsContainer.className = "existing-tags-container";
    existingTagsSection.appendChild(existingTagsContainer);
    
    editorBox.appendChild(existingTagsSection);
    
    // Sektion för nya taggar
    const newTagSection = document.createElement("div");
    newTagSection.className = "tag-section";
    
    const newLabel = document.createElement("label");
    newLabel.className = "tag-section-label";
    newLabel.textContent = "Lägg till ny tagg:";
    newTagSection.appendChild(newLabel);
    
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    
    const input = document.createElement("input");
    input.className = "tag-input";
    input.type = "text";
    input.maxLength = 50; // Begränsa längd för säkerhet
    input.placeholder = "Skriv ny tagg...";
    inputContainer.appendChild(input);
    
    const addButton = document.createElement("button");
    addButton.className = "btn btn-primary";
    addButton.textContent = "Lägg till";
    inputContainer.appendChild(addButton);
    
    newTagSection.appendChild(inputContainer);
    editorBox.appendChild(newTagSection);
    
    // Knappar
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    
    const saveButton = document.createElement("button");
    saveButton.className = "btn btn-success";
    saveButton.textContent = "Spara";
    buttonContainer.appendChild(saveButton);
    
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "Avbryt";
    buttonContainer.appendChild(cancelButton);
    
    editorBox.appendChild(buttonContainer);
    
    // Funktion för att lägga till tagg MED XSS-SKYDD
    const addTag = (tag) => {
      const cleanTag = this.sanitizeTag(tag);
      if (cleanTag && cleanTag.length > 0 && !currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        updateTagDisplay();
      }
    };
    
    // Event listeners MED XSS-SKYDD
    addButton.addEventListener("click", () => {
      const cleanTag = this.sanitizeTag(input.value);
      if (cleanTag) {
        addTag(cleanTag);
        input.value = "";
        input.focus();
      }
    });
    
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const cleanTag = this.sanitizeTag(input.value);
        if (cleanTag) {
          addTag(cleanTag);
          input.value = "";
        }
      }
    });
    
    // Extra XSS-skydd för input
    input.addEventListener("input", (e) => {
      // Real-time sanitering medan användaren skriver
      const cleanValue = this.sanitizeTag(e.target.value);
      if (e.target.value !== cleanValue) {
        e.target.value = cleanValue;
      }
    });
    
    input.addEventListener("paste", (e) => {
      setTimeout(() => {
        input.value = this.sanitizeTag(input.value);
      }, 0);
    });
    
    // Funktion för att uppdatera visning av valda taggar
    const updateTagDisplay = () => {
      tagContainer.innerHTML = "";
      if (currentTags.length === 0) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Inga taggar tillagda";
        tagContainer.appendChild(emptySpan);
      } else {
        currentTags.forEach((tag) => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item selected";
          tagEl.title = "Klicka för att ta bort";
          
          const tagText = document.createElement("span");
          // Använd textContent för säkerhet
          tagText.textContent = tag;
          tagEl.appendChild(tagText);
          
          const removeBtn = document.createElement("span");
          removeBtn.className = "remove-btn";
          removeBtn.textContent = "×";
          tagEl.appendChild(removeBtn);
          
          tagEl.addEventListener("click", () => removeTag(tag));
          tagContainer.appendChild(tagEl);
        });
      }
      updateExistingTagsDisplay();
    };
    
    // Funktion för att uppdatera visning av tillgängliga taggar
    const updateExistingTagsDisplay = () => {
      existingTagsContainer.innerHTML = "";
      const availableNow = existingTags.filter(tag => !currentTags.includes(tag));
      
      if (availableNow.length === 0) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Alla tillgängliga taggar är redan tillagda";
        existingTagsContainer.appendChild(emptySpan);
      } else {
        availableNow.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item available";
          // Använd textContent för säkerhet
          tagEl.textContent = tag;
          tagEl.title = "Klicka för att lägga till";
          tagEl.addEventListener("click", () => addTag(tag));
          existingTagsContainer.appendChild(tagEl);
        });
      }
    };
    
    // Funktion för att ta bort tagg
    const removeTag = (tag) => {
      const index = currentTags.indexOf(tag);
      if (index > -1) {
        currentTags.splice(index, 1);
        updateTagDisplay();
      }
    };
    
    saveButton.addEventListener("click", () => {
      // Säkerställ att alla taggar är saniterade innan sparande
      const sanitizedTags = currentTags.map(tag => this.sanitizeTag(tag)).filter(Boolean);
      
      success(sanitizedTags);
      const rowData = cell.getRow().getData();
      const oldTags = Array.isArray(rowData[tagField]) ? [...rowData[tagField]] : [];
      rowData[tagField] = sanitizedTags;
      cell.getRow().update(rowData);
      
      // AJAX-hantering för att uppdatera backend
      if (handleTagUpdate && findPartById && findItemById && findTaskById) {
        let entityId, entityTypeStr;
        
        if (entityType === "part") {
          entityId = rowData.prt_id;
          entityTypeStr = "part";
          // Uppdatera part i project data
          const part = findPartById(project, entityId);
          if (part) {
            part.prt_tags = sanitizedTags || [];
          }
        } else if (entityType === "item") {
          entityId = rowData.itm_id;
          entityTypeStr = "item";
          // Uppdatera item i project data
          const item = findItemById(project, entityId);
          if (item) {
            item.itm_tags = sanitizedTags || [];
          }
        } else if (entityType === "task") {
          entityId = rowData.tsk_id;
          entityTypeStr = "task";
          // Uppdatera task i project data
          const task = findTaskById(project, entityId);
          if (task) {
            task.tsk_tags = sanitizedTags || [];
          }
        }
        
        // Skicka AJAX-anrop för tagguppdatering MED SANITERADE TAGGAR
        handleTagUpdate(entityTypeStr, entityId, sanitizedTags || [], oldTags);
      }
      
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleEscape);
    });
    
    cancelButton.addEventListener("click", () => {
      cancel();
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleEscape);
    });
    
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cancel();
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleEscape);
      }
    });
    
    // Escape-tangent support
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        cancel();
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
    
    overlay.appendChild(editorBox);
    document.body.appendChild(overlay);
    
    // Initiera visningar
    updateTagDisplay();
    
    // Fokusera på input
    setTimeout(() => input.focus(), 100);
    
    onRendered(() => {});
    
    return document.createElement("div");
  }

  // Aktivera/inaktivera plaintext-läge (enkel version)
  setPlaintextMode(enabled) {
    this.plaintextMode = enabled;
  }

  getPlaintextMode() {
    return this.plaintextMode;
  }
}

// Endast nödvändiga exports
export default TagSystemUtils;
