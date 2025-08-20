/**
 * TagSystemUtils - Slimmad version för Tabulator tagg-hantering
 * MED PLAINTEXT-STÖD för att undvika CSS/HTML injection
 */

class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND';
    this.table = null;
    this.plaintextMode = false; // Ny flagga för plaintext-läge

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
    if (options.plaintextMode !== undefined) this.plaintextMode = options.plaintextMode; // Ny option
  }

  /**
   * Hjälpfunktion för att sanitisera text till plaintext
   * @param {string} text 
   * @returns {string}
   */
  sanitizeToPlaintext(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Ta bort HTML-taggar
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Ta bort eller ersätt vanliga HTML-entiteter
    cleaned = cleaned
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Trimma och ta bort extra whitespace
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    return cleaned;
  }

  /**
   * Validera och rensa tagg-input
   * @param {string} tag 
   * @returns {string|null}
   */
  validateAndCleanTag(tag) {
    if (!tag || typeof tag !== 'string') return null;
    
    // Sanitisera till plaintext
    let cleaned = this.sanitizeToPlaintext(tag);
    
    // Kontrollera längd (t.ex. max 50 tecken)
    if (cleaned.length > 50) {
      cleaned = cleaned.substring(0, 50);
    }
    
    // Ta bort ogiltiga tecken (behåll bara alfanumeriska, mellanslag, bindestreck, understreck)
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-_åäöÅÄÖ]/g, '');
    
    // Trimma igen
    cleaned = cleaned.trim();
    
    // Returnera null om tom efter rensning
    return cleaned.length > 0 ? cleaned : null;
  }

  /**
   * Formatter: visas som badges (med plaintext-skydd)
   */
  tagFormatter(cell) {
    const tags = cell.getValue() || [];
    if (tags.length === 0) return "";
    
    // Sanitisera alla taggar innan visning
    const safeTags = tags.map(tag => {
      const cleanTag = this.sanitizeToPlaintext(tag);
      // Escape för HTML-attribut också
      return cleanTag.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    });
    
    return (
      '<div class="tag-cell">' +
      safeTags.map((tag) => `<span class="tag-badge">${tag}</span>`).join("") +
      "</div>"
    );
  }

  /**
   * Förbättrad tagg-editor med plaintext-stöd
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
    
    // Plaintext-mode varning
    if (this.plaintextMode) {
      const warning = document.createElement("div");
      warning.className = "plaintext-warning";
      warning.style.cssText = "background:#fff3cd;border:1px solid #ffeaa7;color:#856404;padding:8px;border-radius:4px;margin-bottom:10px;font-size:12px;";
      warning.textContent = "⚠️ Endast plaintext tillåtet - HTML och styling tas automatiskt bort";
      editorBox.appendChild(warning);
    }
    
    let currentTags = Array.isArray(cell.getValue()) ? 
      [...cell.getValue()].map(tag => this.sanitizeToPlaintext(tag)).filter(Boolean) : [];
    
    const existingTags = this.getExistingTagsForEntityType(entityType, project)
      .map(tag => this.sanitizeToPlaintext(tag)).filter(Boolean);
    
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
    input.placeholder = "Skriv ny tagg (endast plaintext)...";
    
    // Sätt contenteditable plaintext-only om stöds
    if (this.plaintextMode && input.style.contentEditable !== undefined) {
      input.style.contentEditable = 'plaintext-only';
    }
    
    inputContainer.appendChild(input);
    
    // Validering i realtid
    const validationMsg = document.createElement("div");
    validationMsg.className = "validation-message";
    validationMsg.style.cssText = "font-size:11px;color:#dc3545;margin-top:2px;min-height:14px;";
    inputContainer.appendChild(validationMsg);
    
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
    
    // Validera input i realtid
    const validateInput = () => {
      const rawValue = input.value;
      const cleanValue = this.validateAndCleanTag(rawValue);
      
      validationMsg.textContent = "";
      addButton.disabled = false;
      
      if (rawValue && !cleanValue) {
        validationMsg.textContent = "Ogiltig tagg - endast alfanumeriska tecken, mellanslag och bindestreck tillåtna";
        addButton.disabled = true;
      } else if (cleanValue && cleanValue !== rawValue) {
        validationMsg.textContent = `Rensas till: "${cleanValue}"`;
        validationMsg.style.color = "#856404";
      } else if (cleanValue && currentTags.includes(cleanValue)) {
        validationMsg.textContent = "Taggen finns redan";
        addButton.disabled = true;
      }
    };
    
    input.addEventListener('input', validateInput);
    input.addEventListener('paste', (e) => {
      // Hantera paste-event för att rensa innehåll
      setTimeout(() => {
        const cleaned = this.sanitizeToPlaintext(input.value);
        if (cleaned !== input.value) {
          input.value = cleaned;
          validateInput();
        }
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
          tagText.textContent = tag; // Redan sanitiserad
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
          tagEl.textContent = tag; // Redan sanitiserad
          tagEl.title = "Klicka för att lägga till";
          tagEl.addEventListener("click", () => addTag(tag));
          existingTagsContainer.appendChild(tagEl);
        });
      }
    };
    
    // Funktion för att lägga till tagg (med validering)
    const addTag = (tag) => {
      const cleanTag = this.validateAndCleanTag(tag);
      if (cleanTag && !currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        updateTagDisplay();
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
    
    // Event listeners
    addButton.addEventListener("click", () => {
      const cleanTag = this.validateAndCleanTag(input.value);
      if (cleanTag) {
        addTag(cleanTag);
        input.value = "";
        validationMsg.textContent = "";
        input.focus();
      }
    });
    
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const cleanTag = this.validateAndCleanTag(input.value);
        if (cleanTag) {
          addTag(cleanTag);
          input.value = "";
          validationMsg.textContent = "";
        }
      }
    });
    
    saveButton.addEventListener("click", () => {
      // Säkerställ att alla taggar är rena innan sparning
      const finalTags = currentTags.map(tag => this.validateAndCleanTag(tag)).filter(Boolean);
      
      success(finalTags);
      const rowData = cell.getRow().getData();
      const oldTags = Array.isArray(rowData[tagField]) ? [...rowData[tagField]] : [];
      rowData[tagField] = finalTags;
      cell.getRow().update(rowData);
      
      // AJAX-hantering för att uppdatera backend
      if (handleTagUpdate && findPartById && findItemById && findTaskById) {
        let entityId, entityTypeStr;
        
        if (entityType === "part") {
          entityId = rowData.prt_id;
          entityTypeStr = "part";
          const part = findPartById(project, entityId);
          if (part) {
            part.prt_tags = finalTags || [];
          }
        } else if (entityType === "item") {
          entityId = rowData.itm_id;
          entityTypeStr = "item";
          const item = findItemById(project, entityId);
          if (item) {
            item.itm_tags = finalTags || [];
          }
        } else if (entityType === "task") {
          entityId = rowData.tsk_id;
          entityTypeStr = "task";
          const task = findTaskById(project, entityId);
          if (task) {
            task.tsk_tags = finalTags || [];
          }
        }
        
        handleTagUpdate(entityTypeStr, entityId, finalTags || [], oldTags);
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

  // Aktivera/inaktivera plaintext-läge
  setPlaintextMode(enabled) {
    this.plaintextMode = enabled;
  }

  getPlaintextMode() {
    return this.plaintextMode;
  }

  // Resten av din befintliga kod...
  customTagHeaderFilter(headerValue, rowValue, rowData, filterParams) {
    if (!headerValue || !Array.isArray(headerValue) || headerValue.length === 0) return true;
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false;

    if (this.filterLogic === 'AND') {
      return headerValue.every((selectedTag) => rowValue.includes(selectedTag));
    } else {
      return headerValue.some((selectedTag) => rowValue.includes(selectedTag));
    }
  }

  customTagHeaderFilterElement(cell, onRendered, success, cancel, editorParams) {
    // Din befintliga kod här...
    // (kopierar inte hela funktionen för att spara plats)
  }

  getAllUniqueTags(data) {
    const tags = new Set();
    data.forEach((row) => {
      if (Array.isArray(row.tags)) {
        row.tags.forEach((tag) => {
          const cleanTag = this.sanitizeToPlaintext(tag);
          if (cleanTag) tags.add(cleanTag);
        });
      }
    });
    return Array.from(tags).sort();
  }

  tagEditor(cell, onRendered, success, cancel) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = (cell.getValue() || []).join(", ");
    
    input.addEventListener("blur", () => {
      const rawTags = input.value.split(",").map(s => s.trim()).filter(Boolean);
      const cleanTags = rawTags.map(tag => this.validateAndCleanTag(tag)).filter(Boolean);
      success(cleanTags);
    });
    
    onRendered(() => input.focus());
    return input;
  }

  // Resten av dina befintliga metoder...
  ensureTagsArray(table, entityType) { /* din befintliga kod */ }
  getExistingPartTags(project) { /* din befintliga kod */ }
  getExistingItemTags(project) { /* din befintliga kod */ }
  getExistingTaskTags(project) { /* din befintliga kod */ }
  getExistingTagsForEntityType(entityType, project) { /* din befintliga kod */ }
  
  setFilterLogic(logic) { this.filterLogic = logic; }
  getFilterLogic() { return this.filterLogic; }
  getCurrentFilter() { return [...this.currentFilter]; }

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
