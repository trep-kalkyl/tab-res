// ImportModule.js
// Handles import of Parts, Items, and Tasks with Tabulator preview, row selection, parent selection, and ID regeneration

import * as calcUtils from "./projectCalcUtils.js";
import * as ajaxHandler from "./ajaxHandler.js";

/**
 * Detects import type from JSON structure
 * @param {Object} data - Parsed JSON object
 * @returns {string} - "part", "item", "task", or "unknown"
 */
export function detectImportType(data) {
  if (!data || typeof data !== 'object') return 'unknown';
  
  // Check for part structure
  if (data.prt_id !== undefined && data.prt_name !== undefined) {
    return 'part';
  }
  
  // Check for item structure
  if (data.itm_id !== undefined && data.itm_name !== undefined) {
    return 'item';
  }
  
  // Check for task structure
  if (data.tsk_id !== undefined && data.tsk_name !== undefined) {
    return 'task';
  }
  
  // Check for project structure (import parts from project)
  if (data.prt_parts && Array.isArray(data.prt_parts)) {
    return 'project';
  }
  
  return 'unknown';
}

/**
 * Validates import data structure
 * @param {Object} data - Import data
 * @param {string} type - Import type
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateImportData(data, type) {
  const errors = [];
  
  if (!data) {
    errors.push("Ingen data att importera");
    return { valid: false, errors };
  }
  
  switch(type) {
    case 'part':
      if (!data.prt_name) errors.push("Part måste ha ett namn (prt_name)");
      break;
    case 'item':
      if (!data.itm_name) errors.push("Item måste ha ett namn (itm_name)");
      break;
    case 'task':
      if (!data.tsk_name) errors.push("Task måste ha ett namn (tsk_name)");
      break;
    case 'project':
      if (!data.prt_parts || !Array.isArray(data.prt_parts)) {
        errors.push("Project måste innehålla prt_parts array");
      }
      break;
    case 'unknown':
      errors.push("Okänd importtyp - kontrollera JSON-strukturen");
      break;
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Strips parent IDs and computed totals from import data
 * @param {Object} data - Import data
 * @param {string} type - Import type
 * @returns {Object} - Cleaned data
 */
export function stripParentIdsAndTotals(data, type) {
  const cleaned = JSON.parse(JSON.stringify(data)); // Deep clone
  
  function cleanTask(task) {
    delete task.tsk_itm_id; // Parent ID ALWAYS removed
    delete task.tsk_material_user_price_total;
    delete task.tsk_work_task_duration_total;
    return task;
  }
  
  function cleanItem(item) {
    delete item.itm_prt_id; // Parent ID ALWAYS removed
    delete item.itm_material_user_price;
    delete item.itm_work_task_duration;
    delete item.itm_material_user_price_total;
    delete item.itm_work_task_duration_total;
    if (item.itm_tasks && Array.isArray(item.itm_tasks)) {
      item.itm_tasks = item.itm_tasks.map(cleanTask);
    }
    return item;
  }
  
  function cleanPart(part) {
    delete part.prt_prj_id; // Parent ID ALWAYS removed
    delete part.prt_material_user_price_total;
    delete part.prt_work_task_duration_total;
    if (part.prt_items && Array.isArray(part.prt_items)) {
      part.prt_items = part.prt_items.map(cleanItem);
    }
    return part;
  }
  
  switch(type) {
    case 'task':
      return cleanTask(cleaned);
    case 'item':
      return cleanItem(cleaned);
    case 'part':
      return cleanPart(cleaned);
    case 'project':
      if (cleaned.prt_parts && Array.isArray(cleaned.prt_parts)) {
        cleaned.prt_parts = cleaned.prt_parts.map(cleanPart);
      }
      return cleaned;
    default:
      return cleaned;
  }
}

/**
 * Regenerates all IDs in import data
 * @param {Object} project - Project object
 * @param {Object} data - Import data
 * @param {string} type - Import type
 * @param {number} parentId - Parent ID (required for items/tasks)
 * @returns {Object} - Data with new IDs
 */
