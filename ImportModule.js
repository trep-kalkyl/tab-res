// ImportModule.js
// Handles import of Parts, Items, and Tasks with separated preview and parent selection

import * as calcUtils from "./projectCalcUtils.js";
import * as ajaxHandler from "./ajaxHandler.js";

/**
 * Detects import type from JSON structure
 */
export function detectImportType(data) {
  if (!data || typeof data !== 'object') return 'unknown';
  
  if (data.prt_id !== undefined && data.prt_name !== undefined) return 'part';
  if (data.itm_id !== undefined && data.itm_name !== undefined) return 'item';
  if (data.tsk_id !== undefined && data.tsk_name !== undefined) return 'task';
  if (data.prt_parts && Array.isArray(data.prt_parts)) return 'project';
  
  return 'unknown';
}

/**
 * Validates import data structure
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
 * VIKTIGT: Parent-ID tas ALLTID bort, oavsett om de finns i importen
 */
export function stripParentIdsAndTotals(data, type) {
  const cleaned = JSON.parse(JSON.stringify(data));
  
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
    case 'task': return cleanTask(cleaned);
    case 'item': return cleanItem(cleaned);
    case 'part': return cleanPart(cleaned);
    case 'project':
      if (cleaned.prt_parts && Array.isArray(cleaned.prt_parts)) {
        cleaned.prt_parts = cleaned.prt_parts.map(cleanPart);
      }
      return cleaned;
    default: return cleaned;
  }
}

/**
 * Regenerates all IDs in import data
 */
