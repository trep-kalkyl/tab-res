/**
 * TagSystemUtils - Avancerat tag-filtreringssystem för Tabulator
 * Stöder AND/OR-logik, debug-läge, konfigurerbar UI och AJAX-integrering
 * Nu: Overlay-baserad editor direkt i tagEditor!
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

  // ... (alla andra metoder orörda!) ...

  /**
   * Overlay-baserad tagEditor!
   */
  tagEditor(cell, onRendered, success, cancel, editorParams) {
    // Hämta korrekt fält
    const fieldName = cell.getColumn().getField() || 'tags';
    let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()] : [];

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "tag-editor-overlay";
    const editorBox = document.createElement("div");
    editorBox.className = "tag-editor-box";
    overlay.appendChild(editorBox);

    // Rubrik
    const title = document.createElement("h5");
    title.className = "tag-editor-title";
    title.textContent = "Redigera taggar";
    editorBox.appendChild(title);

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

    // Nya taggar
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

    // Spara/avbryt
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    const saveButton = document.createElement("button");
    saveButton.className = "btn btn-success";
    saveButton.textContent = "Spara";
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "Avbryt";
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    editorBox.appendChild(buttonContainer);

    // Samla alla existerande taggar
    const getAllExistingTags = () => {
      const allTags = new Set();
      if (!this.table || typeof this.table.getData !== 'function') return [];
      const data = this.table.getData();
      data.forEach(row => {
        if (Array.isArray(row[fieldName])) row[fieldName].forEach(tag => allTags.add(tag));
      });
      return Array.from(allTags).sort();
    };

    // Utskrift/uppdateringsfunktioner
    function updateTagDisplay() {
      tagContainer.innerHTML = "";
      if (currentTags.length === 0) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Inga taggar tillagda";
        tagContainer.appendChild(emptySpan);
      } else {
        currentTags.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item selected";
          tagEl.title = "Klicka för att ta bort";
          const tagText = document.createElement("span");
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
    }
    function updateExistingTagsDisplay() {
      existingTagsContainer.innerHTML = "";
      const allTags = getAllExistingTags();
      const availableNow = allTags.filter(tag => !currentTags.includes(tag));
      if (availableNow.length === 0) {
        const emptySpan = document.createElement("span");
        emptySpan.className = "empty-state";
        emptySpan.textContent = "Alla tillgängliga taggar är redan tillagda";
        existingTagsContainer.appendChild(emptySpan);
      } else {
        availableNow.forEach(tag => {
          const tagEl = document.createElement("span");
          tagEl.className = "tag-item available";
          tagEl.textContent = tag;
          tagEl.title = "Klicka för att lägga till";
          tagEl.addEventListener("click", () => addTag(tag));
          existingTagsContainer.appendChild(tagEl);
        });
      }
    }
    function addTag(tag) {
      if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
        updateTagDisplay();
      }
    }
    function removeTag(tag) {
      const index = currentTags.indexOf(tag);
      if (index > -1) {
        currentTags.splice(index, 1);
        updateTagDisplay();
      }
    }

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
    // Escape
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        cancel();
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Visa overlay
    document.body.appendChild(overlay);
    updateTagDisplay();
    setTimeout(() => input.focus(), 100);
    onRendered(() => {});

    // Return tom div, eftersom overlay används istället
    return document.createElement("div");
  }

  // ... (alla andra metoder orörda!) ...
  // getAllUniqueTags, tagFormatter, customTagHeaderFilter etc kopieras från din nuvarande fil

  // Exportera som default export för ES6 modules
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
