// ======= IMPORTS =======
import * as calcUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@d587c03c86ac06b263c941591935651ac0a1a0eb/projectCalcUtils.js";
import * as uiHelpers from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@713f7a634adf852e4899dfbf62317955aa481b7d/uiHelpers.js";
import * as subtableToggle from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@229107bdd0fe8badb9cfc4b3280711a216246af8/subtableToggle.js";
import * as ajaxHandler from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@ede6ce639f16ee007a023700b617b4b64d6e2adf/ajaxHandler.js";
import * as partColors from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@44be448b9cbc2cff2549fab8ece33944dd33ada1/partColors.js";
import TagSystemUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@f0840c9b125ba97de586d899332d5f28c48a8592/tagSystemUtils.js";

// ======= EXEMPELDATA (uppdaterad med nya tagg-fält) =======
const data = [
  {
    prj_id: 1,
    prj_name: "Build House",
    prt_parts: [
      {
        prt_id: 1,
        prt_prj_id: 1,
        prt_name: "Frame",
        prt_tags: ["structure", "wood"],
        prt_items: [
          {
            itm_id: 111,
            itm_prt_id: 1,
            itm_name: "Stud",
            itm_category: "Wood",
            itm_quantity: 10,
            itm_tags: ["lumber", "2x4"],
            itm_tasks: [
              {
                tsk_id: 1111,
                tsk_itm_id: 111,
                tsk_name: "Saw",
                tsk_total_quantity: 10,
                tsk_work_task_duration: 1,
                tsk_material_amount: 10,
                tsk_material_user_price: 3,
                tsk_tags: ["cutting", "tool"],
              },
              {
                tsk_id: 1112,
                tsk_itm_id: 111,
                tsk_name: "Transport",
                tsk_total_quantity: 10,
                tsk_work_task_duration: 0.5,
                tsk_material_amount: 2,
                tsk_material_user_price: 1,
                tsk_tags: ["df", "logistics"],
              },
            ],
          },
        ],
      },
      {
        prt_id: 2,
        prt_prj_id: 1,
        prt_name: "Roof",
        prt_tags: ["covering", "weather"],
        prt_items: [
          {
            itm_id: 121,
            itm_prt_id: 2,
            itm_name: "Tile",
            itm_category: "Clay",
            itm_quantity: 100,
            itm_tags: ["ceramic", "red"],
            itm_tasks: [
              {
                tsk_id: 1211,
                tsk_itm_id: 121,
                tsk_name: "Lay tiles",
                tsk_total_quantity: 100,
                tsk_work_task_duration: 0.2,
                tsk_material_amount: 1,
                tsk_material_user_price: 6,
                tsk_tags: ["installation", "manual"],
              },
              {
                tsk_id: 1212,
                tsk_itm_id: 121,
                tsk_name: "Inspect tiles",
                tsk_total_quantity: 100,
                tsk_work_task_duration: 0.05,
                tsk_material_amount: 0.5,
                tsk_material_user_price: 2,
                tsk_tags: ["quality", "check"],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ======= GLOBAL STATE =======
const project = data[0];
let partTable = null;
let itemTable = null;

// ======= INIT =======
calcUtils.updateAllData(project);
project.prt_parts?.forEach(p => { p.selected = p.selected ?? true; });

// ======= HJÄLPFUNKTIONER =======
const findItemById = (proj, itm_id) => {
  for (const part of proj.prt_parts || []) {
    const found = (part.prt_items || []).find(i => i.itm_id === itm_id);
    if (found) return found;
  }
  return null;
};

const findTaskById = (proj, tsk_id) => {
  for (const part of proj.prt_parts || []) {
    for (const item of part.prt_items || []) {
      const found = (item.itm_tasks || []).find(t => t.tsk_id === tsk_id);
      if (found) return found;
    }
  }
  return null;
};

const findPartById = (proj, prt_id) => {
  return (proj.prt_parts || []).find(p => p.prt_id === prt_id);
};

const getNextId = (collection, idField) => (collection.length ? Math.max(...collection.map(i => +i[idField] || 0)) + 1 : 1);
const getNextPartId = () => getNextId(project.prt_parts || [], "prt_id");
const getNextItemId = () => getNextId(project.prt_parts?.flatMap(p => p.prt_items || []) || [], "itm_id");
const getNextTaskId = () => getNextId(project.prt_parts?.flatMap(p => (p.prt_items || []).flatMap(i => i.itm_tasks || [])) || [], "tsk_id");
const formatMoney = { formatter: "money", formatterParams: { symbol: "kr", precision: 2, thousand: " " } };
const formatHours = cell => `${(Number(cell.getValue()) || 0).toFixed(2)} h`;
const confirmMsg = msg => window.confirm(msg);

// ======= TAGG-AJAX FUNKTIONER =======
const handleTagUpdate = (entityType, entityId, newTags, oldTags = []) => {
  // Skicka AJAX-anrop för tagguppdatering
  const ajaxData = {
    action: "updateTags",
    entityType: entityType, // "part", "item", eller "task"
    entityId: entityId,
    tags: newTags,
    oldTags: oldTags
  };
  
  ajaxHandler.queuedEchoAjax(ajaxData);
};

// ======= HJÄLPFUNKTIONER FÖR ATT HÄMTA BEFINTLIGA TAGGAR PER NIVÅ =======
const getExistingPartTags = () => {
  const partTags = new Set();
  
  project.prt_parts?.forEach(part => {
    if (Array.isArray(part.prt_tags)) {
      part.prt_tags.forEach(tag => partTags.add(tag));
    }
  });
  
  return Array.from(partTags).sort();
};

const getExistingItemTags = () => {
  const itemTags = new Set();
  
  project.prt_parts?.forEach(part => {
    part.prt_items?.forEach(item => {
      if (Array.isArray(item.itm_tags)) {
        item.itm_tags.forEach(tag => itemTags.add(tag));
      }
    });
  });
  
  return Array.from(itemTags).sort();
};

const getExistingTaskTags = () => {
  const taskTags = new Set();
  
  project.prt_parts?.forEach(part => {
    part.prt_items?.forEach(item => {
      item.itm_tasks?.forEach(task => {
        if (Array.isArray(task.tsk_tags)) {
          task.tsk_tags.forEach(tag => taskTags.add(tag));
        }
      });
    });
  });
  
  return Array.from(taskTags).sort();
};

// Hjälpfunktion för att få rätt tagg-funktion baserat på entitetstyp
const getExistingTagsForEntityType = (entityType) => {
  switch(entityType) {
    case 'part': return getExistingPartTags();
    case 'item': return getExistingItemTags();
    case 'task': return getExistingTaskTags();
    default: return [];
  }
};

// ======= GEMENSAM KOLUMN =======
const deleteColumn = (cellClick) => ({ title: "", formatter: () => "🗑️", width: 50, hozAlign: "center", cellClick, headerSort: false });

// ======= TABELLKONFIGURATION =======
const getPartTableColumns = () => [
  deleteColumn(handleDeletePart),
  { title: "Markerad", field: "selected", formatter: "tickCross", editor: true, headerSort: false, width: 80, cellEdited: () => applyPartFilter() },
  { title: "Part-ID", field: "prt_id", width: 80 },
  { title: "Part-namn", field: "prt_name", editor: "input", cellEdited: updatePartName },
  { title: "Materialpris Tot", field: "prt_material_user_price_total", ...formatMoney },
  { title: "Arbetstid Tot", field: "prt_work_task_duration_total", formatter: formatHours },
];

const getItemTableColumns = () => [
  {
    title: "", field: "toggleSubtable", width: 50, hozAlign: "center",
    formatter: (cell) => {
      const itm_id = cell.getRow().getData().itm_id;
      const isOpen = subtableToggle.openItemRows.has(itm_id);
      return `<i class="fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"} subtable-toggle" style="cursor:pointer;font-size:1.2em;" title="${isOpen ? "Dölj tasks" : "Visa tasks"}"></i>`;
    },
    cellClick: (_e, cell) => subtableToggle.toggleSubtable(cell.getRow(), cell),
    headerSort: false
  },
  deleteColumn(handleDeleteItem),
  { title: "Item-ID", field: "itm_id", width: 70 },
  { title: "Item-namn", field: "itm_name", editor: "input", cellEdited: updateItemCell },
  {
    title: "Part", field: "itm_prt_id", editor: "list",
    editorParams: () => ({ values: calcUtils.getPartOptions(project) }),
    formatter: cell => calcUtils.getPartLookup(project)[cell.getValue()] || "Okänd part",
    cellEdited: moveItemPartCell
  },
  { title: "Antal", field: "itm_quantity", editor: "number", cellEdited: updateItemCell },
  { title: "Materialpris", field: "itm_material_user_price", ...formatMoney },
  { title: "Materialpris Tot", field: "itm_material_user_price_total", ...formatMoney },
  { title: "Arbetstid", field: "itm_work_task_duration", formatter: formatHours },
  { title: "Arbetstid Tot", field: "itm_work_task_duration_total", formatter: formatHours },
];

const getTaskTableColumns = () => [
  deleteColumn((e, cell) => handleDeleteTask(cell, cell.getRow().getData().tsk_itm_id)),
  { title: "Task-ID", field: "tsk_id", width: 70 },
  { title: "Task-namn", field: "tsk_name", editor: "input", cellEdited: updateTaskCell },
  { title: "Quantity", field: "tsk_total_quantity", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Amount", field: "tsk_material_amount", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Price", field: "tsk_material_user_price", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Price Total", field: "tsk_material_user_price_total", ...formatMoney },
  { title: "Work Duration", field: "tsk_work_task_duration", editor: "number", cellEdited: updateTaskCell },
  { title: "Work Duration Total", field: "tsk_work_task_duration_total", formatter: formatHours },
];

// ======= DELETE HANDLERS =======
const handleDeletePart = (_e, cell) => {
  const { prt_id, prt_name } = cell.getRow().getData();
  if (!confirmMsg(`Vill du verkligen ta bort part "${prt_name}" och allt underliggande?`)) return;
  project.prt_parts = (project.prt_parts || []).filter(p => p.prt_id !== prt_id);
  partTable?.deleteRow(prt_id);
  (itemTable?.getData() || []).filter(i => i.itm_prt_id === prt_id).forEach(i => itemTable.deleteRow(i.itm_id));
  calcUtils.updateAllData(project); updatePartOptions(); applyPartFilter(); itemTable?.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, action: "deletePart" });
};

const handleDeleteItem = (_e, cell) => {
  const { itm_id, itm_name, itm_prt_id } = cell.getRow().getData();
  if (!confirmMsg(`Vill du verkligen ta bort item "${itm_name}" och dess tasks?`)) return;
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id); if (!part) return;
  part.prt_items = (part.prt_items || []).filter(i => i.itm_id !== itm_id);
  itemTable?.deleteRow(itm_id);
  subtableToggle.openItemRows.delete(itm_id);
  calcUtils.updateAllData(project); partTable.getRow(itm_prt_id)?.update(part); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, action: "deleteItem" });
};

const handleDeleteTask = (cell, itm_id) => {
  const { tsk_id, tsk_name } = cell.getRow().getData();
  if (!confirmMsg(`Vill du verkligen ta bort task "${tsk_name}"?`)) return;
  const item = findItemById(project, itm_id); if (!item) return;
  item.itm_tasks = (item.itm_tasks || []).filter(t => t.tsk_id !== tsk_id);
  const itemRow = itemTable.getRow(itm_id); itemRow?._subTaskTable?.deleteRow(tsk_id);
  calcUtils.updateAllData(project); updateDataAndRefresh(item);
  ajaxHandler.queuedEchoAjax({ tsk_id, action: "deleteTask" });
};

// ======= TABELLER =======
const setupTables = () => {
  partTable = new Tabulator("#part-table", {
    index: "prt_id", data: project.prt_parts || [], layout: "fitDataFill", columns: getPartTableColumns(),
    footerElement: uiHelpers.createFooterButton("Lägg till Part", addPartRow),
    rowFormatter: (row) => partColors.applyPartColorToRow(row, row.getData().prt_id)
  });
  
  itemTable = new Tabulator("#item-table", {
    index: "itm_id", data: calcUtils.getAllItemsWithPartRef(project.prt_parts), layout: "fitDataFill",
    columns: getItemTableColumns(), footerElement: uiHelpers.createFooterButton("Lägg till Item", addItemRow),
    rowFormatter: (row) => {
      const d = row.getData(), itm_id = d.itm_id, partId = d.itm_prt_id; partColors.applyPartColorToRow(row, partId);
      let holderEl = row.getElement().querySelector(".subtable-holder");
      if (!holderEl) {
        holderEl = document.createElement("div"); holderEl.className = "subtable-holder";
        holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none"; row.getElement().appendChild(holderEl);
        if ((d.itm_tasks || []).length) {
          const taskDiv = document.createElement("div"); holderEl.appendChild(taskDiv);
          const taskTable = new Tabulator(taskDiv, {
            index: "tsk_id", data: d.itm_tasks, layout: "fitDataFill", columns: getTaskTableColumns(),
            footerElement: uiHelpers.createFooterButton("Lägg till Task", () => addTaskRow(d)),
            rowFormatter: (taskRow) => partColors.applyPartColorToRow(taskRow, partId)
          });
          row._subTaskTable = taskTable;
          
          // Lägg till taggkolumn för tasks
          addTagsToTable(taskTable, "task");
        } else holderEl.appendChild(uiHelpers.createFooterButton("Lägg till Task", () => addTaskRow(d)));
      } else holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none";
      subtableToggle.restoreToggleState(row);
    },
  });
  itemTable.on("tableBuilt", () => { applyPartFilter(); updatePartOptions(); });
};

// ======= LÄGG TILL-RADER =======
const addPartRow = () => {
  const newId = getNextPartId(), newPart = { prt_id: newId, prt_prj_id: project.prj_id, prt_name: `Ny Part ${newId}`, prt_items: [], selected: true, prt_tags: [] };
  (project.prt_parts ||= []).push(newPart); calcUtils.updateAllData(project); partTable.addRow(newPart); updatePartOptions(); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ prt_id: newId, prt_name: newPart.prt_name, action: "addPart" });
  setTimeout(() => partTable.getRow(newId)?.getCell("prt_name").edit(), 0);
};

const addItemRow = () => {
  const newId = getNextItemId(), targetPart = project.prt_parts?.find(p => p.selected) || project.prt_parts?.[0];
  if (!targetPart) return ajaxHandler.showUserError("Skapa först en Part.");
  const newTaskId = getNextTaskId(), newTask = { tsk_id: newTaskId, tsk_itm_id: newId, tsk_name: `Ny Task ${newTaskId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [] };
  const newItem = { itm_id: newId, itm_prt_id: targetPart.prt_id, itm_name: `Ny Item ${newId}`, itm_category: "", itm_quantity: 1, itm_tasks: [newTask], itm_tags: [] };
  (targetPart.prt_items ||= []).push(newItem); calcUtils.updateAllData(project); itemTable.addRow(newItem); subtableToggle.openItemRows.add(newId);
  ajaxHandler.queuedEchoAjax({ itm_id: newId, itm_name: newItem.itm_name, action: "addItem" });
  ajaxHandler.queuedEchoAjax({ tsk_id: newTaskId, tsk_name: newTask.tsk_name, itm_id: newId, action: "addTask" });
  setTimeout(() => itemTable.getRow(newId)?.getCell("itm_name").edit(), 0);
};

const addTaskRow = (itemData) => {
  const newId = getNextTaskId(), newTask = { tsk_id: newId, tsk_itm_id: itemData.itm_id, tsk_name: `Ny Task ${newId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [] };
  const item = findItemById(project, itemData.itm_id); if (!item) return;
  (item.itm_tasks ||= []).push(newTask); calcUtils.updateAllData(project);
  const itemRow = itemTable.getRow(itemData.itm_id); if (!itemRow) return;
  if (itemRow._subTaskTable) {
    itemRow._subTaskTable.addRow(newTask);
  } else {
    itemTable.redraw(true);
  }
  updateDataAndRefresh(item); subtableToggle.openItemRows.add(itemData.itm_id);
  ajaxHandler.queuedEchoAjax({ tsk_id: newId, tsk_name: newTask.tsk_name, itm_id: itemData.itm_id, action: "addTask" });
  setTimeout(() => itemRow._subTaskTable?.getRow(newId)?.getCell("tsk_name").edit(), 0);
};

// ======= UPPDATERING =======
const updateDataAndRefresh = (item, part = null) => {
  calcUtils.updateAllData(project);
  itemTable.getRow(item.itm_id)?.update(item);
  const targetPart = part || project.prt_parts?.find(p => p.prt_id === item.itm_prt_id);
  targetPart && partTable.getRow(targetPart.prt_id)?.update(targetPart);
};

function updatePartName(cell) {
  const { prt_id } = cell.getRow().getData(), newName = cell.getValue();
  const part = project.prt_parts?.find(p => p.prt_id === prt_id); if (!part) return;
  part.prt_name = newName; calcUtils.updateAllData(project); cell.getRow().update(part); updatePartOptions(); itemTable.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, prt_name: newName, action: "updatePartName" });
}

const updateItemCell = (cell) => {
  const { itm_id, itm_prt_id } = cell.getRow().getData();
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id);
  const item = part?.prt_items?.find(i => i.itm_id === itm_id); if (!item) return;
  const field = cell.getField(), value = cell.getValue();
  item[field] = value; calcUtils.updateItemTotals(item); calcUtils.updatePartTotals(part); calcUtils.updateProjectTotals(project);
  updateDataAndRefresh(item, part);
  ajaxHandler.queuedEchoAjax({ itm_id, [field]: value, action: "updateItem" });
};

