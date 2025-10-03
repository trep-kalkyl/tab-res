// ImportModule.js
// Handles import of Parts, Items, and Tasks with nested preview (expandable subtables for Items and Tasks),
// plus separated parent selection UI for Items/Tasks.
// Enhanced with drag & drop support and progress feedback.

import * as calcUtils from "./projectCalcUtils.js";
import * as ajaxHandler from "./ajaxHandler.js";

/** --- Utility Functions --- */
export function detectImportType(data) {
  if (!data || typeof data !== 'object') return 'unknown';
  if (data.prt_id !== undefined && data.prt_name !== undefined) return 'part';
  if (data.itm_id !== undefined && data.itm_name !== undefined) return 'item';
  if (data.tsk_id !== undefined && data.tsk_name !== undefined) return 'task';
  if (data.prt_parts && Array.isArray(data.prt_parts)) return 'project';
  return 'unknown';
}

export function validateImportData(data, type) {
  const errors = [];
  if (!data) { errors.push("Ingen data att importera"); return { valid: false, errors }; }
  switch(type) {
    case 'part': if (!data.prt_name) errors.push("Part måste ha ett namn (prt_name)"); break;
    case 'item': if (!data.itm_name) errors.push("Item måste ha ett namn (itm_name)"); break;
    case 'task': if (!data.tsk_name) errors.push("Task måste ha ett namn (tsk_name)"); break;
    case 'project': if (!data.prt_parts || !Array.isArray(data.prt_parts)) errors.push("Project måste innehålla prt_parts array"); break;
    case 'unknown': errors.push("Okänd importtyp - kontrollera JSON-strukturen"); break;
  }
  return { valid: errors.length === 0, errors };
}

export function stripParentIdsAndTotals(data, type) {
  const cleaned = JSON.parse(JSON.stringify(data));
  function cleanTask(task) { delete task.tsk_itm_id; delete task.tsk_material_user_price_total; delete task.tsk_work_task_duration_total; return task; }
  function cleanItem(item) { delete item.itm_prt_id; delete item.itm_material_user_price; delete item.itm_work_task_duration; delete item.itm_material_user_price_total; delete item.itm_work_task_duration_total; if (item.itm_tasks && Array.isArray(item.itm_tasks)) item.itm_tasks = item.itm_tasks.map(cleanTask); return item; }
  function cleanPart(part) { delete part.prt_prj_id; delete part.prt_material_user_price_total; delete part.prt_work_task_duration_total; if (part.prt_items && Array.isArray(part.prt_items)) part.prt_items = part.prt_items.map(cleanItem); return part; }
  switch(type) {
    case 'task': return cleanTask(cleaned);
    case 'item': return cleanItem(cleaned);
    case 'part': return cleanPart(cleaned);
    case 'project': if (cleaned.prt_parts && Array.isArray(cleaned.prt_parts)) cleaned.prt_parts = cleaned.prt_parts.map(cleanPart); return cleaned;
    default: return cleaned;
  }
}

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
    case 'task': withNewIds.tsk_id = calcUtils.getNextTaskId(project); withNewIds.tsk_itm_id = parentId; return withNewIds;
    case 'item': withNewIds.itm_id = calcUtils.getNextItemId(project); withNewIds.itm_prt_id = parentId; regenerateTaskIds(withNewIds); return withNewIds;
    case 'part': return regeneratePartIds(withNewIds);
    case 'project': if (withNewIds.prt_parts && Array.isArray(withNewIds.prt_parts)) withNewIds.prt_parts = withNewIds.prt_parts.map(regeneratePartIds); return withNewIds;
    default: return withNewIds;
  }
}

function getParentOptions(project, type) {
  if (type === "item") {
    return (project.prt_parts || []).map(part => ({ id: part.prt_id, name: part.prt_name, displayName: `${part.prt_name} (ID: ${part.prt_id})` }));
  } else if (type === "task") {
    const items = [];
    (project.prt_parts || []).forEach(part => {
      (part.prt_items || []).forEach(item => {
        items.push({ id: item.itm_id, name: item.itm_name, partId: part.prt_id, partName: part.prt_name, displayName: `${item.itm_name} (ID: ${item.itm_id})` });
      });
    });
    return items;
  }
  return [];
}