export function regenerateIds(project, data, type, parentId = null) {
  const withNewIds = JSON.parse(JSON.stringify(data));
  
  function regenerateTaskIds(item) {
    if (item.itm_tasks && Array.isArray(item.itm_tasks)) {
      item.itm_tasks = item.itm_tasks.map(task => {
        const newTaskId = calcUtils.getNextTaskId(project);
        task.tsk_id = newTaskId;
        task.tsk_itm_id = item.itm_id;
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
        item.itm_prt_id = part.prt_id;
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
      withNewIds.tsk_itm_id = parentId;
      return withNewIds;
    case 'item':
      withNewIds.itm_id = calcUtils.getNextItemId(project);
      withNewIds.itm_prt_id = parentId;
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
 * Get available parents for selection
 */
function getParentOptions(project, type) {
  if (type === "item") {
    return (project.prt_parts || []).map(part => ({
      id: part.prt_id,
      name: part.prt_name,
      displayName: `${part.prt_name} (ID: ${part.prt_id})`
    }));
  } else if (type === "task") {
    const items = [];
    (project.prt_parts || []).forEach(part => {
      (part.prt_items || []).forEach(item => {
        items.push({
          id: item.itm_id,
          name: item.itm_name,
          displayName: `${item.itm_name} (Part: ${part.prt_name})`,
          partName: part.prt_name
        });
      });
    });
    return items;
  }
  return [];
}

/**
 * STEG 1: Förhandsgranska och välj rader (rad-exkludering)
 * Visar data-förhandsgranskning där användaren kan välja vilka rader att importera
 */
function showPreviewTable(project, data, type, onContinue) {
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
  title.textContent = `Steg 1: Förhandsgranska ${type} - Välj rader att importera`;
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Välj vilka rader du vill importera:</strong><br>
    • Klicka i checkboxen för att välja/avmarkera rader<br>
    • Redigera fält direkt i tabellen om du vill<br>
    • Använd filter och sortering för att hitta rätt rader<br>
    • Parent-ID från importfilen är redan borttagna<br>
    • Nästa steg: Välj parent för varje rad
  `;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);
  
  const tableContainer = document.createElement("div");
  tableContainer.style.flex = "1";
  tableContainer.style.minHeight = "300px";
  tableContainer.style.maxHeight = "500px";
  tableContainer.style.overflow = "auto";
  tableContainer.style.border = "1px solid #ddd";
  tableContainer.style.borderRadius = "6px";
  tableContainer.style.marginBottom = "16px";
  modal.appendChild(tableContainer);
  
  // Prepare rows
  let rows = [];
  if (type === 'project' && data.prt_parts) {
    rows = data.prt_parts;
  } else if (Array.isArray(data)) {
    rows = data;
  } else {
    rows = [data];
  }
  
  rows = rows.map(row => ({
    ...row,
    _selected: true,
    _itemCount: row.prt_items ? row.prt_items.length : undefined,
    _taskCount: row.itm_tasks ? row.itm_tasks.length : undefined
  }));
  
  // Define columns based on type
  let columns = [
    {
      title: "Importera",
      field: "_selected",
      formatter: "tickCross",
      width: 80,
      hozAlign: "center",
      headerSort: false,
      editor: true
    }
  ];
  
  switch(type) {
    case 'part':
    case 'project':
      columns.push(
        { title: "Namn", field: "prt_name", editor: "input", headerFilter: "input" },
        { title: "Antal Items", field: "_itemCount", width: 120 }
      );
      break;
    case 'item':
      columns.push(
        { title: "Namn", field: "itm_name", editor: "input", headerFilter: "input" },
        { title: "Kategori", field: "itm_category", editor: "input", headerFilter: "input" },
        { title: "Antal", field: "itm_quantity", editor: "number" },
        { title: "Antal Tasks", field: "_taskCount", width: 120 }
      );
      break;
    case 'task':
      columns.push(
        { title: "Namn", field: "tsk_name", editor: "input", headerFilter: "input" },
        { title: "Quantity", field: "tsk_total_quantity", editor: "number" },
        { title: "Material Amount", field: "tsk_material_amount", editor: "number" }
      );
      break;
  }
  
  const previewTable = new Tabulator(tableContainer, {
    data: rows,
    columns: columns,
    layout: "fitDataFill",
    height: "100%"
  });
  
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  btnRow.style.marginTop = "16px";
  
  const continueBtn = document.createElement("button");
  continueBtn.className = "tab-modal-btn tab-modal-confirm";
  continueBtn.textContent = type === "part" || type === "project" ? "Importera" : "Nästa: Välj Parent";
  continueBtn.onclick = () => {
    const allRows = previewTable.getData();
    const selectedRows = allRows.filter(row => row._selected === true);
    
    if (selectedRows.length === 0) {
      alert("Välj minst en rad att importera");
      return;
    }
    
    overlay.remove();
    onContinue(selectedRows);
  };
  btnRow.appendChild(continueBtn);
  
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
 * STEG 2: Välj parent för varje rad
 * Visa en rad i taget, välj parent med kryssrutor
 */
function showParentSelectionTable(project, selectedRows, type, onConfirm) {
  const parentOptions = getParentOptions(project, type);
  
  if (parentOptions.length === 0) {
    alert(`Ingen ${type === "item" ? "Part" : "Item"} hittades. Skapa en först innan import!`);
    return;
  }
  
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "700px";
  modal.style.width = "90%";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = `Välj Parent för ${type}`;
  modal.appendChild(title);
  
  // State management
  let currentRowIndex = 0;
  const rowParentMap = new Map(); // rowIndex -> parentId
  
  // Current row display
  const currentRowDiv = document.createElement("div");
  currentRowDiv.style.padding = "16px";
  currentRowDiv.style.background = "#f8f9fa";
  currentRowDiv.style.borderRadius = "6px";
  currentRowDiv.style.marginBottom = "16px";
  modal.appendChild(currentRowDiv);
  
  // Parent selection table container
  const parentTableDiv = document.createElement("div");
  parentTableDiv.style.maxHeight = "400px";
  parentTableDiv.style.overflow = "auto";
  parentTableDiv.style.border = "1px solid #ddd";
  parentTableDiv.style.borderRadius = "6px";
  parentTableDiv.style.marginBottom = "16px";
  modal.appendChild(parentTableDiv);
  
  // Parent selection table
  const parentColumns = [
    {
      title: "Välj",
      field: "_selected",
      formatter: "tickCross",
      width: 80,
      hozAlign: "center",
      headerSort: false
    },
    {
      title: type === "item" ? "Part Namn" : "Item Namn",
      field: "displayName",
      headerFilter: "input"
    }
  ];
  
  const parentTable = new Tabulator(parentTableDiv, {
    data: parentOptions.map(p => ({ ...p, _selected: false })), // Sätt initial data här!
    columns: parentColumns,
    layout: "fitDataFill",
    height: "350px"
  });
  
  // Click on parent row to select
  parentTable.on("rowClick", (e, row) => {
    const parentData = row.getData();
    
    // Save selection
    rowParentMap.set(currentRowIndex, parentData.id);
    
    // Update checkboxes
    const allParents = parentTable.getData();
    allParents.forEach((p, idx) => {
      parentTable.getRows()[idx].update({
        ...p,
        _selected: p.id === parentData.id
      });
    });
    
    // Move to next row automatically
    setTimeout(() => {
      if (currentRowIndex < selectedRows.length - 1) {
        nextBtn.click();
      } else {
        // Last row - enable finish button
        finishBtn.disabled = false;
        finishBtn.style.opacity = "1";
      }
    }, 300);
  });
  
  // Function to render current row
  function renderCurrentRow() {
    const currentRow = selectedRows[currentRowIndex];
    const rowName = type === "item" ? currentRow.itm_name : currentRow.tsk_name;
    
    currentRowDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 18px;">${rowName}</strong>
          <div style="color: #666; margin-top: 4px;">Rad ${currentRowIndex + 1} av ${selectedRows.length}</div>
        </div>
        <div style="font-size: 14px; color: ${rowParentMap.has(currentRowIndex) ? '#00b894' : '#d63031'};">
          ${rowParentMap.has(currentRowIndex) ? '✓ Parent vald' : '⚠️ Välj parent nedan'}
        </div>
      </div>
    `;
    
    // Update parent table checkboxes based on selection
    const parentsData = parentOptions.map(p => ({
      ...p,
      _selected: rowParentMap.get(currentRowIndex) === p.id
    }));
    parentTable.setData(parentsData);
  }
  
  // Navigation buttons
  const navRow = document.createElement("div");
  navRow.style.display = "flex";
  navRow.style.justifyContent = "space-between";
  navRow.style.marginBottom = "16px";
  
  const prevBtn = document.createElement("button");
  prevBtn.className = "tab-modal-btn";
  prevBtn.textContent = "← Föregående";
  prevBtn.disabled = true;
  prevBtn.onclick = () => {
    if (currentRowIndex > 0) {
      currentRowIndex--;
      renderCurrentRow();
      prevBtn.disabled = currentRowIndex === 0;
      nextBtn.disabled = false;
    }
  };
  navRow.appendChild(prevBtn);
  
  const nextBtn = document.createElement("button");
  nextBtn.className = "tab-modal-btn tab-modal-confirm";
  nextBtn.textContent = "Nästa →";
  nextBtn.onclick = () => {
    if (!rowParentMap.has(currentRowIndex)) {
      alert("Välj en parent först!");
      return;
    }
    
    if (currentRowIndex < selectedRows.length - 1) {
      currentRowIndex++;
      renderCurrentRow();
      prevBtn.disabled = false;
      nextBtn.disabled = currentRowIndex === selectedRows.length - 1;
    }
  };
  navRow.appendChild(nextBtn);
  
  modal.appendChild(navRow);
  
  // Final buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  
  const finishBtn = document.createElement("button");
  finishBtn.className = "tab-modal-btn tab-modal-confirm";
  finishBtn.textContent = "Slutför Import";
  finishBtn.disabled = true;
  finishBtn.style.opacity = "0.5";
  finishBtn.onclick = () => {
    // Check all rows have parent
    for (let i = 0; i < selectedRows.length; i++) {
      if (!rowParentMap.has(i)) {
        alert(`Rad ${i + 1} saknar parent! Gå tillbaka och välj.`);
        return;
      }
    }
    
    // Add parent to each row
    const rowsWithParent = selectedRows.map((row, idx) => ({
      ...row,
      _parentId: rowParentMap.get(idx)
    }));
    
    overlay.remove();
    onConfirm(rowsWithParent);
  };
  btnRow.appendChild(finishBtn);
  
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "tab-modal-btn tab-modal-cancel";
  cancelBtn.textContent = "Avbryt";
  cancelBtn.onclick = () => overlay.remove();
  btnRow.appendChild(cancelBtn);
  
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Initialize first row - VIKTIGT: Kör efter DOM är redo
  setTimeout(() => renderCurrentRow(), 100);
}

/**
 * Import a single row with ID regeneration
 */
function importSingleRow(project, data, type, tables) {
  const parentId = data._parentId;
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
 * Main import handler - orchestrates the two-step process
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
    
    // STEG 1: Förhandsgranska och välj rader
    showPreviewTable(project, cleanedData, type, (selectedRows) => {
      
      // För Parts: Importera direkt (ingen parent behövs)
      if (type === "part" || type === "project") {
        selectedRows.forEach(row => {
          importSingleRow(project, row, type, tables);
        });
        
        calcUtils.updateAllData(project);
        tables.partTable.setData(project.prt_parts);
        tables.itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
        if (updatePartOptions) updatePartOptions();
        if (applyPartFilter) applyPartFilter();
        
        alert(`Import slutförd! ${selectedRows.length} ${type}(s) importerade.`);
        return;
      }
      
      // STEG 2: För Items/Tasks - välj parent
      showParentSelectionTable(project, selectedRows, type, (rowsWithParent) => {
        rowsWithParent.forEach(row => {
          importSingleRow(project, row, type, tables);
        });
        
        calcUtils.updateAllData(project);
        tables.partTable.setData(project.prt_parts);
        tables.itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
        if (updatePartOptions) updatePartOptions();
        if (applyPartFilter) applyPartFilter();
        
        alert(`Import slutförd! ${rowsWithParent.length} ${type}(s) importerade.`);
      });
    });
    
  } catch (error) {
    console.error("Import error:", error);
    alert("Importfel: " + error.message);
  }
}

/**
 * Show import dialog with file upload or paste
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
    <strong>Importera Parts, Items eller Tasks från JSON.</strong><br><br>
    <strong>Process:</strong><br>
    1. Välj JSON-fil eller klistra in JSON<br>
    2. Förhandsgranska och välj rader att importera<br>
    3. Välj parent för Items/Tasks (Parts importeras direkt)<br>
    4. Import genomförs med nya ID:n<br><br>
    <strong>Viktigt:</strong><br>
    • Parent-ID från fil ignoreras ALLTID<br>
    • Nya ID:n genereras automatiskt<br>
    • Totalsummor räknas om automatiskt
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
  importBtn.textContent = "Starta Import";
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
  handleImport,
  showImportDialog
};