const moveItemPartCell = (cell) => {
  const { itm_id } = cell.getRow().getData(), newPartId = cell.getValue();
  const { newItem, oldPart, newPart } = calcUtils.moveItemToPart(project, itm_id, newPartId); if (!newItem) return;
  calcUtils.updateAllData(project); [oldPart, newPart].forEach(p => p && partTable.getRow(p.prt_id)?.update(p));
  const row = cell.getRow(); row.update(newItem); partColors.updateRowPartColor(row, newPartId);
  row._subTaskTable?.getRows().forEach(taskRow => partColors.updateRowPartColor(taskRow, newPartId));
  applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, newPartId, action: "moveItemPart" });
};

const updateTaskCell = (cell) => {
  const taskData = cell.getRow().getData();
  for (const part of project.prt_parts || []) for (const item of (part.prt_items || [])) {
    if (item.itm_id !== taskData.tsk_itm_id) continue;
    const task = (item.itm_tasks || []).find(t => t.tsk_id === taskData.tsk_id); if (!task) continue;
    const field = cell.getField(), value = cell.getValue();
    task[field] = value; calcUtils.updateTaskTotals(task); calcUtils.updateItemTotals(item); calcUtils.updatePartTotals(part); calcUtils.updateProjectTotals(project);
    cell.getRow().update(task); updateDataAndRefresh(item, part);
    ajaxHandler.queuedEchoAjax({ tsk_id: task.tsk_id, [field]: value, action: "updateTask" }); return;
  }
};

