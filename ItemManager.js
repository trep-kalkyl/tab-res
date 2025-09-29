// ImportManager.js - Import JSON data via modal/overlay for Part, Item, or Task in Tabulator.js

import * as calcUtils from "./projectCalcUtils.js";

/**
 * Opens a modal overlay for importing JSON data at the specified level.
 * @param {Object} options - Configuration object
 *   { targetType: "part"|"item"|"task", table: Tabulator, project, addRowFn: Function }
 */
export function openImportModal({ targetType, table, project, addRowFn }) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  // Modal content
  const box = document.createElement("div");
  box.className = "tab-modal-content";
  box.style.maxWidth = "650px";
  box.innerHTML = `
    <h3>Importera ${targetType.charAt(0).toUpperCase() + targetType.slice(1)} (JSON)</h3>
    <div style="margin-bottom:10px;font-size:13px;color:#666;">
      Klistra in en JSON-array med ${targetType}-objekt, eller välj fil.<br>
      Exempel: <code>[{...}, {...}]</code>
    </div>
    <textarea id="import-json" rows="7" style="width:100%;margin-bottom:12px;font-family:monospace;"></textarea>
    <input type="file" id="import-file" accept=".json" style="margin-bottom:12px;">
    <div id="import-preview" style="margin-bottom:18px;"></div>
    <div class="tab-modal-buttons">
      <button id="import-confirm" class="tab-modal-btn tab-modal-confirm" disabled>Importera</button>
      <button id="import-cancel" class="tab-modal-btn tab-modal-cancel">Avbryt</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Preview & State
  let importedRows = [];
  const previewDiv = box.querySelector("#import-preview");
  const confirmBtn = box.querySelector("#import-confirm");
  const textarea = box.querySelector("#import-json");
  const fileInput = box.querySelector("#import-file");

  // Helper: show preview table
  function showPreview(rows) {
    previewDiv.innerHTML = "";
    if (!Array.isArray(rows) || rows.length === 0) {
      previewDiv.innerHTML = `<div style="color:#999;font-style:italic;">Ingen data att importera.</div>`;
      confirmBtn.disabled = true;
      return;
    }
    // Validate basic schema for each level
    let valid = true, errors = [];
    rows.forEach((row, i) => {
      if (targetType === "part" && !("prt_id" in row && "prt_name" in row)) {
        valid = false; errors.push(`Rad ${i+1}: Saknar "prt_id" eller "prt_name"`);
      }
      if (targetType === "item" && !("itm_id" in row && "itm_name" in row && "itm_prt_id" in row)) {
        valid = false; errors.push(`Rad ${i+1}: Saknar "itm_id", "itm_name" eller "itm_prt_id"`);
      }
      if (targetType === "task" && !("tsk_id" in row && "tsk_name" in row && "tsk_itm_id" in row)) {
        valid = false; errors.push(`Rad ${i+1}: Saknar "tsk_id", "tsk_name" eller "tsk_itm_id"`);
      }
    });
    if (!valid) {
      previewDiv.innerHTML = `<div style="color:#d33;padding:8px;">Fel: ${errors.join("<br>")}</div>`;
      confirmBtn.disabled = true;
      return;
    }
    // Show Tabulator preview
    const previewTableDiv = document.createElement("div");
    previewDiv.appendChild(previewTableDiv);
    let cols = [];
    if (rows.length) {
      cols = Object.keys(rows[0]).map(key => ({ title: key, field: key, width: 120 }));
    }
    const previewTable = new Tabulator(previewTableDiv, {
      data: rows,
      layout: "fitDataFill",
      columns: cols,
      height: "220px"
    });
    confirmBtn.disabled = false;
  }

  // Parse JSON from textarea
  textarea.addEventListener("input", e => {
    try {
      importedRows = JSON.parse(e.target.value);
      showPreview(importedRows);
    } catch {
      previewDiv.innerHTML = `<div style="color:#d33;">Ogiltig JSON!</div>`;
      confirmBtn.disabled = true;
      importedRows = [];
    }
  });

  // Parse JSON from file
  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      textarea.value = evt.target.result;
      try {
        importedRows = JSON.parse(evt.target.result);
        showPreview(importedRows);
      } catch {
        previewDiv.innerHTML = `<div style="color:#d33;">Ogiltig JSON i filen!</div>`;
        confirmBtn.disabled = true;
        importedRows = [];
      }
    };
    reader.readAsText(file);
  });

  // Confirm import
  confirmBtn.onclick = () => {
    if (!Array.isArray(importedRows) || importedRows.length === 0) return;
    importedRows.forEach(row => addRowFn(row, project, table));
    calcUtils.updateAllData(project);
    table.setData(table.getData()); // Refresh
    document.body.removeChild(overlay);
  };
  box.querySelector("#import-cancel").onclick = () => document.body.removeChild(overlay);

  // ESC support
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", escHandler);
    }
  });
}
export function addPartRow(project, partTable, itemTable, updatePartOptions, applyPartFilter) {
  const newPart = {
    prt_id: calcUtils.getNextPartId(project),
    prt_prj_id: project.prj_id,
    prt_name: "Ny Part",
    prt_comments: [],
    prt_tags: [],
    prt_items: [],
    selected: true,
  };
  project.prt_parts.push(newPart);
  calcUtils.updateAllData(project);
  partTable.setData(project.prt_parts);
  updatePartOptions();
  applyPartFilter();
}

// Skapa ny Task och lägg till i valt Item
export function addTaskRow(project, itemData, itemTable, openItemRows) {
  const newTask = {
    tsk_id: calcUtils.getNextTaskId(project),
    tsk_itm_id: itemData.itm_id,
    tsk_name: "Ny Task",
    tsk_total_quantity: 1,
    tsk_work_task_duration: 1,
    tsk_material_amount: 1,
    tsk_material_user_price: 0,
    tsk_comments: [],
    tsk_tags: [],
    tsk_construction_stage: "",
  };
  itemData.itm_tasks.push(newTask);
  calcUtils.updateAllData(project);
  itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
  openItemRows?.add(itemData.itm_id);
}

// Kopiera en Task och lägg till den i samma Item
export function handleCopyTask(project, taskData, itemTable, openItemRows) {
  // Hitta rätt item
  const item = project.prt_parts
    .flatMap(part => part.prt_items || [])
    .find(item => item.itm_id === taskData.tsk_itm_id);
  if (!item) return;

  // Djup kopia av task
  const newTask = JSON.parse(JSON.stringify(taskData));
  newTask.tsk_id = calcUtils.getNextTaskId(project);
  newTask.tsk_name = (taskData.tsk_name || "") + " (kopia)";
  newTask.tsk_comments = []; // Nollställ kommentarer
  newTask.tsk_tags = []; // Nollställ tags

  // Lägg till i item
  item.itm_tasks.push(newTask);

  // Uppdatera kalkyler
  calcUtils.updateAllData(project);

  // Uppdatera Tabulator-tabell
  itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));

  // AJAX: Skicka info om kopiering
  const ajaxData = {
    action: "copyTask",
    sourceTaskId: taskData.tsk_id,
    newTaskId: newTask.tsk_id,
    itemId: item.itm_id,
    partId: item.itm_prt_id,
    tsk_name: newTask.tsk_name,
  };
  import("./ajaxHandler.js").then(mod => {
    mod.queuedEchoAjax(ajaxData);
  });

  // Öppna subtable om den är stängd (valfritt)
  openItemRows?.add(item.itm_id);
}

export function addItemRow(project, itemTable, partTable, updatePartOptions, applyPartFilter, openItemRows) {
  // Skapa en tom item med nytt ID och default-data
  const newItem = {
    itm_id: calcUtils.getNextItemId(project),
    itm_prt_id: project.prt_parts[0]?.prt_id || 1, // Första part som default
    itm_name: "Ny Item",
    itm_quantity: 1,
    itm_tags: [],
    itm_comments: [],
    itm_tasks: [],
  };
  // Lägg till i rätt part
  const part = project.prt_parts.find(p => p.prt_id === newItem.itm_prt_id);
  if (part) {
    part.prt_items.push(newItem);
  }
  calcUtils.updateAllData(project);
  itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
  updatePartOptions();
  applyPartFilter();
  // Eventuellt öppna subtable
  openItemRows?.add(newItem.itm_id);
}
