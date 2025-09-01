// ExportModule.js
// Centralized export logic for Tabulator.js tables (part, item, task)
// Improved: Robust copy-to-clipboard, consistent modal feedback, ES6 style

import { createFooterButton } from "./uiHelpers.js";

/**
 * Utility: Sanitize filename for download
 */
export function sanitizeFilename(name) {
  return (name || "export")
    .replace(/[^a-z0-9_\-]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/**
 * Utility: Download JSON as file
 */
export function downloadJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Utility: Copy JSON to clipboard (robust, with fallback and feedback)
 */
export function copyToClipboard(str) {
  function showCopyFeedback() {
    const el = document.querySelector(".tab-modal-btn.tab-modal-confirm");
    if (el) {
      el.textContent = "Kopierat!";
      setTimeout(() => { el.textContent = "Kopiera"; }, 1200);
    }
  }
  // Modern API, only on secure context (localhost or https)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(str)
      .then(showCopyFeedback)
      .catch(() => fallbackCopy(str));
  } else {
    fallbackCopy(str);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      showCopyFeedback();
    } catch (err) {
      alert("Misslyckades att kopiera till urklipp.");
    }
    document.body.removeChild(textarea);
  }
}

/**
 * Main export data filter logic
 * - type: "part", "item", or "task"
 * - config: { exclude: [], include: [] }
 */
export function filterExportData(entity, type, config = {}) {
  const exclude = Array.isArray(config.exclude) ? config.exclude : [];
  const include = Array.isArray(config.include) ? config.include : null;

  // Helper to filter a single task
  function filterTask(task) {
    const out = {};
    Object.keys(task).forEach(key => {
      if (exclude.includes(key)) return;
      if (include && !include.includes(key)) return;
      out[key] = task[key];
    });
    return out;
  }

  // Helper to filter an item and its tasks
  function filterItem(item) {
    const out = {};
    Object.keys(item).forEach(key => {
      if (exclude.includes(key)) return;
      if (include && !include.includes(key)) return;
      if (key === "itm_tasks" && Array.isArray(item[key])) {
        out.itm_tasks = item.itm_tasks.map(filterTask);
      } else {
        out[key] = item[key];
      }
    });
    return out;
  }

  // Filter part, its items, and their tasks
  function filterPart(part) {
    const out = {};
    Object.keys(part).forEach(key => {
      if (exclude.includes(key)) return;
      if (include && !include.includes(key)) return;
      if (key === "prt_items" && Array.isArray(part[key])) {
        out.prt_items = part.prt_items.map(filterItem);
      } else {
        out[key] = part[key];
      }
    });
    return out;
  }

  if (type === "task") return filterTask(entity);
  if (type === "item") return filterItem(entity);
  if (type === "part") return filterPart(entity);
  return entity;
}

/**
 * Show export modal overlay with Prism.js highlighting
 * @param {Object} data - JSON data to display
 * @param {string} filename - suggested filename
 */
export function showExportModal(data, filename = "data.json") {
  // Remove any existing modal
  let old = document.getElementById("tab-export-modal");
  if (old) old.remove();

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "tab-export-modal";
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;

  // Modal content
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "600px";
  modal.style.minWidth = "320px";
  modal.style.width = "90%";

  // Title
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = "Exportera data";
  modal.appendChild(title);

  // Code block
  const codeBlock = document.createElement("pre");
  codeBlock.style.margin = "0 0 18px 0";
  codeBlock.style.overflow = "auto";
  const code = document.createElement("code");
  code.className = "language-json";
  const jsonStr = JSON.stringify(data, null, 2);
  code.textContent = jsonStr;
  codeBlock.appendChild(code);
  modal.appendChild(codeBlock);

  // Prism.js highlight
  if (window.Prism && window.Prism.highlightElement) {
    setTimeout(() => window.Prism.highlightElement(code), 10);
  }

  // Filename display
  const fnameEl = document.createElement("div");
  fnameEl.style.fontSize = "13px";
  fnameEl.style.margin = "8px 0 18px 0";
  fnameEl.textContent = `Filnamn: ${filename}`;
  modal.appendChild(fnameEl);

  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  btnRow.style.justifyContent = "center";
  btnRow.style.marginTop = "16px";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "tab-modal-btn tab-modal-confirm";
  copyBtn.textContent = "Kopiera";
  copyBtn.onclick = () => copyToClipboard(jsonStr);
  btnRow.appendChild(copyBtn);

  // Download button
  const dlBtn = document.createElement("button");
  dlBtn.className = "tab-modal-btn tab-modal-confirm";
  dlBtn.textContent = "Ladda ner";
  dlBtn.onclick = () => downloadJSON(data, filename);
  btnRow.appendChild(dlBtn);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "tab-modal-btn tab-modal-cancel";
  closeBtn.textContent = "Stäng";
  closeBtn.onclick = () => {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  };
  btnRow.appendChild(closeBtn);

  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ESC support
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      overlay.classList.remove("active");
      setTimeout(() => overlay.remove(), 300);
      document.removeEventListener("keydown", escHandler);
    }
  });
}

/**
 * Tabulator column generators
 * Each returns a config for export column (per entity type)
 * - config: { exclude: [...], include: [...] }
 */
export function getPartExportColumn(config = {}) {
  return {
    title: "Export",
    field: "part_export",
    width: 60,
    hozAlign: "center",
    formatter: () => `<button class="tab-export-btn" title="Exportera part"><i class="fa fa-download"></i></button>`,
    cellClick: (e, cell) => {
      const part = cell.getRow().getData();
      const exportData = filterExportData(part, "part", config);
      const filename = sanitizeFilename(part.prt_name || `part_${part.prt_id}`) + ".json";
      showExportModal(exportData, filename);
    },
    headerSort: false
  };
}

export function getItemExportColumn(config = {}) {
  return {
    title: "Export",
    field: "item_export",
    width: 60,
    hozAlign: "center",
    formatter: () => `<button class="tab-export-btn" title="Exportera item"><i class="fa fa-download"></i></button>`,
    cellClick: (e, cell) => {
      const item = cell.getRow().getData();
      const exportData = filterExportData(item, "item", config);
      const filename = sanitizeFilename(item.itm_name || `item_${item.itm_id}`) + ".json";
      showExportModal(exportData, filename);
    },
    headerSort: false
  };
}

export function getTaskExportColumn(config = {}) {
  return {
    title: "Export",
    field: "task_export",
    width: 60,
    hozAlign: "center",
    formatter: () => `<button class="tab-export-btn" title="Exportera task"><i class="fa fa-download"></i></button>`,
    cellClick: (e, cell) => {
      const task = cell.getRow().getData();
      const exportData = filterExportData(task, "task", config);
      const filename = sanitizeFilename(task.tsk_name || `task_${task.tsk_id}`) + ".json";
      showExportModal(exportData, filename);
    },
    headerSort: false
  };
}

// Export everything for main.js
export default {
  filterExportData,
  sanitizeFilename,
  showExportModal,
  downloadJSON,
  copyToClipboard,
  getPartExportColumn,
  getItemExportColumn,
  getTaskExportColumn,
};