export function regenerateIds(project, data, type, parentId = null) {
  const withNewIds = JSON.parse(JSON.stringify(data)); // Deep clone
  
  function regenerateTaskIds(item) {
    if (item.itm_tasks && Array.isArray(item.itm_tasks)) {
      item.itm_tasks = item.itm_tasks.map(task => {
        const newTaskId = calcUtils.getNextTaskId(project);
        task.tsk_id = newTaskId;
        task.tsk_itm_id = item.itm_id; // Link to parent item
        return task;
      });
    }
    return item;
  }
  
  function regenerateItemIds(part) {
    if (part.prt_items && Array.isArray(part.prt_items)) {
      part.prt_items = part.prt_items.map(item => {
        const newItemId = calcUtils.getNextItemId(project);
        item.itm_id = newItemId;
        item.itm_prt_id = part.prt_id; // Link to parent part
        regenerateTaskIds(item);
        return item;
      });
    }
    return part;
  }
  
  function regeneratePartIds(part) {
    const newPartId = calcUtils.getNextPartId(project);
    part.prt_id = newPartId;
    part.prt_prj_id = project.prj_id;
    regenerateItemIds(part);
    return part;
  }
  
  switch(type) {
    case 'task':
      withNewIds.tsk_id = calcUtils.getNextTaskId(project);
      withNewIds.tsk_itm_id = parentId; // Set parent from user selection
      return withNewIds;
    case 'item':
      withNewIds.itm_id = calcUtils.getNextItemId(project);
      withNewIds.itm_prt_id = parentId; // Set parent from user selection
      regenerateTaskIds(withNewIds);
      return withNewIds;
    case 'part':
      return regeneratePartIds(withNewIds);
    case 'project':
      if (withNewIds.prt_parts && Array.isArray(withNewIds.prt_parts)) {
        withNewIds.prt_parts = withNewIds.prt_parts.map(regeneratePartIds);
      }
      return withNewIds;
    default:
      return withNewIds;
  }
}

/**
 * Get available parents for dropdown
 */
function getParentOptions(project, type) {
  if (type === "item" || type === "part") {
    // Return parts as parent options for items
    return (project.prt_parts || []).map(part => ({
      value: part.prt_id,
      label: `${part.prt_name} (ID: ${part.prt_id})`
    }));
  } else if (type === "task") {
    // Return items (from all parts) as parent options for tasks
    const items = [];
    (project.prt_parts || []).forEach(part => {
      (part.prt_items || []).forEach(item => {
        items.push({
          value: item.itm_id,
          label: `${item.itm_name} (Part: ${part.prt_name}, ID: ${item.itm_id})`
        });
      });
    });
    return items;
  }
  return [];
}

/**
 * Get columns for Tabulator preview table based on type
 */
function getColumnsForPreview(project, type) {
  const baseColumns = [
    {
      title: "",
      field: "_selected",
      formatter: "tickCross",
      width: 50,
      hozAlign: "center",
      headerSort: false,
      editor: true,
      cellEdited: () => {} // Allow toggle
    }
  ];
  
  // Add parent column for items and tasks
  if (type === "item" || type === "task") {
    const parentOptions = getParentOptions(project, type);
    
    if (parentOptions.length === 0) {
      alert(`Ingen ${type === "item" ? "Part" : "Item"} hittades. Skapa en först!`);
      return null;
    }
    
    // Skapa värden-objekt för editorParams (endast values, inte options)
    const values = {};
    parentOptions.forEach(opt => {
      values[opt.value] = opt.label;
    });
    
    baseColumns.push({
      title: type === "item" ? "Välj Parent (Part)" : "Välj Parent (Item)",
      field: "_parentId",
      editor: "list",
      editorParams: { 
        values: values,
        clearable: false,
        elementAttributes: {
          maxLength: "200"
        }
      },
      formatter: (cell) => {
        const val = cell.getValue();
        const opt = parentOptions.find(o => o.value == val);
        return opt ? opt.label : "Välj parent...";
      },
      width: 300,
      headerSort: false,
      cellEdited: (cell) => {
        // Force update to ensure value is saved
        const row = cell.getRow();
        const data = row.getData();
        data._parentId = cell.getValue();
        row.update(data);
      }
    });
  }
  
  switch(type) {
    case 'part':
      return [
        ...baseColumns,
        { title: "Part ID (kommer ändras)", field: "prt_id", width: 120 },
        { title: "Namn", field: "prt_name", editor: "input" },
        { title: "Antal Items", field: "_itemCount", width: 100 }
      ];
    case 'item':
      return [
        ...baseColumns,
        { title: "Item ID (kommer ändras)", field: "itm_id", width: 120 },
        { title: "Namn", field: "itm_name", editor: "input" },
        { title: "Kategori", field: "itm_category", editor: "input" },
        { title: "Antal", field: "itm_quantity", editor: "number" },
        { title: "Antal Tasks", field: "_taskCount", width: 100 }
      ];
    case 'task':
      return [
        ...baseColumns,
        { title: "Task ID (kommer ändras)", field: "tsk_id", width: 120 },
        { title: "Namn", field: "tsk_name", editor: "input" },
        { title: "Quantity", field: "tsk_total_quantity", editor: "number" }
      ];
    case 'project':
      return [
        ...baseColumns,
        { title: "Part ID (kommer ändras)", field: "prt_id", width: 120 },
        { title: "Namn", field: "prt_name", editor: "input" },
        { title: "Antal Items", field: "_itemCount", width: 100 }
      ];
    default:
      return [];
  }
}