// Global variabel för att hålla koll på tagg-filter för Items
let itemsTagFilter = null;

// ======= FILTER & OPTIONS =======
const applyPartFilter = () => {
  const selectedIds = (partTable?.getData() || []).filter(p => p.selected).map(p => p.prt_id);
  
  // Kombinera part-filter och tagg-filter manuellt
  const combinedFilter = (data, filterParams) => {
    // Part-filter: kontrollera att item tillhör en vald part
    const partMatch = selectedIds.length === 0 || selectedIds.includes(data.itm_prt_id);
    if (!partMatch) return false;
    
    // Tagg-filter: använd det sparade tagg-filtret om det finns
    if (itemsTagFilter && itemsTagFilter.length > 0) {
      const tags = Array.isArray(data.itm_tags) ? data.itm_tags : [];
      if (tags.length === 0) return false;
      
      // Använd samma logik som TagSystemUtils
      const tagUtils = window.__tagUtils?.['item-table'];
      const logic = tagUtils?.getFilterLogic() || 'AND';
      
      if (logic === 'AND') {
        return itemsTagFilter.every(selectedTag => tags.includes(selectedTag));
      } else {
        return itemsTagFilter.some(selectedTag => tags.includes(selectedTag));
      }
    }
    
    return true; // Om inget tagg-filter är aktivt, visa alla som passar part-filtret
  };
  
  itemTable.setFilter(combinedFilter);
};

