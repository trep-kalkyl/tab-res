// ImportModule.js
// Handles import of Parts, Items, and Tasks with preview, row selection, parent selection, and ID regeneration

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
 * Shows parent selection dialog for items or tasks
 * @param {Object} project - Project object
 * @param {string} type - "item" or "task"
 * @param {Function} onSelect - Callback with selected parent ID
 */
function showParentSelectionDialog(project, type, onSelect) {
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 100000; // Higher than preview modal
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "500px";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = type === "item" ? "Välj Parent (Part)" : "Välj Parent (Item)";
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.textContent = `Parent-ID från importfilen ignoreras. Välj ${type === "item" ? "Part" : "Item"} att importera till:`;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);
  
  // Get available parents
  let parents = [];
  if (type === "item") {
    parents = project.prt_parts || [];
  } else if (type === "task") {
    // Get all items from all parts
    (project.prt_parts || []).forEach(part => {
      (part.prt_items || []).forEach(item => {
        parents.push({ ...item, partName: part.prt_name });
      });
    });
  }
  
  if (parents.length === 0) {
    const warning = document.createElement("p");
    warning.textContent = `Ingen ${type === "item" ? "Part" : "Item"} hittades. Skapa en först!`;
    warning.style.color = "red";
    warning.style.fontWeight = "bold";
    modal.appendChild(warning);
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-modal-btn tab-modal-cancel";
    closeBtn.textContent = "Stäng";
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return;
  }
  
  // Create parent selection dropdown
  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.padding = "10px";
  select.style.fontSize = "14px";
  select.style.marginBottom = "16px";
  select.style.border = "1px solid #ddd";
  select.style.borderRadius = "6px";
  
  parents.forEach(parent => {
    const option = document.createElement("option");
    if (type === "item") {
      option.value = parent.prt_id;
      option.textContent = `${parent.prt_name} (ID: ${parent.prt_id})`;
    } else {
      option.value = parent.itm_id;
      option.textContent = `${parent.itm_name} (Part: ${parent.partName}, ID: ${parent.itm_id})`;
    }
    select.appendChild(option);
  });
  
  modal.appendChild(select);
  
  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "tab-modal-btn tab-modal-confirm";
  confirmBtn.textContent = "Välj";
  confirmBtn.onclick = () => {
    const selectedId = parseInt(select.value);
    overlay.remove();
    onSelect(selectedId);
  };
  btnRow.appendChild(confirmBtn);
  
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
 * Shows import preview modal with row selection
 * @param {Object} project - Project object
 * @param {Object} data - Import data
 * @param {string} type - Import type
 * @param {Function} onConfirm - Callback with selected rows and parent ID
 */
