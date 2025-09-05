// ImportManager.js - Import JSON data via modal/overlay for Part, Item, or Task in Tabulator.js

import * as calcUtils from "./projectCalcUtils.js";
import * as ItemManager from "./ItemManager.js";

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
    // Add each row with supplied addRowFn (delegates to ItemManager etc)
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
