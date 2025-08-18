/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Overlayen tas bort manuellt vid spara/avbryt!
 */
class TagSystemUtils {
  static #initializedTables = new WeakSet();

  static attachToTable(table, project, entityType = "item", ajaxHandler) {
    const tagField = entityType === "part" ? "prt_tags" : entityType === "item" ? "itm_tags" : "tsk_tags";
    if (!table || TagSystemUtils.#initializedTables.has(table)) return;
    if (table.getColumns().some(col => col.getField() === tagField)) {
      TagSystemUtils.#initializedTables.add(table);
      return;
    }
    const tagsUtil = new TagSystemUtils(table, project, entityType, tagField, ajaxHandler);
    table.addColumn(tagsUtil.getColumnConfig());
    TagSystemUtils.#initializedTables.add(table);
    window.__tagUtils = window.__tagUtils || {};
    window.__tagUtils[table.element?.id || "table"] = tagsUtil;
  }

  constructor(table, project, entityType, tagField, ajaxHandler) {
    this.table = table;
    this.project = project;
    this.entityType = entityType;
    this.tagField = tagField;
    this.ajaxHandler = ajaxHandler;
    this.filterLogic = "AND";
    this.currentFilter = [];
    this.__lastTagsCache = null;
    this.__lastDataHash = null;
  }

  #dataHash() {
    try {
      return JSON.stringify(this.project);
    } catch {
      return Date.now() + "";
    }
  }

  invalidateTagsCache() {
    this.__lastTagsCache = null;
    this.__lastDataHash = null;
  }

  getAllTags() {
    const hash = this.#dataHash();
    if (this.__lastDataHash === hash && this.__lastTagsCache) return this.__lastTagsCache;

    const tags = new Set();
    if (!this.project) return [];
    if (this.entityType === "part") {
      this.project.prt_parts?.forEach(part => part.prt_tags?.forEach(tag => tags.add(tag)));
    } else if (this.entityType === "item") {
      this.project.prt_parts?.forEach(part => part.prt_items?.forEach(item => item.itm_tags?.forEach(tag => tags.add(tag))));
    } else if (this.entityType === "task") {
      this.project.prt_parts?.forEach(part =>
        part.prt_items?.forEach(item =>
          item.itm_tasks?.forEach(task => task.tsk_tags?.forEach(tag => tags.add(tag)))
        )
      );
    }
    this.__lastTagsCache = Array.from(tags).sort();
    this.__lastDataHash = hash;
    return this.__lastTagsCache;
  }

  findEntityById(id) {
    if (this.entityType === "part") return this.project.prt_parts?.find(p => p.prt_id === id);
    if (this.entityType === "item") {
      for (const part of this.project.prt_parts || []) {
        const found = (part.prt_items || []).find(i => i.itm_id === id);
        if (found) return found;
      }
    }
    if (this.entityType === "task") {
      for (const part of this.project.prt_parts || []) {
        for (const item of part.prt_items || []) {
          const found = (item.itm_tasks || []).find(t => t.tsk_id === id);
          if (found) return found;
        }
      }
    }
    return null;
  }

  handleTagUpdate(entityId, newTags, oldTags = []) {
    if (!this.ajaxHandler) {
      if (window?.console) console.warn("Ingen AJAX-handler kopplad för tagguppdatering.");
      return;
    }
    const entityType = this.entityType;
    try {
      this.ajaxHandler.queuedEchoAjax({
        action: "updateTags",
        entityType,
        entityId,
        tags: newTags,
        oldTags
      });
    } catch (e) {
      if (window?.console) console.error("Misslyckades med AJAX-anrop:", e);
    }
  }