const updatePartOptions = () => {
  const col = itemTable.getColumn("itm_prt_id"), partOptions = calcUtils.getPartOptions(project), partLookup = calcUtils.getPartLookup(project);
  col?.updateDefinition({ editorParams: { values: partOptions }, formatter: cell => partLookup[cell.getValue()] || "Okänd part" });
};

function waitForTables(selectors, timeoutMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const found = selectors.map(sel => (window.Tabulator && Tabulator.findTable(sel)[0]) || null);
      if (found.every(Boolean)) return resolve(found);
      if (Date.now() - start > timeoutMs) return reject(new Error("Tabeller hittades inte i tid"));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function ensureTagsArray(table, entityType) {
  // Säkerställ att alla rader har tags-array
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

// ======= FÖRBÄTTRAD TAGG-EDITOR =======
function createTagEditor(cell, onRendered, success, cancel, tagField, entityType) {
  // Skapa overlay
  const overlay = document.createElement("div");
  overlay.className = "tag-editor-overlay";
  
  // Skapa editor-box
  const editorBox = document.createElement("div");
  editorBox.className = "tag-editor-box";
  
  // Titel
  const title = document.createElement("h5");
  title.className = "tag-editor-title";
  title.textContent = "Redigera taggar";
  editorBox.appendChild(title);
  
  let currentTags = Array.isArray(cell.getValue()) ? [...cell.getValue()] : [];
  // Använd rätt funktion baserat på entitetstyp
  const existingTags = getExistingTagsForEntityType(entityType);
  
  // Sektion för valda taggar
  const selectedTagsSection = document.createElement("div");
  selectedTagsSection.className = "tag-section";
  
  const selectedLabel = document.createElement("label");
  selectedLabel.className = "tag-section-label";
  selectedLabel.textContent = "Valda taggar:";
  selectedTagsSection.appendChild(selectedLabel);
  
  const tagContainer = document.createElement("div");
  tagContainer.className = "tag-container";
  selectedTagsSection.appendChild(tagContainer);
  
  editorBox.appendChild(selectedTagsSection);
  
  // Sektion för befintliga taggar
  const existingTagsSection = document.createElement("div");
  existingTagsSection.className = "tag-section";
  
  const existingLabel = document.createElement("label");
  existingLabel.className = "tag-section-label";
  existingLabel.textContent = "Tillgängliga taggar (klicka för att lägga till):";
  existingTagsSection.appendChild(existingLabel);
  
  const existingTagsContainer = document.createElement("div");
  existingTagsContainer.className = "existing-tags-container";
  existingTagsSection.appendChild(existingTagsContainer);
  
  editorBox.appendChild(existingTagsSection);
  
  // Sektion för nya taggar
  const newTagSection = document.createElement("div");
  newTagSection.className = "tag-section";
  
  const newLabel = document.createElement("label");
  newLabel.className = "tag-section-label";
  newLabel.textContent = "Lägg till ny tagg:";
  newTagSection.appendChild(newLabel);
  
  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";
  
  const input = document.createElement("input");
  input.className = "tag-input";
  input.type = "text";
  input.placeholder = "Skriv ny tagg...";
  inputContainer.appendChild(input);
  
  const addButton = document.createElement("button");
  addButton.className = "btn btn-primary";
  addButton.textContent = "Lägg till";
  inputContainer.appendChild(addButton);
  
  newTagSection.appendChild(inputContainer);
  editorBox.appendChild(newTagSection);
  
  // Knappar
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "button-container";
  
  const saveButton = document.createElement("button");
  saveButton.className = "btn btn-success";
  saveButton.textContent = "Spara";
  buttonContainer.appendChild(saveButton);
  
  const cancelButton = document.createElement("button");
  cancelButton.className = "btn btn-secondary";
  cancelButton.textContent = "Avbryt";
  buttonContainer.appendChild(cancelButton);
  
  editorBox.appendChild(buttonContainer);
  
  // Funktion för att uppdatera visning av valda taggar
  const updateTagDisplay = () => {
    tagContainer.innerHTML = "";
    if (currentTags.length === 0) {
      const emptySpan = document.createElement("span");
      emptySpan.className = "empty-state";
      emptySpan.textContent = "Inga taggar tillagda";
      tagContainer.appendChild(emptySpan);
    } else {
      currentTags.forEach((tag) => {
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
  };
  
  // Funktion för att uppdatera visning av tillgängliga taggar
  const updateExistingTagsDisplay = () => {
    existingTagsContainer.innerHTML = "";
    const availableNow = existingTags.filter(tag => !currentTags.includes(tag));
    
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

function addTagsToTable(table, entityType = "item") {
  // Kontrollera om tabellen redan har taggar
  const existingColumns = table.getColumns();
  const tagField = entityType === "part" ? "prt_tags" : 
                   entityType === "item" ? "itm_tags" : 
                   "tsk_tags";
  
  const hasTagColumn = existingColumns.some(col => col.getField() === tagField);
  
  if (hasTagColumn) {
    return;
  }

  const tags = new TagSystemUtils();

  const setup = () => {
    const isItemsTable = table.element && table.element.id === 'item-table';
    
    if (isItemsTable) {
      // För Items-tabellen: intercepta TagSystemUtils filter-calls
      const originalSetFilter = table.setFilter.bind(table);
      
      table.setFilter = function(filters) {
        // Om det här är ett tagg-filter-anrop, spara filtret och använd vår kombinerade funktion
        if (Array.isArray(filters) && filters.length === 1 && filters[0].field === 'itm_tags') {
          itemsTagFilter = filters[0].value;
          applyPartFilter(); // Använd vår kombinerade filter-funktion
          return;
        } else if (filters === null || (Array.isArray(filters) && filters.length === 0)) {
          itemsTagFilter = null;
          applyPartFilter(); // Använd vår kombinerade filter-funktion
          return;
        }
        
        // För alla andra filter-anrop, använd original-funktionen
        originalSetFilter(filters);
      };
    }

    // Patch TagSystemUtils för att använda rätt fältnamn
    const originalGetAllUniqueTags = tags.getAllUniqueTags.bind(tags);
    tags.getAllUniqueTags = function(data) {
      const uniqueTags = new Set();
      data.forEach((row) => {
        if (Array.isArray(row[tagField])) {
          row[tagField].forEach((tag) => uniqueTags.add(tag));
        }
      });
      return Array.from(uniqueTags).sort();
    };

    // Använd vår förbättrade tagg-editor
    tags.tagEditor = function(cell, onRendered, success, cancel, editorParams) {
      return createTagEditor(cell, onRendered, success, cancel, tagField, entityType);
    };

    // Patch customTagHeaderFilter för rätt fältnamn
    const originalHeaderFilter = tags.customTagHeaderFilter.bind(tags);
    tags.customTagHeaderFilter = function(headerValue, rowValue, rowData, filterParams) {
      return originalHeaderFilter(headerValue, rowValue, rowData, filterParams);
    };

    tags.init(table, { filterLogic: "AND", tagsField: tagField });

    ensureTagsArray(table, entityType);

    // Modifierad kolumn-konfiguration med AJAX-hantering
    const tagCol = tags.getColumnConfig(tagField);
    
    // Wrappa den ursprungliga editorn för att lägga till AJAX-funktionalitet
    const originalEditor = tagCol.editor;
    tagCol.editor = function(cell, onRendered, success, cancel, editorParams) {
      const rowData = cell.getRow().getData();
      const oldTags = Array.isArray(rowData[tagField]) ? [...rowData[tagField]] : [];
      
      return createTagEditor(cell, onRendered, (newTags) => {
        // Uppdatera data i rätt entitet baserat på tabelltyp
        let entityId, entityTypeStr;
        
        if (entityType === "part") {
          entityId = rowData.prt_id;
          entityTypeStr = "part";
          // Uppdatera part i project data
          const part = findPartById(project, entityId);
          if (part) {
            part.prt_tags = newTags || [];
          }
        } else if (entityType === "item") {
          entityId = rowData.itm_id;
          entityTypeStr = "item";
          // Uppdatera item i project data
          const item = findItemById(project, entityId);
          if (item) {
            item.itm_tags = newTags || [];
          }
        } else if (entityType === "task") {
          entityId = rowData.tsk_id;
          entityTypeStr = "task";
          // Uppdatera task i project data
          const task = findTaskById(project, entityId);
          if (task) {
            task.tsk_tags = newTags || [];
          }
        }
        
        // Skicka AJAX-anrop för tagguppdatering
        handleTagUpdate(entityTypeStr, entityId, newTags || [], oldTags);
        
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
    window.__tagUtils[table.element.id || "table"] = tags;
  };

  // Kör direkt om redan byggt, annars vänta på eventet
  if (table.initialized || table._rendered) setup();
  else table.on("tableBuilt", setup);
}

// Initiera när tabellerna finns
waitForTables(["#part-table", "#item-table"])
  .then(([partTable, itemTable]) => {
    addTagsToTable(partTable, "part");
    addTagsToTable(itemTable, "item");
  })
  .catch(err => console.warn("Tagg-init misslyckades:", err));

// ======= UI INIT =======
const initUI = () => {
  partColors.createColorStyles();
  setupTables();

  const handlers = {
    "redraw-items-btn": () => itemTable.redraw(true),
    "update-item-part-names-btn": () => { itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts)); updatePartOptions(); applyPartFilter(); itemTable.redraw(true); }
  };
  Object.entries(handlers).forEach(([id, h]) => document.getElementById(id)?.addEventListener("click", h));
};
document.addEventListener("DOMContentLoaded", initUI);