/** --- PROGRESS FEEDBACK --- */
function showProgressIndicator(current, total, itemName) {
  let progressEl = document.getElementById('import-progress');
  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.id = 'import-progress';
    progressEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100000;
      min-width: 280px;
    `;
    document.body.appendChild(progressEl);
  }
  
  const percentage = Math.round((current / total) * 100);
  progressEl.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold;">Importerar...</div>
    <div style="background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
      <div style="background: #4a90e2; height: 6px; width: ${percentage}%; transition: width 0.3s;"></div>
    </div>
    <div style="font-size: 13px; color: #666;">
      ${current}/${total} - ${itemName}
    </div>
  `;
  
  if (current >= total) {
    setTimeout(() => {
      if (progressEl && progressEl.parentNode) {
        progressEl.parentNode.removeChild(progressEl);
      }
    }, 1500);
  }
}

/** --- DRAG & DROP SUPPORT --- */
function setupDragDrop(textarea, fileInput) {
  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  dropZone.style.cssText = `
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    margin-bottom: 16px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  dropZone.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 12px;">📁</div>
    <div style="font-weight: bold; margin-bottom: 8px;">Dra och släpp JSON-fil här</div>
    <div style="color: #666; font-size: 14px;">eller klicka för att välja fil</div>
  `;
  
  // Insert before textarea
  textarea.parentNode.insertBefore(dropZone, textarea);
  
  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4a90e2';
    dropZone.style.background = '#f0f8ff';
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ddd';
    dropZone.style.background = '#fafafa';
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ddd';
    dropZone.style.background = '#fafafa';
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        textarea.value = event.target.result;
        // Visual feedback
        dropZone.style.borderColor = '#28a745';
        dropZone.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 12px;">✅</div>
          <div style="color: #28a745; font-weight: bold;">Fil laddad: ${files[0].name}</div>
        `;
        setTimeout(() => {
          dropZone.style.borderColor = '#ddd';
          dropZone.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 12px;">📁</div>
            <div style="font-weight: bold; margin-bottom: 8px;">Dra och släpp JSON-fil här</div>
            <div style="color: #666; font-size: 14px;">eller klicka för att välja fil</div>
          `;
        }, 2000);
      };
      reader.readAsText(files[0]);
    } else {
      dropZone.style.borderColor = '#dc3545';
      dropZone.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
        <div style="color: #dc3545; font-weight: bold;">Endast JSON-filer tillåtna</div>
      `;
      setTimeout(() => {
        dropZone.style.borderColor = '#ddd';
        dropZone.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 12px;">📁</div>
          <div style="font-weight: bold; margin-bottom: 8px;">Dra och släpp JSON-fil här</div>
          <div style="color: #666; font-size: 14px;">eller klicka för att välja fil</div>
        `;
      }, 2000);
    }
  });
}

