// uiHelpers.js

/**
 * Creates a footer with a single button for Tabulator tables.
 * @param {string} text - Button text
 * @param {function} onClick - Callback on button click
 * @returns {HTMLDivElement}
 */
export const createFooterButton = (text, onClick) => {
  const footer = document.createElement("div");
  footer.style.textAlign = "right";
  const btn = document.createElement("button");
  btn.className = "tab-modal-btn tab-modal-confirm";
  btn.textContent = text;
  btn.onclick = onClick;
  footer.appendChild(btn);
  return footer;
};

/**
 * Creates a footer with a cog icon dropdown for column visibility + an add button.
 * @param {Tabulator} table - Tabulator instance
 * @param {string} addText - Text for add button
 * @param {function} onAdd - Callback for add button
 * @returns {HTMLDivElement}
 */
export function createFooterWithColumnChooser(table, addText, onAdd) {
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.alignItems = "center";
  footer.style.gap = "12px";
  footer.style.position = "relative";

  // Add button
  const addBtn = document.createElement("button");
  addBtn.className = "tab-modal-btn tab-modal-confirm";
  addBtn.textContent = addText;
  addBtn.onclick = onAdd;
  footer.appendChild(addBtn);

  // Cog/gear icon button
  const cogBtn = document.createElement("button");
  cogBtn.className = "tab-modal-btn";
  cogBtn.innerHTML = `<i class="fa fa-cog"></i>`;
  cogBtn.style.padding = "8px 12px";
  cogBtn.style.marginLeft = "6px";
  cogBtn.style.fontSize = "16px";
  cogBtn.title = "Välj synliga kolumner";
  footer.appendChild(cogBtn);

  // Dropdown for column chooser
  const dropdown = document.createElement("div");
  dropdown.style.display = "none";
  dropdown.style.position = "absolute";
  dropdown.style.bottom = "38px";
  dropdown.style.right = "8px";
  dropdown.style.background = "#fff";
  dropdown.style.border = "1px solid #ddd";
  dropdown.style.borderRadius = "6px";
  dropdown.style.boxShadow = "0 2px 8px #0001";
  dropdown.style.padding = "10px 18px";
  dropdown.style.zIndex = "10000";
  dropdown.style.minWidth = "180px";
  dropdown.className = "tab-column-chooser-dropdown";

  // Build dropdown contents
  function buildDropdown() {
    dropdown.innerHTML = "<div style='font-weight:bold; margin-bottom:10px;'>Synliga kolumner</div>";
    table.getColumns().forEach(col => {
      const def = col.getDefinition();
      const field = col.getField();
      const title = def.title || field || "";
      // Hide for internal/utility columns (adjust as needed)
      if (!field || field.startsWith("_") || field.endsWith("_export")) return;
      // Don't allow hiding the first column (commonly delete/toggle)
      if (col === table.getColumns()[0]) return;
      const isVisible = col.isVisible();
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.gap = "6px";
      label.style.marginBottom = "6px";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isVisible;
      checkbox.onchange = () => {
        if (checkbox.checked) table.showColumn(field);
        else table.hideColumn(field);
      };
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + title));
      dropdown.appendChild(label);
    });
  }

  cogBtn.onclick = (e) => {
    e.stopPropagation();
    buildDropdown();
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  };

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== cogBtn) {
      dropdown.style.display = "none";
    }
  });

  footer.appendChild(dropdown);

  return footer;
}

/**
 * Renders an item row with a sub-table for tasks.
 * @param {Object} itemRow - Tabulator row object
 * @param {Object} dependencies - { getTaskTableColumns, addTaskRow, createFooterButton }
 */
export const renderItemRow = (itemRow, { getTaskTableColumns, addTaskRow, createFooterButton }) => {
  const itemData = itemRow.getData();
  if (!itemData.itm_tasks?.length) {
    renderEmptyTaskFooter(itemRow, addTaskRow);
    return;
  }
  let holderEl = itemRow.getElement().querySelector(".subtable-holder");
  if (!holderEl) {
    holderEl = document.createElement("div");
    holderEl.className = "subtable-holder";
    itemRow.getElement().appendChild(holderEl);

    const taskTableDiv = document.createElement("div");
    holderEl.appendChild(taskTableDiv);

    // Create sub-table for tasks
    const taskTable = new Tabulator(taskTableDiv, {
      index: "tsk_id",
      data: itemData.itm_tasks,
      layout: "fitDataFill",
      columns: getTaskTableColumns(),
      footerElement: createFooterButton("Lägg till Task", () => addTaskRow(itemData)),
    });

    itemRow._subTaskTable = taskTable;
  }
};

/**
 * Renders a footer for items without tasks.
 * @param {Object} itemRow - Tabulator row object
 * @param {function} addTaskRowCallback - Callback to add a new task
 */
export const renderEmptyTaskFooter = (itemRow, addTaskRowCallback) => {
  let holderEl = itemRow.getElement().querySelector(".subtable-holder");
  if (!holderEl) {
    holderEl = document.createElement("div");
    holderEl.className = "subtable-holder";
    itemRow.getElement().appendChild(holderEl);
    holderEl.appendChild(createFooterButton("Lägg till Task", () => addTaskRowCallback(itemRow.getData())));
  }
};