export function showImportPreview(project, data, type, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "800px";
  modal.style.width = "90%";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = `Förhandsgranska import: ${type}`;
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Välj rader att importera</strong><br>
    ${type !== "part" ? `• Du måste välja parent för varje rad<br>` : ""}
    • Parent-ID från importfilen ignoreras<br>
    • Nya ID:n genereras automatiskt<br>
    • Totalsummor räknas om
  `;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);
  
  // Preview table
  const tableContainer = document.createElement("div");
  tableContainer.style.maxHeight = "400px";
  tableContainer.style.overflowY = "auto";
  tableContainer.style.border = "1px solid #ddd";
  tableContainer.style.borderRadius = "6px";
  tableContainer.style.marginBottom = "16px";
  
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.background = "#f5f5f5";
  
  const selectAllTh = document.createElement("th");
  selectAllTh.style.padding = "10px";
  selectAllTh.style.textAlign = "center";
  const selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllCheckbox.checked = true;
  selectAllTh.appendChild(selectAllCheckbox);
  headerRow.appendChild(selectAllTh);
  
  const columns = getColumnsForType(type);
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.title;
    th.style.padding = "10px";
    th.style.textAlign = "left";
    th.style.borderBottom = "2px solid #ddd";
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement("tbody");
  const rows = getRowsFromData(data, type);
  const checkboxes = [];
  
  rows.forEach((rowData, idx) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #eee";
    if (idx % 2 === 0) tr.style.background = "#fafafa";
    
    const selectTd = document.createElement("td");
    selectTd.style.padding = "10px";
    selectTd.style.textAlign = "center";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.index = idx;
    checkboxes.push(checkbox);
    selectTd.appendChild(checkbox);
    tr.appendChild(selectTd);
    
    columns.forEach(col => {
      const td = document.createElement("td");
      td.style.padding = "10px";
      td.textContent = rowData[col.field] || "-";
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  modal.appendChild(tableContainer);
  
  selectAllCheckbox.addEventListener("change", () => {
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
  });
  
  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  
  const importBtn = document.createElement("button");
  importBtn.className = "tab-modal-btn tab-modal-confirm";
  importBtn.textContent = "Importera valda";
  importBtn.onclick = () => {
    const selectedIndices = checkboxes
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.index));
    
    if (selectedIndices.length === 0) {
      alert("Välj minst en rad att importera");
      return;
    }
    
    const selectedRows = selectedIndices.map(idx => rows[idx]);
    
    // For items and tasks, show parent selection dialog
    if (type === "item" || type === "task") {
      overlay.remove();
      showParentSelectionDialog(project, type, (parentId) => {
        onConfirm(selectedRows, type, parentId);
      });
    } else {
      // Parts don't need parent selection
      overlay.remove();
      onConfirm(selectedRows, type, null);
    }
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
 * Get columns for preview table based on type
 */
function getColumnsForType(type) {
  switch(type) {
    case 'part':
      return [
        { title: "Part ID (kommer ändras)", field: "prt_id" },
        { title: "Namn", field: "prt_name" },
        { title: "Antal Items", field: "itemCount" }
      ];
    case 'item':
      return [
        { title: "Item ID (kommer ändras)", field: "itm_id" },
        { title: "Namn", field: "itm_name" },
        { title: "Kategori", field: "itm_category" },
        { title: "Antal", field: "itm_quantity" },
        { title: "Antal Tasks", field: "taskCount" }
      ];
    case 'task':
      return [
        { title: "Task ID (kommer ändras)", field: "tsk_id" },
        { title: "Namn", field: "tsk_name" },
        { title: "Quantity", field: "tsk_total_quantity" }
      ];
    case 'project':
      return [
        { title: "Part ID (kommer ändras)", field: "prt_id" },
        { title: "Namn", field: "prt_name" },
        { title: "Antal Items", field: "itemCount" }
      ];
    default:
      return [];
  }
}

/**
 * Extract rows from data for preview
 */
function getRowsFromData(data, type) {
  if (type === 'project' && data.prt_parts) {
    return data.prt_parts.map(part => ({
      ...part,
      itemCount: part.prt_items ? part.prt_items.length : 0
    }));
  }
  
  if (Array.isArray(data)) {
    return data.map(item => {
      if (type === 'item') {
        return {
          ...item,
          taskCount: item.itm_tasks ? item.itm_tasks.length : 0
        };
      }
      return item;
    });
  }
  
  // Single entity
  if (type === 'item') {
    return [{
      ...data,
      taskCount: data.itm_tasks ? data.itm_tasks.length : 0
    }];
  }
  
  return [data];
}

/**
 * Import a single row with ID regeneration
 */
function importSingleRow(project, data, type, parentId, tables) {
  const withNewIds = regenerateIds(project, data, type, parentId);
  
  switch(type) {
    case 'part':
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
        alert("Vald Part hittades inte");
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
      // Find item in any part
      let targetItem = null;
      for (const part of project.prt_parts || []) {
        targetItem = (part.prt_items || []).find(i => i.itm_id === parentId);
        if (targetItem) break;
      }
      if (!targetItem) {
        alert("Vald Item hittades inte");
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
      
    case 'project':
      project.prt_parts.push(withNewIds);
      ajaxHandler.queuedEchoAjax({ 
        action: "importPart", 
        prt_id: withNewIds.prt_id, 
        prt_name: withNewIds.prt_name 
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
    
    showImportPreview(project, cleanedData, type, (selectedRows, importType, parentId) => {
      selectedRows.forEach(row => {
        importSingleRow(project, row, importType, parentId, tables);
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
    • Välj vilka rader som ska importeras<br>
    • <strong>För Items/Tasks: Välj parent efter förhandsgranskning</strong><br>
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