/** --- NESTED PREVIEW: Parts → Items → Tasks --- */
function showNestedPreview(project, data, type, onContinue) {
  const overlay = document.createElement("div");
  overlay.className = "tab-modal-overlay active";
  overlay.style.zIndex = 99999;
  
  const modal = document.createElement("div");
  modal.className = "tab-modal-content";
  modal.style.maxWidth = "95%";
  modal.style.width = "1200px";
  modal.style.maxHeight = "95vh";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = `Steg 1: Förhandsgranska import (nestad vy) - Välj rader att importera`;
  modal.appendChild(title);
  
  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Välj vilka rader du vill importera:</strong><br>
    • Expandera rader för att se Items/Tasks<br>
    • Kryssa i/ur "Importera" på valfri nivå<br>
    • Namnfält är redigerbara<br>
    • Parent-ID från importfilen är redan borttagna
  `;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);
  
  const tableContainer = document.createElement("div");
  tableContainer.style.flex = "1";
  tableContainer.style.minHeight = "350px";
  tableContainer.style.maxHeight = "600px";
  tableContainer.style.overflow = "auto";
  tableContainer.style.border = "1px solid #ddd";
  tableContainer.style.borderRadius = "6px";
  tableContainer.style.marginBottom = "16px";
  modal.appendChild(tableContainer);

  let rows = [];
  if (type === 'project' && data.prt_parts) rows = data.prt_parts;
  else if (type === "part" && Array.isArray(data)) rows = data;
  else if (type === "part") rows = [data];
  else if (type === "item" && Array.isArray(data)) rows = data;
  else if (type === "item") rows = [data];
  else if (type === "task" && Array.isArray(data)) rows = data;
  else if (type === "task") rows = [data];
  else rows = [data];

  // Store references to all nested tables for data collection
  const nestedTables = new Map(); // For Parts: partId -> { itemsTable, taskTables }
  const itemTaskTables = new Map(); // For Items: itemId -> taskTable

  let previewTable;
  
  // TASK COLUMNS (återanvändbar definition)
  const taskColumns = [
    { title: "Importera", field: "_selected", formatter: "tickCross", width: 60, hozAlign: "center", editor: true },
    { title: "Task-namn", field: "tsk_name", editor: "input", headerFilter: "input" },
    { title: "Quantity", field: "tsk_total_quantity", editor: "number" },
    { title: "Material Amount", field: "tsk_material_amount", editor: "number" },
    { title: "Stage", field: "tsk_construction_stage", editor: "input" }
  ];

  if (type === "item") {
    // ITEM IMPORT MED NESTED TASKS
    const itemColumns = [
      { title: "Importera", field: "_selected", formatter: "tickCross", width: 60, hozAlign: "center", editor: true },
      { title: "Expand", field: "expand_tasks", formatter: (cell) => "▶", width: 50, hozAlign: "center",
        cellClick: (e, cell) => {
          const row = cell.getRow();
          const holder = row.getElement().querySelector(".subtable-holder");
          if (!holder) return;
          holder.style.display = holder.style.display === "block" ? "none" : "block";
          cell.getElement().textContent = holder.style.display === "block" ? "▼" : "▶";
        } },
      { title: "Item-namn", field: "itm_name", editor: "input", headerFilter: "input" },
      { title: "Kategori", field: "itm_category", editor: "input" },
      { title: "Antal", field: "itm_quantity", editor: "number" },
      { title: "Antal Tasks", field: "itm_tasks_count" }
    ];

    previewTable = new Tabulator(tableContainer, {
      data: rows.map(i => ({ ...i, _selected: true, itm_tasks_count: (i.itm_tasks || []).length })),
      columns: itemColumns,
      layout: "fitDataFill",
      height: "100%",
      rowFormatter: function(itemRow) {
        const itemData = itemRow.getData();
        const itemId = itemData.itm_id;
        
        let holder = itemRow.getElement().querySelector(".subtable-holder");
        if (!holder) {
          holder = document.createElement("div");
          holder.className = "subtable-holder";
          holder.style.display = "none";
          holder.style.marginLeft = "30px";
          itemRow.getElement().appendChild(holder);

          // Tasks subtable
          if (itemData.itm_tasks && itemData.itm_tasks.length > 0) {
            const tasksTableDiv = document.createElement("div");
            holder.appendChild(tasksTableDiv);
            
            const tasksTable = new Tabulator(tasksTableDiv, {
              data: itemData.itm_tasks.map(t => ({ ...t, _selected: true })),
              columns: taskColumns,
              layout: "fitDataFill",
              height: "100%",
            });
            
            // Store reference to task table
            itemTaskTables.set(itemId, tasksTable);
          }
        }
      }
    });
  } else if (type === "task") {
    // FLAT TASK IMPORT (ingen nesting)
    previewTable = new Tabulator(tableContainer, {
      data: rows.map(t => ({ ...t, _selected: true })),
      columns: taskColumns,
      layout: "fitDataFill",
      height: "100%"
    });
  } else {
    // NESTED: Parts > Items > Tasks (oförändrat)
    const itemColumns = [
      { title: "Importera", field: "_selected", formatter: "tickCross", width: 60, hozAlign: "center", editor: true },
      { title: "Expand", field: "expand_tasks", formatter: (cell) => "▶", width: 50, hozAlign: "center",
        cellClick: (e, cell) => {
          const row = cell.getRow();
          const holder = row.getElement().querySelector(".subtable-holder");
          if (!holder) return;
          holder.style.display = holder.style.display === "block" ? "none" : "block";
          cell.getElement().textContent = holder.style.display === "block" ? "▼" : "▶";
        } },
      { title: "Item-namn", field: "itm_name", editor: "input", headerFilter: "input" },
      { title: "Kategori", field: "itm_category", editor: "input" },
      { title: "Antal", field: "itm_quantity", editor: "number" }
    ];
    const partColumns = [
      { title: "Importera", field: "_selected", formatter: "tickCross", width: 60, hozAlign: "center", editor: true },
      { title: "Expand", field: "expand_items", formatter: (cell) => "▶", width: 50, hozAlign: "center",
        cellClick: (e, cell) => {
          const row = cell.getRow();
          const holder = row.getElement().querySelector(".subtable-holder");
          if (!holder) return;
          holder.style.display = holder.style.display === "block" ? "none" : "block";
          cell.getElement().textContent = holder.style.display === "block" ? "▼" : "▶";
        } },
      { title: "Part-namn", field: "prt_name", editor: "input", headerFilter: "input" },
      { title: "Antal Items", field: "prt_items_count" }
    ];

    previewTable = new Tabulator(tableContainer, {
      data: rows.map(p => ({ ...p, _selected: true, prt_items_count: (p.prt_items || []).length })),
      columns: partColumns,
      layout: "fitDataFill",
      height: "100%",
      rowFormatter: function(partRow) {
        const partData = partRow.getData();
        const partId = partData.prt_id;
        
        let holder = partRow.getElement().querySelector(".subtable-holder");
        if (!holder) {
          holder = document.createElement("div");
          holder.className = "subtable-holder";
          holder.style.display = "none";
          holder.style.marginLeft = "30px";
          partRow.getElement().appendChild(holder);

          // Items subtable
          if (partData.prt_items && partData.prt_items.length > 0) {
            const itemsTableDiv = document.createElement("div");
            holder.appendChild(itemsTableDiv);
            
            const itemsTable = new Tabulator(itemsTableDiv, {
              data: partData.prt_items.map(i => ({ ...i, _selected: true })),
              columns: itemColumns,
              layout: "fitDataFill",
              height: "100%",
              rowFormatter: function(itemRow) {
                const itemData = itemRow.getData();
                const itemId = itemData.itm_id;
                
                let taskHolder = itemRow.getElement().querySelector(".subtable-holder");
                if (!taskHolder) {
                  taskHolder = document.createElement("div");
                  taskHolder.className = "subtable-holder";
                  taskHolder.style.display = "none";
                  taskHolder.style.marginLeft = "30px";
                  itemRow.getElement().appendChild(taskHolder);
                  
                  // Tasks subtable
                  if (itemData.itm_tasks && itemData.itm_tasks.length > 0) {
                    const tasksTableDiv = document.createElement("div");
                    taskHolder.appendChild(tasksTableDiv);
                    
                    const tasksTable = new Tabulator(tasksTableDiv, {
                      data: itemData.itm_tasks.map(t => ({ ...t, _selected: true })),
                      columns: taskColumns,
                      layout: "fitDataFill",
                      height: "100%",
                    });
                    
                    // Store reference to task table
                    if (!nestedTables.has(partId)) {
                      nestedTables.set(partId, { itemsTable: null, taskTables: new Map() });
                    }
                    nestedTables.get(partId).taskTables.set(itemId, tasksTable);
                  }
                }
              }
            });
            
            // Store reference to items table
            if (!nestedTables.has(partId)) {
              nestedTables.set(partId, { itemsTable: null, taskTables: new Map() });
            }
            nestedTables.get(partId).itemsTable = itemsTable;
          }
        }
      }
    });
  }

  // --- Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  btnRow.style.marginTop = "16px";
  const continueBtn = document.createElement("button");
  continueBtn.className = "tab-modal-btn tab-modal-confirm";
  continueBtn.textContent = "Nästa";
  continueBtn.onclick = () => {
    let selectedRows = [];
    
    if (type === "task") {
      // FLAT TASK IMPORT
      selectedRows = previewTable.getData().filter(r => r._selected);
    } else if (type === "item") {
      // ITEM IMPORT MED NESTED TASKS
      const itemRows = previewTable.getData().filter(r => r._selected);
      
      itemRows.forEach(item => {
        const itemCopy = { ...item };
        const itemId = item.itm_id;
        
        // Hämta tasks från subtabell om den finns
        const taskTable = itemTaskTables.get(itemId);
        if (taskTable) {
          const tasksData = taskTable.getData();
          const selectedTasks = tasksData.filter(task => task._selected);
          itemCopy.itm_tasks = selectedTasks;
        } else {
          // Fallback till ursprunglig data om subtabell inte finns
          itemCopy.itm_tasks = (item.itm_tasks || []).filter(t => t._selected !== false);
        }
        
        selectedRows.push(itemCopy);
      });
    } else {
      // NESTED PARTS DATA COLLECTION (oförändrat)
      const partRows = previewTable.getData().filter(r => r._selected);
      
      partRows.forEach(part => {
        const partId = part.prt_id;
        const partCopy = { ...part };
        
        // Hämta items från subtabell om den finns
        const nestedTableData = nestedTables.get(partId);
        if (nestedTableData && nestedTableData.itemsTable) {
          const itemsData = nestedTableData.itemsTable.getData();
          const selectedItems = itemsData.filter(item => item._selected);
          
          partCopy.prt_items = selectedItems.map(item => {
            const itemCopy = { ...item };
            
            // Hämta tasks från subtabell om den finns
            const taskTable = nestedTableData.taskTables.get(item.itm_id);
            if (taskTable) {
              const tasksData = taskTable.getData();
              const selectedTasks = tasksData.filter(task => task._selected);
              itemCopy.itm_tasks = selectedTasks;
            } else {
              // Fallback till ursprunglig data om subtabell inte finns
              itemCopy.itm_tasks = (item.itm_tasks || []).filter(t => t._selected !== false);
            }
            
            return itemCopy;
          });
        } else {
          // Fallback till ursprunglig data om subtabell inte finns
          partCopy.prt_items = (part.prt_items || []).filter(i => i._selected !== false).map(item => ({
            ...item,
            itm_tasks: (item.itm_tasks || []).filter(t => t._selected !== false)
          }));
        }
        
        selectedRows.push(partCopy);
      });
    }
    
    if (selectedRows.length === 0) {
      alert("Välj minst en rad att importera");
      return;
    }
    
    // Debug log
    console.log("Selected rows for import:", selectedRows);
    selectedRows.forEach(row => {
      if (row.prt_items) {
        console.log(`Part ${row.prt_name} has ${row.prt_items.length} items`);
        row.prt_items.forEach(item => {
          console.log(`  Item ${item.itm_name} has ${(item.itm_tasks || []).length} tasks`);
        });
      } else if (row.itm_tasks) {
        console.log(`Item ${row.itm_name} has ${row.itm_tasks.length} tasks`);
      }
    });
    
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

/** --- FÖRENKLAD PARENT SELECTION (utan navigationsknappar) --- */
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
  modal.style.maxWidth = "800px";
  modal.style.width = "90%";
  
  const title = document.createElement("h3");
  title.className = "tab-modal-title";
  title.textContent = `Steg 2: Välj Parent för ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
  modal.appendChild(title);

  const info = document.createElement("p");
  info.innerHTML = `
    <strong>Välj parent för varje ${type}:</strong><br>
    • Klicka på en rad för att välja parent och gå till nästa<br>
    • Använd sökfiltret för att hitta rätt parent<br>
    • ${selectedRows.length} st ${type}s kommer att importeras
  `;
  info.style.marginBottom = "16px";
  info.style.fontSize = "14px";
  modal.appendChild(info);

  let currentRowIndex = 0;
  const rowParentMap = new Map();

  // Current row display
  const currentRowDiv = document.createElement("div");
  currentRowDiv.style.padding = "16px";
  currentRowDiv.style.background = "#f8f9fa";
  currentRowDiv.style.borderRadius = "6px";
  currentRowDiv.style.marginBottom = "16px";
  modal.appendChild(currentRowDiv);

  // Parent table
  const parentTableDiv = document.createElement("div");
  parentTableDiv.style.maxHeight = "400px";
  parentTableDiv.style.overflow = "auto";
  parentTableDiv.style.border = "1px solid #ddd";
  parentTableDiv.style.borderRadius = "6px";
  parentTableDiv.style.marginBottom = "16px";
  modal.appendChild(parentTableDiv);

  let parentColumns = [
    {
      title: "Välj",
      field: "_selected",
      formatter: "tickCross",
      width: 80,
      hozAlign: "center",
      headerSort: false
    }
  ];
  if (type === "task") {
    parentColumns.push(
      {
        title: "Part",
        field: "partName",
        headerFilter: "input",
        width: 200
      },
      {
        title: "Item",
        field: "displayName",
        headerFilter: "input"
      }
    );
  } else {
    parentColumns.push({
      title: type === "item" ? "Part" : "Item",
      field: "displayName",
      headerFilter: "input"
    });
  }

  const parentTable = new Tabulator(parentTableDiv, {
    data: parentOptions.map(p => ({ ...p, _selected: false })),
    columns: parentColumns,
    layout: "fitDataFill",
    height: "350px"
  });

  parentTable.on("rowClick", (e, row) => {
    const parentData = row.getData();
    rowParentMap.set(currentRowIndex, parentData.id);
    
    // Update selection visual
    const allParents = parentTable.getData();
    allParents.forEach((p, idx) => {
      parentTable.getRows()[idx].update({
        ...p,
        _selected: p.id === parentData.id
      });
    });
    
    // Auto-advance to next row or enable finish
    setTimeout(() => {
      if (currentRowIndex < selectedRows.length - 1) {
        currentRowIndex++;
        renderCurrentRow();
      } else {
        finishBtn.disabled = false;
        finishBtn.style.opacity = "1";
        finishBtn.textContent = "✅ Slutför Import";
      }
    }, 200);
  });

  function renderCurrentRow() {
    const currentRow = selectedRows[currentRowIndex];
    const rowName = type === "item" ? currentRow.itm_name : currentRow.tsk_name;
    const hasParent = rowParentMap.has(currentRowIndex);
    
    currentRowDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 18px;">${rowName}</strong>
          <div style="color: #666; margin-top: 4px;">
            ${type.charAt(0).toUpperCase() + type.slice(1)} ${currentRowIndex + 1} av ${selectedRows.length}
          </div>
        </div>
        <div style="font-size: 14px; color: ${hasParent ? '#28a745' : '#dc3545'};">
          ${hasParent ? '✅ Parent vald' : '⚠️ Välj parent nedan'}
        </div>
      </div>
    `;
    
    // Update parent table selection
    const parentsData = parentOptions.map(p => ({
      ...p,
      _selected: rowParentMap.get(currentRowIndex) === p.id
    }));
    parentTable.setData(parentsData);
    
    // Update progress in finish button
    const completedCount = Array.from(rowParentMap.keys()).length;
    finishBtn.textContent = completedCount === selectedRows.length 
      ? "✅ Slutför Import" 
      : `Slutför Import (${completedCount}/${selectedRows.length})`;
  }

  // Progress display (informational only, no navigation buttons)
  const progressInfo = document.createElement("div");
  progressInfo.style.textAlign = "center";
  progressInfo.style.fontSize = "14px";
  progressInfo.style.color = "#666";
  progressInfo.style.marginBottom = "16px";
  progressInfo.textContent = "Klicka på en parent-rad för att välja och gå vidare automatiskt";
  modal.appendChild(progressInfo);

  // Finish button only
  const btnRow = document.createElement("div");
  btnRow.className = "tab-modal-buttons";
  const finishBtn = document.createElement("button");
  finishBtn.className = "tab-modal-btn tab-modal-confirm";
  finishBtn.textContent = "Slutför Import (0/" + selectedRows.length + ")";
  finishBtn.disabled = true;
  finishBtn.style.opacity = "0.5";
  finishBtn.onclick = () => {
    // Check if all rows have parents
    const missingParents = [];
    for (let i = 0; i < selectedRows.length; i++) {
      if (!rowParentMap.has(i)) {
        missingParents.push(i + 1);
      }
    }
    
    if (missingParents.length > 0) {
      const confirm = window.confirm(
        `${missingParents.length} st ${type}s saknar parent (rad ${missingParents.join(', ')}).\n\n` +
        `Vill du importera endast de ${rowParentMap.size} st som har parent?`
      );
      if (!confirm) return;
    }
    
    // Filter to only rows with parents
    const rowsWithParent = selectedRows
      .map((row, idx) => rowParentMap.has(idx) ? { ...row, _parentId: rowParentMap.get(idx) } : null)
      .filter(Boolean);
    
    if (rowsWithParent.length === 0) {
      alert("Inga rader kan importeras - alla saknar parent!");
      return;
    }
    
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
  
  // Initialize first row
  setTimeout(() => renderCurrentRow(), 100);
}

// FÖRBÄTTRAD AJAX-HANTERING FÖR NESTED IMPORT (med progress)
function importSingleRow(project, data, type, tables, progressCallback) {
  const parentId = data._parentId;
  const withNewIds = regenerateIds(project, data, type, parentId);
  
  switch(type) {
    case 'part':
    case 'project':
      project.prt_parts.push(withNewIds);
      
      // FÖRBÄTTRAD AJAX: Skicka hela part-strukturen för nested import
      const ajaxData = {
        action: "importPart",
        prt_id: withNewIds.prt_id,
        prt_name: withNewIds.prt_name,
        // Lägg till nested data
        prt_items: withNewIds.prt_items || [],
        item_count: (withNewIds.prt_items || []).length,
        task_count: (withNewIds.prt_items || []).reduce((sum, item) => 
          sum + (item.itm_tasks || []).length, 0)
      };
      
      // Skicka separat AJAX för varje item och task också
      (withNewIds.prt_items || []).forEach(item => {
        ajaxHandler.queuedEchoAjax({
          action: "importItemWithPart",
          itm_id: item.itm_id,
          itm_name: item.itm_name,
          prt_id: withNewIds.prt_id,
          prt_name: withNewIds.prt_name
        });
        
        (item.itm_tasks || []).forEach(task => {
          ajaxHandler.queuedEchoAjax({
            action: "importTaskWithItem",
            tsk_id: task.tsk_id,
            tsk_name: task.tsk_name,
            itm_id: item.itm_id,
            itm_name: item.itm_name,
            prt_id: withNewIds.prt_id
          });
        });
      });
      
      ajaxHandler.queuedEchoAjax(ajaxData);
      break;
      
    case 'item':
      const targetPart = project.prt_parts.find(p => p.prt_id === parentId);
      if (!targetPart) { console.error("Target part not found:", parentId); return; }
      if (!targetPart.prt_items) targetPart.prt_items = [];
      targetPart.prt_items.push(withNewIds);
      
      // FÖRBÄTTRAD AJAX: Skicka item med tasks
      ajaxHandler.queuedEchoAjax({
        action: "importItem",
        itm_id: withNewIds.itm_id,
        itm_name: withNewIds.itm_name,
        prt_id: targetPart.prt_id,
        itm_tasks: withNewIds.itm_tasks || [],
        task_count: (withNewIds.itm_tasks || []).length
      });
      
      // Skicka separat för varje task
      (withNewIds.itm_tasks || []).forEach(task => {
        ajaxHandler.queuedEchoAjax({
          action: "importTaskWithItem", 
          tsk_id: task.tsk_id,
          tsk_name: task.tsk_name,
          itm_id: withNewIds.itm_id,
          itm_name: withNewIds.itm_name
        });
      });
      break;
      
    case 'task':
      // Task import förblir oförändrad
      let targetItem = null;
      for (const part of project.prt_parts || []) {
        targetItem = (part.prt_items || []).find(i => i.itm_id === parentId);
        if (targetItem) break;
      }
      if (!targetItem) { console.error("Target item not found:", parentId); return; }
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
  
  // Progress callback
  if (progressCallback) {
    const itemName = type === 'part' ? withNewIds.prt_name : 
                     type === 'item' ? withNewIds.itm_name : withNewIds.tsk_name;
    progressCallback(itemName);
  }
}

export function handleImport(project, jsonString, tables, updatePartOptions, applyPartFilter) {
  try {
    const rawData = JSON.parse(jsonString);
    const type = detectImportType(rawData);
    const validation = validateImportData(rawData, type);
    if (!validation.valid) { alert("Importfel:\n" + validation.errors.join("\n")); return; }
    const cleanedData = stripParentIdsAndTotals(rawData, type);

    showNestedPreview(project, cleanedData, type, (selectedRows) => {
      if (type === "part" || type === "project") {
        // Samla import-statistik
        let importStats = {
          action: "importCompleted",
          type: type,
          imported_parts: 0,
          imported_items: 0,
          imported_tasks: 0,
          details: []
        };
        
        // Progress tracking
        let currentRow = 0;
        const totalRows = selectedRows.length;
        
        selectedRows.forEach(row => {
          currentRow++;
          showProgressIndicator(currentRow, totalRows, row.prt_name || `${type} ${currentRow}`);
          
          importSingleRow(project, row, type, tables, (itemName) => {
            showProgressIndicator(currentRow, totalRows, itemName);
          });
          
          // Räkna statistik
          importStats.imported_parts++;
          importStats.imported_items += (row.prt_items || []).length;
          importStats.imported_tasks += (row.prt_items || []).reduce((sum, item) => 
            sum + (item.itm_tasks || []).length, 0);
          
          importStats.details.push({
            part_name: row.prt_name,
            item_count: (row.prt_items || []).length,
            task_count: (row.prt_items || []).reduce((sum, item) => 
              sum + (item.itm_tasks || []).length, 0)
          });
        });
        
        // Skicka sammanfattningsrapport
        ajaxHandler.queuedEchoAjax(importStats);
        
        // Uppdatera kalkyler
        calcUtils.updateAllData(project);
        
        // NYTT: Skicka uppdaterade projekttotaler
        ajaxHandler.queuedEchoAjax({
          action: "updateProjectTotals",
          prj_id: project.prj_id,
          material_total: project.prj_material_user_price_total || 0,
          work_total: project.prj_work_task_duration_total || 0
        });
        
        // Uppdatera tabeller
        tables.partTable.setData(project.prt_parts);
        tables.itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
        if (updatePartOptions) updatePartOptions();
        if (applyPartFilter) applyPartFilter();
        
        alert(`Import slutförd! ${selectedRows.length} ${type}(s) importerade.`);
        return;
      }
      
      // Items/Tasks - parent selection
      showParentSelectionTable(project, selectedRows, type, (rowsWithParent) => {
        let importStats = {
          action: "importCompleted",
          type: type,
          imported_count: rowsWithParent.length,
          details: rowsWithParent.map(row => ({
            name: type === "item" ? row.itm_name : row.tsk_name,
            id: type === "item" ? row.itm_id : row.tsk_id
          }))
        };
        
        // Progress tracking
        let currentRow = 0;
        const totalRows = rowsWithParent.length;
        
        rowsWithParent.forEach(row => {
          currentRow++;
          const itemName = type === "item" ? row.itm_name : row.tsk_name;
          showProgressIndicator(currentRow, totalRows, itemName);
          
          importSingleRow(project, row, type, tables, (name) => {
            showProgressIndicator(currentRow, totalRows, name);
          });
        });
        
        // Uppdatera kalkyler
        calcUtils.updateAllData(project);
        
        // NYTT: Skicka uppdaterade projekttotaler
        ajaxHandler.queuedEchoAjax({
          action: "updateProjectTotals",
          prj_id: project.prj_id,
          material_total: project.prj_material_user_price_total || 0,
          work_total: project.prj_work_task_duration_total || 0
        });
        
        ajaxHandler.queuedEchoAjax(importStats);
        
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

  // Setup drag & drop
  setupDragDrop(textarea, fileInput);

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