/**
 * Extract rows from data for preview with metadata
 */
function getRowsFromData(project, data, type) {
  let rows = [];
  
  if (type === 'project' && data.prt_parts) {
    rows = data.prt_parts;
  } else if (Array.isArray(data)) {
    rows = data;
  } else {
    rows = [data];
  }
  
  // Add metadata fields
  return rows.map(row => {
    const enriched = { ...row };
    enriched._selected = true; // Default: all selected
    
    // Add counts
    if (type === 'part' || type === 'project') {
      enriched._itemCount = row.prt_items ? row.prt_items.length : 0;
    }
    if (type === 'item') {
      enriched._taskCount = row.itm_tasks ? row.itm_tasks.length : 0;
    }
    
    // Set default parent (first available)
    if (type === "item" || type === "task") {
      const parentOptions = getParentOptions(project, type);
      if (parentOptions.length > 0) {
        enriched._parentId = parentOptions[0].value;
      }
    }
    
    return enriched;
  });
}

/**
 * Shows import preview modal with Tabulator table
 * @param {Object} project - Project object
 * @param {Object} data - Import data
 * @param {string} type - Import type
 * @param {Function} onConfirm - Callback with selected rows
 */
export function showImportPreview(project, data, type, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "95%";
  modal.style.width = "1200px";
  modal.style.maxHeight = "90vh";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = `Förhandsgranska import: ${type}`;
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Redigera och välj rader att importera</strong><br>
    ${type !== "part" && type !== "project" ? `• <strong>Viktigt:</strong> Klicka på parent-cellen och välj från dropdownen<br>` : ""}
    • Klicka checkboxen för att välja/avmarkera rader<br>
    • Använd filter och sortering för att hitta rätt rader<br>
    • Parent-ID från importfilen ignoreras<br>
    • Nya ID:n genereras automatiskt<br>
    • Totalsummor räknas om
  `;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);
  
  // Tabulator container
  const tableContainer = document.createElement("div");
  tableContainer.style.flex = "1";
  tableContainer.style.minHeight = "300px";
  tableContainer.style.maxHeight = "500px";
  tableContainer.style.overflow = "auto";
  tableContainer.style.border = "1px solid #ddd";
  tableContainer.style.borderRadius = "6px";
  tableContainer.style.marginBottom = "16px";
  modal.appendChild(tableContainer);
  
  // Get columns
  const columns = getColumnsForPreview(project, type);
  if (!columns) {
    overlay.remove();
    return;
  }
  
  // Get rows with metadata
  const rows = getRowsFromData(project, data, type);
  
  // Create Tabulator
  const previewTable = new Tabulator(tableContainer, {
    data: rows,
    columns: columns,
    layout: "fitDataFill",
    height: "100%",
    headerFilterPlaceholder: "Filter...",
  });
  
  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  btnRow.style.marginTop = "16px";
  
  const importBtn = document.createElement("button");
  importBtn.className = "tab-modal-btn tab-modal-confirm";
  importBtn.textContent = "Importera valda";
  importBtn.onclick = () => {
    const allRows = previewTable.getData();
    const selectedRows = allRows.filter(row => row._selected === true);
    
    if (selectedRows.length === 0) {
      alert("Välj minst en rad att importera");
      return;
    }
    
    // Validate parent selection for items/tasks
    if (type === "item" || type === "task") {
      const missingParent = selectedRows.some(row => !row._parentId);
      if (missingParent) {
        alert("Alla valda rader måste ha en parent vald. Klicka på parent-cellen och välj från dropdownen.");
        return;
      }
    }
    
    overlay.remove();
    onConfirm(selectedRows, type);
  };
  btnRow.appendChild(importBtn);
  
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "tab-modal-btn tab-modal-cancel";
  cancelBtn.textContent = "Avbryt";
  cancelBtn.onclick = () => overlay.remove();
  btnRow.appendChild(cancelBtn);
  
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/**
 * Import a single row with ID regeneration
 */
function importSingleRow(project, data, type, tables) {
  const parentId = data._parentId; // Parent selected in preview
  const withNewIds = regenerateIds(project, data, type, parentId);
  
  switch(type) {
    case 'part':
    case 'project':
      project.prt_parts.push(withNewIds);
      ajaxHandler.queuedEchoAjax({ 
        action: "importPart", 
        prt_id: withNewIds.prt_id, 
        prt_name: withNewIds.prt_name 
      });
      break;
      
    case 'item':
      const targetPart = project.prt_parts.find(p => p.prt_id === parentId);
      if (!targetPart) {
        console.error("Target part not found:", parentId);
        return;
      }
      if (!targetPart.prt_items) targetPart.prt_items = [];
      targetPart.prt_items.push(withNewIds);
      ajaxHandler.queuedEchoAjax({ 
        action: "importItem", 
        itm_id: withNewIds.itm_id, 
        itm_name: withNewIds.itm_name,
        prt_id: targetPart.prt_id
      });
      break;
      
    case 'task':
      let targetItem = null;
      for (const part of project.prt_parts || []) {
        targetItem = (part.prt_items || []).find(i => i.itm_id === parentId);
        if (targetItem) break;
      }
      if (!targetItem) {
        console.error("Target item not found:", parentId);
        return;
      }
      if (!targetItem.itm_tasks) targetItem.itm_tasks = [];
      targetItem.itm_tasks.push(withNewIds);
      ajaxHandler.queuedEchoAjax({ 
        action: "importTask", 
        tsk_id: withNewIds.tsk_id, 
        tsk_name: withNewIds.tsk_name,
        itm_id: targetItem.itm_id
      });
      break;
  }
}

/**
 * Main import handler
 * @param {Object} project - Project object
 * @param {string} jsonString - JSON string to import
 * @param {Object} tables - { partTable, itemTable }
 * @param {Function} updatePartOptions - Function to update part options
 * @param {Function} applyPartFilter - Function to apply part filter
 */
export function handleImport(project, jsonString, tables, updatePartOptions, applyPartFilter) {
  try {
    const rawData = JSON.parse(jsonString);
    const type = detectImportType(rawData);
    
    const validation = validateImportData(rawData, type);
    if (!validation.valid) {
      alert("Importfel:\n" + validation.errors.join("\n"));
      return;
    }
    
    const cleanedData = stripParentIdsAndTotals(rawData, type);
    
    showImportPreview(project, cleanedData, type, (selectedRows, importType) => {
      selectedRows.forEach(row => {
        importSingleRow(project, row, importType, tables);
      });
      
      calcUtils.updateAllData(project);
      
      tables.partTable.setData(project.prt_parts);
      tables.itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
      if (updatePartOptions) updatePartOptions();
      if (applyPartFilter) applyPartFilter();
      
      alert(`Import slutförd! ${selectedRows.length} ${importType}(s) importerade.`);
    });
    
  } catch (error) {
    console.error("Import error:", error);
    alert("Importfel: " + error.message);
  }
}

/**
 * Show import dialog with file upload or paste
 * @param {Object} project - Project object
 * @param {Object} tables - { partTable, itemTable }
 * @param {Function} updatePartOptions - Function to update part options
 * @param {Function} applyPartFilter - Function to apply part filter
 */
export function showImportDialog(project, tables, updatePartOptions, applyPartFilter) {
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "600px";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = "Importera Data";
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Importera Parts, Items eller Tasks från JSON.</strong><br>
    • Välj vilka rader som ska importeras i förhandsgranskningen<br>
    • Välj parent för Items/Tasks direkt i tabellen<br>
    • Parent-ID från fil ignoreras alltid<br>
    • Nya ID:n genereras automatiskt<br>
    • Totalsummor räknas om
  `;
  info.style.fontSize = "14px";
  info.style.marginBottom = "16px";
  modal.appendChild(info);
  
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.style.marginBottom = "16px";
  fileInput.style.display = "block";
  modal.appendChild(fileInput);
  
  const orText = document.createElement("p");
  orText.textContent = "ELLER klistra in JSON:";
  orText.style.fontWeight = "bold";
  orText.style.marginTop = "16px";
  modal.appendChild(orText);
  
  const textarea = document.createElement("textarea");
  textarea.className = "tab-modal-textarea";
  textarea.placeholder = "Klistra in JSON här...";
  textarea.rows = 10;
  textarea.style.width = "100%";
  textarea.style.fontFamily = "monospace";
  textarea.style.fontSize = "12px";
  modal.appendChild(textarea);
  
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      textarea.value = event.target.result;
    };
    reader.readAsText(file);
  });
  
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  
  const importBtn = document.createElement("button");
  importBtn.className = "tab-modal-btn tab-modal-confirm";
  importBtn.textContent = "Förhandsgranska";
  importBtn.onclick = () => {
    const jsonString = textarea.value.trim();
    if (!jsonString) {
      alert("Vänligen välj en fil eller klistra in JSON");
      return;
    }
    overlay.remove();
    handleImport(project, jsonString, tables, updatePartOptions, applyPartFilter);
  };
  btnRow.appendChild(importBtn);
  
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "tab-modal-btn tab-modal-cancel";
  cancelBtn.textContent = "Avbryt";
  cancelBtn.onclick = () => overlay.remove();
  btnRow.appendChild(cancelBtn);
  
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

export default {
  detectImportType,
  validateImportData,
  stripParentIdsAndTotals,
  regenerateIds,
  showImportPreview,
  handleImport,
  showImportDialog
};
