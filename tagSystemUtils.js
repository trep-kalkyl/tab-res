/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Kapslar nu in all logik: overlay-editor, filter, AJAX, datahelpers, och integration!
 */
class TagSystemUtils {
  // Koppla på tag-hantering på en Tabulator-tabell
  static attachToTable(table, project, entityType = "item", ajaxHandler) {
    // Bestäm taggfält
    const tagField = entityType === "part" ? "prt_tags" : entityType === "item" ? "itm_tags" : "tsk_tags";
    // Lägg till kolumn om saknas
    if (!table.getColumns().some(col => col.getField() === tagField)) {
      const tagsUtil = new TagSystemUtils(table, project, entityType, tagField, ajaxHandler);
      table.addColumn(tagsUtil.getColumnConfig());
      // Spara för ev. extern åtkomst/debug
      window.__tagUtils = window.__tagUtils || {};
      window.__tagUtils[table.element?.id || "table"] = tagsUtil;
    }
  }

  constructor(table, project, entityType, tagField, ajaxHandler) {
    this.table = table;
    this.project = project;
    this.entityType = entityType;
    this.tagField = tagField;
    this.ajaxHandler = ajaxHandler;
    this.filterLogic = "AND"; // default
    this.currentFilter = [];
  }

  // ======= DATA AKTIVITETER =======
  getAllTags() {
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
    return Array.from(tags).sort();
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

  // ======= AJAX =======
  handleTagUpdate(entityId, newTags, oldTags = []) {
    if (!this.ajaxHandler) return;
    const entityType = this.entityType;
    this.ajaxHandler.queuedEchoAjax({
      action: "updateTags",
      entityType,
      entityId,
      tags: newTags,
      oldTags
    });
  }

  // ======= KOLUMNKONFIG =======
  getColumnConfig() {
    return {
      title: "Taggar",
      field: this.tagField,
      formatter: cell => this.tagFormatter(cell),
      editor: (cell, onRendered, success, cancel) =>
        this.tagEditor(cell, onRendered, success, cancel),
      headerFilter: (cell, onRendered, success, cancel, editorParams) =>
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

  // ======= TAGG-EDITOR (Overlay) =======
  tagEditor(cell, onRendered, success, cancel) {
    // Overlay UI...
    const overlay = document.createElement("div");
    overlay.className = "tag-editor-overlay";
    const editorBox = document.createElement("div");
    editorBox.className = "tag-editor-box";
    overlay.appendChild(editorBox);

    // Titel
    const title = document.createElement("h5");
    title.className = "tag-editor-title";
    title.textContent = "Redigera taggar";
    editorBox.appendChild(title);

    let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()] : [];
    const allTags = this.getAllTags();

    // Valda taggar
    const selectedTagsSection = document.createElement("div");
    selectedTagsSection.className = "tag-section";
    selectedTagsSection.innerHTML = "<label>Valda taggar:</label>";
    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";
    selectedTagsSection.appendChild(tagContainer);
    editorBox.appendChild(selectedTagsSection);

    // Tillgängliga taggar
    const existingTagsSection = document.createElement("div");
    existingTagsSection.className = "tag-section";
    existingTagsSection.innerHTML = "<label>Tillgängliga taggar (klicka för att lägga till):</label>";
    const existingTagsContainer = document.createElement("div");
    existingTagsContainer.className = "existing-tags-container";
    existingTagsSection.appendChild(existingTagsContainer);
    editorBox.appendChild(existingTagsSection);

    // Ny tagg
    const newTagSection = document.createElement("div");
    newTagSection.className = "tag-section";
    newTagSection.innerHTML = "<label>Lägg till ny tagg:</label>";
    const input = document.createElement("input");
    input.className = "tag-input";
    input.type = "text";
    input.placeholder = "Skriv ny tagg...";
    const addButton = document.createElement("button");
    addButton.className = "btn btn-primary";
    addButton.textContent = "Lägg till";
    newTagSection.appendChild(input);
    newTagSection.appendChild(addButton);
    editorBox.appendChild(newTagSection);

    // Spara/Avbryt
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

    // Helper-funktioner
    const updateTagDisplay = () => {
      tagContainer.innerHTML = "";
      if (!currentTags.length) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Inga taggar tillagda";
        tagContainer.appendChild(emptySpan);
      } else {
        currentTags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item selected";
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
      existingTagsContainer.innerHTML = "";
      const availableTags = allTags.filter(tag => !currentTags.includes(tag));
      if (!availableTags.length) {
        const empty = document.createElement("span");
        empty.className = "empty-state";
        empty.textContent = "Alla tillgängliga taggar är redan tillagda";
        existingTagsContainer.appendChild(empty);
      } else {
        availableTags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item available";
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

    // Event listeners
    addButton.addEventListener("click", () => {
      const newTag = input.value.trim();
      if (newTag && !currentTags.includes(newTag)) {
        currentTags.push(newTag);
        input.value = "";
        updateTagDisplay();
      }
    });
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") addButton.click();
    });
    saveButton.addEventListener("click", () => {
      // Uppdatera entitet och AJAX
      const rowData = cell.getRow().getData();
      const entityId = rowData[this.entityType === "part" ? "prt_id" : this.entityType === "item" ? "itm_id" : "tsk_id"];
      const oldTags = Array.isArray(rowData[this.tagField]) ? [...rowData[this.tagField]] : [];
      rowData[this.tagField] = currentTags;
      cell.getRow().update(rowData);
      this.handleTagUpdate(entityId, currentTags, oldTags);
      success(currentTags);
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
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        cancel();
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    document.body.appendChild(overlay);
    updateTagDisplay();
    setTimeout(() => input.focus(), 100);

    onRendered(() => {});
    return document.createElement("div");
  }

  // ======= FILTER =======
  headerFilterElement(cell, onRendered, success, cancel, editorParams) {
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
    logicToggle.textContent = this.filterLogic;
    button.appendChild(logicToggle);

    const clearButton = document.createElement("button");
    clearButton.className = "tag-filter-clear";
    clearButton.innerHTML = "×";
    clearButton.title = "Rensa filter";
    button.appendChild(clearButton);

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "tag-filter-dropdown-fixed";
    dropdown.style.display = "none";
    let isOpen = false;
    let selectedTags = [];
    let allTags = this.getAllTags();

    const updateDisplay = () => {
      selectedContainer.innerHTML = "";
      if (!selectedTags.length) {
        const placeholder = document.createElement("span");
        placeholder.className = "tag-filter-placeholder";
        placeholder.textContent = "Filtrera taggar...";
        selectedContainer.appendChild(placeholder);
        clearButton.style.display = "none";
      } else {
        selectedTags.forEach(tag => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "tag-badge";
          tagBadge.textContent = tag;
          selectedContainer.appendChild(tagBadge);
        });
        clearButton.style.display = "block";
      }
      logicToggle.textContent = this.filterLogic;
    };
    const updateDropdown = () => {
      dropdown.innerHTML = "";
      allTags.forEach(tag => {
        const option = document.createElement("div");
        option.className = "tag-filter-option";
        option.textContent = tag;
        if (selectedTags.includes(tag)) option.classList.add("selected");
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
    const toggleDropdown = () => {
      isOpen = !isOpen;
      if (isOpen) {
        allTags = this.getAllTags();
        updateDropdown();
        dropdown.style.display = "block";
        button.appendChild(dropdown);
      } else {
        dropdown.style.display = "none";
      }
    };

    button.addEventListener("click", (e) => {
      if (e.target === logicToggle) {
        e.stopPropagation();
        this.filterLogic = this.filterLogic === "AND" ? "OR" : "AND";
        logicToggle.textContent = this.filterLogic;
        success(selectedTags.length ? [...selectedTags] : null);
        return;
      }
      if (e.target === clearButton) {
        e.stopPropagation();
        selectedTags = [];
        updateDisplay();
        success(null);
        return;
      }
      toggleDropdown();
    });

    // Init value
    const initialValue = cell.getValue();
    if (initialValue && Array.isArray(initialValue)) selectedTags = [...initialValue];

    onRendered(() => updateDisplay());
    return container;
  }

  headerFilterFunc(headerValue, rowValue, rowData, filterParams) {
    if (!headerValue || !Array.isArray(headerValue) || !headerValue.length) return true;
    if (!Array.isArray(rowValue) || !rowValue.length) return false;
    if (this.filterLogic === "AND")
      return headerValue.every(tag => rowValue.includes(tag));
    else
      return headerValue.some(tag => rowValue.includes(tag));
  }
}

export default TagSystemUtils;