  getColumnConfig() {
    return {
      title: "Taggar",
      field: this.tagField,
      formatter: cell => this.tagFormatter(cell),
      editor: (cell, onRendered, success, cancel) =>
        this.tagEditor(cell, onRendered, success, cancel),
      headerFilter: true,
      headerFilterElement: (cell, onRendered, success, cancel, editorParams) =>
        this.headerFilterElement(cell, onRendered, success, cancel, editorParams),
      headerFilterFunc: (headerValue, rowValue, rowData, filterParams) =>
        this.headerFilterFunc(headerValue, rowValue, rowData, filterParams),
      headerFilterEmptyCheck: value => !value || !Array.isArray(value) || value.length === 0
    };
  }

  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (!tags.length) return "";
    return (
      '<div class="tag-cell">' +
      tags.map(tag => `<span class="tag-badge">${tag}</span>`).join("") +
      "</div>"
    );
  }

  tagEditor(cell, onRendered, success, cancel) {
    let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()].map(t => "" + t) : [];
    const rowData = { ...cell.getRow().getData() };
    const entityId = rowData[this.entityType === "part" ? "prt_id" : this.entityType === "item" ? "itm_id" : "tsk_id"];
    const overlay = document.createElement("div");
    overlay.className = "tag-editor-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const editorBox = document.createElement("div");
    editorBox.className = "tag-editor-box";
    editorBox.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;
    overlay.appendChild(editorBox);

    const title = document.createElement("h5");
    title.className = "tag-editor-title";
    title.textContent = "Redigera taggar";
    title.style.marginTop = "0";
    editorBox.appendChild(title);

    const selectedTagsSection = document.createElement("div");
    selectedTagsSection.className = "tag-section";
    selectedTagsSection.innerHTML = "<label>Valda taggar:</label>";
    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";
    tagContainer.style.cssText = "margin: 10px 0; min-height: 40px; border: 1px solid #ddd; padding: 8px; border-radius: 4px;";
    selectedTagsSection.appendChild(tagContainer);
    editorBox.appendChild(selectedTagsSection);

    const existingTagsSection = document.createElement("div");
    existingTagsSection.className = "tag-section";
    existingTagsSection.innerHTML = "<label>Tillgängliga taggar (klicka för att lägga till):</label>";
    const existingTagsContainer = document.createElement("div");
    existingTagsContainer.className = "existing-tags-container";
    existingTagsContainer.style.cssText = "margin: 10px 0; min-height: 40px; border: 1px solid #ddd; padding: 8px; border-radius: 4px;";
    existingTagsSection.appendChild(existingTagsContainer);
    editorBox.appendChild(existingTagsSection);

    const newTagSection = document.createElement("div");
    newTagSection.className = "tag-section";
    newTagSection.innerHTML = "<label>Lägg till ny tagg:</label>";
    const input = document.createElement("input");
    input.className = "tag-input";
    input.type = "text";
    input.placeholder = "Skriv ny tagg...";
    input.style.cssText = "margin: 5px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;";
    const addButton = document.createElement("button");
    addButton.className = "btn btn-primary";
    addButton.textContent = "Lägg till";
    addButton.style.cssText = "margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;";
    newTagSection.appendChild(input);
    newTagSection.appendChild(addButton);
    editorBox.appendChild(newTagSection);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    buttonContainer.style.cssText = "margin-top: 20px; text-align: right;";
    const saveButton = document.createElement("button");
    saveButton.className = "btn btn-success";
    saveButton.textContent = "Spara";
    saveButton.style.cssText = "margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;";
    buttonContainer.appendChild(saveButton);
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "Avbryt";
    cancelButton.style.cssText = "margin: 5px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;";
    buttonContainer.appendChild(cancelButton);
    editorBox.appendChild(buttonContainer);

    const updateTagDisplay = () => {
      tagContainer.innerHTML = "";
      if (!currentTags.length) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Inga taggar tillagda";
        emptySpan.style.color = "#999";
        tagContainer.appendChild(emptySpan);
      } else {
        currentTags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item selected";
          tagEl.style.cssText = "display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 4px; cursor: pointer;";
          tagEl.title = "Klicka för att ta bort";
          tagEl.textContent = tag;
          tagEl.addEventListener("click", () => {
            currentTags = currentTags.filter(t => t !== tag);
            updateTagDisplay();
          });
          tagContainer.appendChild(tagEl);
        });
      }
      updateExistingTagsDisplay();
    };
    
    const updateExistingTagsDisplay = () => {
      const allTags = this.getAllTags();
      existingTagsContainer.innerHTML = "";
      const availableTags = allTags.filter(tag => !currentTags.includes(tag));
      if (!availableTags.length) {
        const empty = document.createElement("span");
        empty.className = "empty-state";
        empty.textContent = "Alla tillgängliga taggar är redan tillagda";
        empty.style.color = "#999";
        existingTagsContainer.appendChild(empty);
      } else {
        availableTags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item available";
          tagEl.style.cssText = "display: inline-block; background: #f8f9fa; color: #495057; border: 1px solid #dee2e6; padding: 4px 8px; margin: 2px; border-radius: 4px; cursor: pointer;";
          tagEl.textContent = tag;
          tagEl.title = "Klicka för att lägga till";
          tagEl.addEventListener("click", () => {
            currentTags.push(tag);
            updateTagDisplay();
          });
          existingTagsContainer.appendChild(tagEl);
        });
      }
    };

    function isValidTag(tag) {
      if (!tag) return false;
      if (typeof tag !== "string") tag = String(tag);
      if (!tag.trim()) return false;
      if (currentTags.includes(tag.trim())) return false;
      return true;
    }

    addButton.addEventListener("click", () => {
      let newTag = input.value.trim();
      if (isValidTag(newTag)) {
        currentTags.push(newTag);
        input.value = "";
        updateTagDisplay();
      }
      input.value = "";
      input.focus();
    });
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") addButton.click();
    });

    saveButton.addEventListener("click", () => {
      try {
        const newTags = [...currentTags];
        let entityObj = this.findEntityById(entityId);
        if (entityObj) {
          entityObj[this.tagField] = [...newTags];
        }
        this.invalidateTagsCache();
        const oldTags = Array.isArray(rowData[this.tagField]) ? [...rowData[this.tagField]] : [];
        this.handleTagUpdate(entityId, newTags, oldTags);

        document.removeEventListener("keydown", handleEscape);

        success(newTags);

        // Ta bort overlay ur DOM (eftersom Tabulator inte gör det)
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      } catch (err) {
        if (window?.console) console.error("Overlay save error:", err);
        alert("Ett fel uppstod när taggar skulle sparas. Se konsollen för detaljer.");
      }
    });

    cancelButton.addEventListener("click", () => {
      document.removeEventListener("keydown", handleEscape);
      cancel();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.removeEventListener("keydown", handleEscape);
        cancel();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handleEscape);
        cancel();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    };
    document.addEventListener("keydown", handleEscape);

    document.body.appendChild(overlay);
    updateTagDisplay();
    setTimeout(() => input.focus(), 100);

    onRendered(() => {});
    return document.createElement("div");
  }

  headerFilterElement(cell, onRendered, success, cancel, editorParams) {
    const container = document.createElement("div");
    container.className = "custom-tag-header-filter";
    container.style.cssText = "position: relative; width: 100%;";
    
    const button = document.createElement("div");
    button.className = "tag-filter-button";
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      min-height: 30px;
    `;
    container.appendChild(button);

    const selectedContainer = document.createElement("div");
    selectedContainer.className = "tag-filter-selected";
    selectedContainer.style.cssText = "flex-grow: 1; overflow: hidden;";
    button.appendChild(selectedContainer);

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = "display: flex; align-items: center; gap: 4px; margin-left: 8px;";
    button.appendChild(controlsContainer);

    const logicToggle = document.createElement("button");
    logicToggle.className = "tag-filter-logic-toggle";
    logicToggle.textContent = this.filterLogic;
    logicToggle.style.cssText = `
      padding: 2px 6px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #f8f9fa;
      font-size: 11px;
      cursor: pointer;
    `;
    controlsContainer.appendChild(logicToggle);

    const clearButton = document.createElement("button");
    clearButton.className = "tag-filter-clear";
    clearButton.innerHTML = "×";
    clearButton.title = "Rensa filter";
    clearButton.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      border-radius: 50%;
      background: #dc3545;
      color: white;
      font-size: 12px;
      cursor: pointer;
      display: none;
    `;
    controlsContainer.appendChild(clearButton);

    const dropdown = document.createElement("div");
    dropdown.className = "tag-filter-dropdown-fixed";
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
    `;
    container.appendChild(dropdown);

    let isOpen = false;
    let selectedTags = [];
    let allTags = this.getAllTags();

    const updateDisplay = () => {
      selectedContainer.innerHTML = "";
      if (!selectedTags.length) {
        const placeholder = document.createElement("span");
        placeholder.className = "tag-filter-placeholder";
        placeholder.textContent = "Filtrera taggar...";
        placeholder.style.cssText = "color: #999; font-style: italic;";
        selectedContainer.appendChild(placeholder);
        clearButton.style.display = "none";
      } else {
        selectedTags.forEach(tag => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "tag-badge";
          tagBadge.textContent = tag;
          tagBadge.style.cssText = "display: inline-block; background: #007bff; color: white; padding: 2px 6px; margin: 1px; border-radius: 3px; font-size: 11px;";
          selectedContainer.appendChild(tagBadge);
        });
        clearButton.style.display = "block";
      }
      logicToggle.textContent = this.filterLogic;
    };

    const updateDropdown = () => {
      allTags = this.getAllTags();
      dropdown.innerHTML = "";
      
      if (!allTags.length) {
        const noOptions = document.createElement("div");
        noOptions.textContent = "Inga taggar tillgängliga";
        noOptions.style.cssText = "padding: 8px; color: #999; font-style: italic;";
        dropdown.appendChild(noOptions);
        return;
      }
      
      allTags.forEach(tag => {
        const option = document.createElement("div");
        option.className = "tag-filter-option";
        option.textContent = tag;
        option.style.cssText = `
          padding: 8px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
          ${selectedTags.includes(tag) ? 'background: #007bff; color: white;' : 'background: white; color: #333;'}
        `;
        option.addEventListener("mouseenter", () => {
          if (!selectedTags.includes(tag)) {
            option.style.background = "#f8f9fa";
          }
        });
        option.addEventListener("mouseleave", () => {
          if (!selectedTags.includes(tag)) {
            option.style.background = "white";
          }
        });
        option.addEventListener("click", e => {
          e.stopPropagation();
          if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
          } else {
            selectedTags.push(tag);
          }
          updateDisplay();
          updateDropdown();
          success(selectedTags.length ? [...selectedTags] : null);
        });
        dropdown.appendChild(option);
      });
    };

    const toggleDropdown = (e) => {
      e.stopPropagation();
      isOpen = !isOpen;
      if (isOpen) {
        updateDropdown();
        dropdown.style.display = "block";
      } else {
        dropdown.style.display = "none";
      }
    };

    const closeDropdown = () => {
      isOpen = false;
      dropdown.style.display = "none";
    };

    // Event listeners
    button.addEventListener("click", (e) => {
      if (e.target === logicToggle) {
        e.stopPropagation();
        this.filterLogic = this.filterLogic === "AND" ? "OR" : "AND";
        logicToggle.textContent = this.filterLogic;
        if (selectedTags.length) {
          success([...selectedTags]);
        }
        return;
      }
      if (e.target === clearButton) {
        e.stopPropagation();
        selectedTags = [];
        updateDisplay();
        success(null);
        closeDropdown();
        return;
      }
      toggleDropdown(e);
    });

    // Stäng dropdown när man klickar utanför
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        closeDropdown();
      }
    });

    const initialValue = cell.getValue();
    if (initialValue && Array.isArray(initialValue)) {
      selectedTags = [...initialValue];
    }

    onRendered(() => {
      updateDisplay();
      // Se till att vi har färska taggar när komponenten renderas
      setTimeout(() => {
        this.invalidateTagsCache();
        allTags = this.getAllTags();
      }, 100);
    });

    return container;
  }

  headerFilterFunc(headerValue, rowValue, rowData, filterParams) {
    if (!headerValue || !Array.isArray(headerValue) || !headerValue.length) return true;
    if (!Array.isArray(rowValue) || !rowValue.length) return false;
    
    if (this.filterLogic === "AND") {
      return headerValue.every(tag => rowValue.includes(tag));
    } else {
      return headerValue.some(tag => rowValue.includes(tag));
    }
  }
}

export default TagSystemUtils;
