/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Stöder AND/OR-logik, debug-läge, konfigurerbar UI och AJAX-integrering
 * Optimerad för att hantera flera tabeller och entiteter samtidigt
 */

class TagSystemUtils {
  constructor() {
    this.debugMode = false;
    this.currentFilter = [];
    this.filterLogic = 'AND'; // 'AND' eller 'OR'
    this.tables = new Map(); // Stöd för flera tabeller
    this.ajaxCallback = null; // För AJAX-hantering
    this.project = null;
    this.helpers = null; // Hjälpfunktioner från main.js
    
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
   * Initialiserar tag-systemet med Tabulator-instanser
   * @param {Tabulator} partTable - Part-tabellen
   * @param {Tabulator} itemTable - Item-tabellen  
   * @param {Object} project - Projektdata
   * @param {Object} ajaxHandler - AJAX-hanterare
   * @param {Object} helpers - Hjälpfunktioner från main.js
   */
  init(partTable, itemTable, project, ajaxHandler, helpers) {
    this.tables.set('part', partTable);
    this.tables.set('item', itemTable);
    this.project = project;
    this.ajaxCallback = ajaxHandler;
    this.helpers = helpers;

    // Lägg till taggar till tabeller
    this.addTagsToTable(partTable, "part", project);
    this.addTagsToTable(itemTable, "item", project);

    // Setup event listeners för dataFiltered
    [partTable, itemTable].forEach(table => {
      table.on("dataFiltered", (filters, rows) => {
        if (this.debugMode) {
          this.updateDebugInfo(this.currentFilter);
        }
      });
    });
  }

  /**
   * AJAX-hantering för tagguppdateringar
   */
  handleTagUpdate(entityType, entityId, newTags, oldTags = []) {
    const ajaxData = {
      action: "updateTags",
      entityType: entityType, // "part", "item", eller "task"
      entityId: entityId,
      tags: newTags,
      oldTags: oldTags
    };
    
    if (this.ajaxCallback && this.ajaxCallback.queuedEchoAjax) {
      this.ajaxCallback.queuedEchoAjax(ajaxData);
    }
  }

  /**
   * Hämta befintliga taggar för en specifik entitetstyp
   */
  getExistingTagsForEntityType(entityType) {
    switch(entityType) {
      case 'part': return this.getExistingPartTags();
      case 'item': return this.getExistingItemTags();
      case 'task': return this.getExistingTaskTags();
      default: return [];
    }
  }

  /**
   * Hämta alla part-taggar
   */
  getExistingPartTags() {
    const partTags = new Set();
    
    this.project.prt_parts?.forEach(part => {
      if (Array.isArray(part.prt_tags)) {
        part.prt_tags.forEach(tag => partTags.add(tag));
      }
    });
    
    return Array.from(partTags).sort();
  }

  /**
   * Hämta alla item-taggar
   */
  getExistingItemTags() {
    const itemTags = new Set();
    
    this.project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        if (Array.isArray(item.itm_tags)) {
          item.itm_tags.forEach(tag => itemTags.add(tag));
        }
      });
    });
    
    return Array.from(itemTags).sort();
  }

  /**
   * Hämta alla task-taggar
   */
  getExistingTaskTags() {
    const taskTags = new Set();
    
    this.project.prt_parts?.forEach(part => {
      part.prt_items?.forEach(item => {
        item.itm_tasks?.forEach(task => {
          if (Array.isArray(task.tsk_tags)) {
            task.tsk_tags.forEach(tag => taskTags.add(tag));
          }
        });
      });
    });
    
    return Array.from(taskTags).sort();
  }

  /**
   * Hämta alla unika taggar från tabelldata
   */
  getAllUniqueTags(data) {
    const tags = new Set();
    
    data.forEach(row => {
      // Försök hitta taggar i olika fält
      const tagFields = ['prt_tags', 'itm_tags', 'tsk_tags', 'tags'];
      
      for (const field of tagFields) {
        if (Array.isArray(row[field])) {
          row[field].forEach(tag => tags.add(tag));
          break; // Använd första hittade taggar-fältet
        }
      }
    });
    
    return Array.from(tags).sort();
  }

  /**
   * Uppdatera debug-information
   */
  updateDebugInfo(selectedTags, table = null) {
    if (!this.debugMode) return;
    
    let debugInfo = document.getElementById('debug-info-tag-system');
    if (!debugInfo) {
      debugInfo = document.createElement('div');
      debugInfo.id = 'debug-info-tag-system';
      debugInfo.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:10px;border-radius:5px;font-family:monospace;font-size:12px;z-index:10000;max-width:300px;';
      document.body.appendChild(debugInfo);
    }
    
    const targetTable = table || this.tables.values().next().value;
    const filteredRows = targetTable ? targetTable.getRows("active") : [];
    
    debugInfo.innerHTML = `
      <strong>Tag System Debug</strong><br>
      Logic: ${this.filterLogic}<br>
      Selected: [${selectedTags.join(', ')}]<br>
      Visible rows: ${filteredRows.length}<br>
      <button onclick="window.__tagUtils?.toggleDebug?.()">Close Debug</button>
    `;
  }

  /**
   * Förbättrad tagg-editor som används av alla entitetstyper
   */
  createTagEditor(cell, onRendered, success, cancel, tagField, entityType) {
    // Skapa overlay
    const overlay = document.createElement("div");
    overlay.className = "tag-editor-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    // Skapa editor-box
    const editorBox = document.createElement("div");
    editorBox.className = "tag-editor-box";
    editorBox.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Titel
    const title = document.createElement("h5");
    title.className = "tag-editor-title";
    title.textContent = "Redigera taggar";
    title.style.cssText = "margin-bottom: 15px; color: #333;";
    editorBox.appendChild(title);
    
    let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()] : [];
    const existingTags = this.getExistingTagsForEntityType(entityType);
    
    // Sektion för valda taggar
    const selectedTagsSection = document.createElement("div");
    selectedTagsSection.className = "tag-section";
    selectedTagsSection.style.marginBottom = "15px";
    
    const selectedLabel = document.createElement("label");
    selectedLabel.className = "tag-section-label";
    selectedLabel.textContent = "Valda taggar:";
    selectedLabel.style.cssText = "display: block; font-weight: bold; margin-bottom: 5px;";
    selectedTagsSection.appendChild(selectedLabel);
    
    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";
    tagContainer.style.cssText = "min-height: 40px; border: 1px solid #ddd; border-radius: 4px; padding: 8px; background: #f9f9f9;";
    selectedTagsSection.appendChild(tagContainer);
    
    editorBox.appendChild(selectedTagsSection);
    
    // Sektion för befintliga taggar
    const existingTagsSection = document.createElement("div");
    existingTagsSection.className = "tag-section";
    existingTagsSection.style.marginBottom = "15px";
    
    const existingLabel = document.createElement("label");
    existingLabel.className = "tag-section-label";
    existingLabel.textContent = "Tillgängliga taggar (klicka för att lägga till):";
    existingLabel.style.cssText = "display: block; font-weight: bold; margin-bottom: 5px;";
    existingTagsSection.appendChild(existingLabel);
    
    const existingTagsContainer = document.createElement("div");
    existingTagsContainer.className = "existing-tags-container";
    existingTagsContainer.style.cssText = "max-height: 120px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px; background: #f9f9f9;";
    existingTagsSection.appendChild(existingTagsContainer);
    
    editorBox.appendChild(existingTagsSection);
    
    // Sektion för nya taggar
    const newTagSection = document.createElement("div");
    newTagSection.className = "tag-section";
    newTagSection.style.marginBottom = "20px";
    
    const newLabel = document.createElement("label");
    newLabel.className = "tag-section-label";
    newLabel.textContent = "Lägg till ny tagg:";
    newLabel.style.cssText = "display: block; font-weight: bold; margin-bottom: 5px;";
    newTagSection.appendChild(newLabel);
    
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.style.cssText = "display: flex; gap: 5px;";
    
    const input = document.createElement("input");
    input.className = "tag-input";
    input.type = "text";
    input.placeholder = "Skriv ny tagg...";
    input.style.cssText = "flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;";
    inputContainer.appendChild(input);
    
    const addButton = document.createElement("button");
    addButton.className = "btn btn-primary";
    addButton.textContent = "Lägg till";
    addButton.style.cssText = "padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;";
    inputContainer.appendChild(addButton);
    
    newTagSection.appendChild(inputContainer);
    editorBox.appendChild(newTagSection);
    
    // Knappar
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    buttonContainer.style.cssText = "display: flex; gap: 10px; justify-content: flex-end;";
    
    const saveButton = document.createElement("button");
    saveButton.className = "btn btn-success";
    saveButton.textContent = "Spara";
    saveButton.style.cssText = "padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;";
    buttonContainer.appendChild(saveButton);
    
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "Avbryt";
    cancelButton.style.cssText = "padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;";
    buttonContainer.appendChild(cancelButton);
    
    editorBox.appendChild(buttonContainer);
    
    // Funktion för att uppdatera visning av valda taggar
    const updateTagDisplay = () => {
      tagContainer.innerHTML = "";
      if (currentTags.length === 0) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Inga taggar tillagda";
        emptySpan.style.cssText = "color: #999; font-style: italic;";
        tagContainer.appendChild(emptySpan);
      } else {
        currentTags.forEach((tag) => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item selected";
          tagEl.title = "Klicka för att ta bort";
          tagEl.style.cssText = "display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; cursor: pointer; font-size: 12px;";
          
          const tagText = document.createElement("span");
          tagText.textContent = tag;
          tagEl.appendChild(tagText);
          
          const removeBtn = document.createElement("span");
          removeBtn.className = "remove-btn";
          removeBtn.textContent = " ×";
          removeBtn.style.cssText = "margin-left: 5px; font-weight: bold;";
          tagEl.appendChild(removeBtn);
          
          tagEl.addEventListener("click", () => removeTag(tag));
          tagEl.addEventListener("mouseenter", () => tagEl.style.background = "#0056b3");
          tagEl.addEventListener("mouseleave", () => tagEl.style.background = "#007bff");
          
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
        emptySpan.style.cssText = "color: #999; font-style: italic;";
        existingTagsContainer.appendChild(emptySpan);
      } else {
        availableNow.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item available";
          tagEl.textContent = tag;
          tagEl.title = "Klicka för att lägga till";
          tagEl.style.cssText = "display: inline-block; background: #28a745; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; cursor: pointer; font-size: 12px;";
          
          tagEl.addEventListener("click", () => addTag(tag));
          tagEl.addEventListener("mouseenter", () => tagEl.style.background = "#1e7e34");
          tagEl.addEventListener("mouseleave", () => tagEl.style.background = "#28a745");
          
          existingTagsContainer.appendChild(tagEl);
        });
      }
    };
    
    // Funktion för att lägga till tagg
    const addTag = (tag) => {
      if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
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
      const newTag = input.value.trim();
      if (newTag) {
        addTag(newTag);
        input.value = "";
        input.focus();
      }
    });
    
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const newTag = input.value.trim();
        if (newTag) {
          addTag(newTag);
          input.value = "";
        }
      }
    });
    
    saveButton.addEventListener("click", () => {
      success(currentTags);
      const rowData = cell.getRow().getData();
      rowData[tagField] = currentTags;
      cell.getRow().update(rowData);
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

    // Säker hämtning av befintliga taggar från den aktuella tabellen
    const getAllExistingTags = () => {
      const allTags = new Set();
      
      // Hitta den tabell som denna cell tillhör
      const cellTable = cell.getTable();
      
      // Kontrollera att table finns och är initialiserad
      if (!cellTable || typeof cellTable.getData !== 'function') {
        console.warn('Tabulator-instansen är inte tillgänglig');
        return [];
      }
      
      try {
        const tableData = cellTable.getData();
        if (!Array.isArray(tableData)) {
          console.warn('Table data är inte en array');
          return [];
        }
        
        // Hitta rätt tagg-fält baserat på data
        const sampleRow = tableData[0];
        let tagField = null;
        if (sampleRow) {
          if (sampleRow.prt_tags !== undefined) tagField = 'prt_tags';
          else if (sampleRow.itm_tags !== undefined) tagField = 'itm_tags';
          else if (sampleRow.tsk_tags !== undefined) tagField = 'tsk_tags';
          else if (sampleRow.tags !== undefined) tagField = 'tags';
        }
        
        if (tagField) {
          tableData.forEach(row => {
            if (Array.isArray(row[tagField])) {
              row[tagField].forEach(tag => allTags.add(tag));
            }
          });
        }
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

    // Använd arrow function för att bevara this-kontext
    // Lägg till AJAX-hantering när taggar ändras
    container.addEventListener("focusout", (e) => {
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          success(currentTags);
          const tagsChanged = JSON.stringify(originalTags) !== JSON.stringify(currentTags);
          if (tagsChanged) {
            // Säker kontroll av table-instans
            const cellTable = cell.getTable();
            if (cellTable && typeof cellTable.getData === 'function') {
              setTimeout(() => {
                try {
                  cellTable.setData(cellTable.getData());
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
    
    // Hämta taggar från den aktuella tabellen
    const getCurrentTable = () => cell.getTable();
    let allTags = [];

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
      this.updateDebugInfo(selectedTags, getCurrentTable());
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
      allTags = this.getAllUniqueTags(getCurrentTable().getData());

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
          getCurrentTable().refreshFilter();
        }
        
        this.updateDebugInfo(selectedTags, getCurrentTable());
        return;
      }
      
      // Hantera clear button
      if (e.target === clearButton) {
        e.stopPropagation();
        selectedTags = [];
        this.currentFilter = [];
        updateDisplay();
        success(null);
        this.updateDebugInfo(selectedTags, getCurrentTable());
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
      this.updateDebugInfo(selectedTags, getCurrentTable());
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
   * Rensa alla filter för en specifik tabell
   */
  clearFilters(table = null) {
    this.currentFilter = [];
    const targetTable = table || this.tables.values().next().value;
    if (targetTable) {
      targetTable.clearHeaderFilter();
      this.updateDebugInfo([], targetTable);
    }
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
   * Lägg till taggar till en tabell
   */
  addTagsToTable(table, entityType = "item", project, options = {}) {
    // Kontrollera om tabellen redan har taggar
    const existingColumns = table.getColumns();
    const tagField = entityType === "part" ? "prt_tags" : 
                     entityType === "item" ? "itm_tags" : 
                     "tsk_tags";
    
    const hasTagColumn = existingColumns.some(col => col.getField() === tagField);
    
    if (hasTagColumn) {
      return;
    }

    const setup = () => {
      const isItemsTable = table.element && table.element.id === 'item-table';
      
      if (isItemsTable && this.helpers?.applyPartFilter) {
        // För Items-tabellen: intercepta TagSystemUtils filter-calls
        const originalSetFilter = table.setFilter.bind(table);
        
        table.setFilter = function(filters) {
          // Om det här är ett tagg-filter-anrop, spara filtret och använd vår kombinerade funktion
          if (Array.isArray(filters) && filters.length === 1 && filters[0].field === 'itm_tags') {
            window.itemsTagFilter = filters[0].value;
            this.helpers.applyPartFilter(); // Använd vår kombinerade filter-funktion
            return;
          } else if (filters === null || (Array.isArray(filters) && filters.length === 0)) {
            window.itemsTagFilter = null;
            this.helpers.applyPartFilter(); // Använd vår kombinerade filter-funktion
            return;
          }
          
          // För alla andra filter-anrop, använd original-funktionen
          originalSetFilter(filters);
        }.bind(this);
      }

      this.ensureTagsArray(table, entityType);

      // Modifierad kolumn-konfiguration med AJAX-hantering
      const tagCol = this.getColumnConfig(tagField);
      
      // Wrappa den ursprungliga editorn för att lägga till AJAX-funktionalitet
      const originalEditor = tagCol.editor;
      tagCol.editor = (cell, onRendered, success, cancel, editorParams) => {
        const rowData = cell.getRow().getData();
        const oldTags = Array.isArray(rowData[tagField]) ? [...rowData[tagField]] : [];
        
        return this.createTagEditor(cell, onRendered, (newTags) => {
          // Uppdatera data i rätt entitet baserat på tabelltyp
          let entityId, entityTypeStr;
          
          if (entityType === "part") {
            entityId = rowData.prt_id;
            entityTypeStr = "part";
            // Uppdatera part i project data
            const part = this.helpers?.findPartById?.(project, entityId);
            if (part) {
              part.prt_tags = newTags || [];
            }
          } else if (entityType === "item") {
            entityId = rowData.itm_id;
            entityTypeStr = "item";
            // Uppdatera item i project data
            const item = this.helpers?.findItemById?.(project, entityId);
            if (item) {
              item.itm_tags = newTags || [];
            }
          } else if (entityType === "task") {
            entityId = rowData.tsk_id;
            entityTypeStr = "task";
            // Uppdatera task i project data
            const task = this.helpers?.findTaskById?.(project, entityId);
            if (task) {
              task.tsk_tags = newTags || [];
            }
          }
          
          // Skicka AJAX-anrop för tagguppdatering
          this.handleTagUpdate(entityTypeStr, entityId, newTags || [], oldTags);
          
          // Anropa ursprunglig success-callback
          success(newTags);
        }, cancel, tagField, entityType);
      };

      // Lägg kolumnen
      table.addColumn(tagCol).catch(() => {
        const current = table.getColumnDefinitions();
        table.setColumns([...current, tagCol]);
      });

      window.__tagUtils = window.__tagUtils || {};
      window.__tagUtils[table.element.id || "table"] = this;
    };

    // Kör direkt om redan byggt, annars vänta på eventet
    if (table.initialized || table._rendered) setup();
    else table.on("tableBuilt", setup);
  }

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

// Exportera som default export för ES6 modules
export default TagSystemUtils;
