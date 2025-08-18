import * as calcUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@d587c03c86ac06b263c941591935651ac0a1a0eb/projectCalcUtils.js";
import * as uiHelpers from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@713f7a634adf852e4899dfbf62317955aa481b7d/uiHelpers.js";
import * as subtableToggle from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@229107bdd0fe8badb9cfc4b3280711a216246af8/subtableToggle.js";
import * as ajaxHandler from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@ede6ce639f16ee007a023700b617b4b64d6e2adf/ajaxHandler.js";
import * as partColors from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@44be448b9cbc2cff2549fab8ece33944dd33ada1/partColors.js";
import TagSystemUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@c741cafacd5aef45990129245cef531e3e4fbbd0/tagSystemUtils.js";

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
const findPartById = (proj, prt_id) =>
  (proj.prt_parts || []).find(p => p.prt_id === prt_id);

// ======= TABELLKONFIGURATION =======
const deleteColumn = (cellClick) => ({
  title: "", formatter: () => "🗑️", width: 50, hozAlign: "center", cellClick, headerSort: false
});
const formatMoney = { formatter: "money", formatterParams: { symbol: "kr", precision: 2, thousand: " " } };
const formatHours = cell => `${(Number(cell.getValue()) || 0).toFixed(2)} h`;

const getPartTableColumns = () => [
  deleteColumn(handleDeletePart),
  { title: "Markerad", field: "selected", formatter: "tickCross", editor: true, headerSort: false, width: 80, cellEdited: () => applyPartFilter() },
  { title: "Part-ID", field: "prt_id", width: 80 },
  { title: "Part-namn", field: "prt_name", editor: "input", cellEdited: updatePartName },
  { title: "Materialpris Tot", field: "prt_material_user_price_total", ...formatMoney },
  { title: "Arbetstid Tot", field: "prt_work_task_duration_total", formatter: formatHours },
  // Taggar kolumn läggs till via TagSystemUtils
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
  // Taggar kolumn läggs till via TagSystemUtils
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
  // Taggar kolumn läggs till via TagSystemUtils
];

// ======= DELETE HANDLERS, UPPDATERING, ETC =======
function handleDeletePart(_e, cell) {
  const { prt_id, prt_name } = cell.getRow().getData();
  if (!window.confirm(`Vill du verkligen ta bort part "${prt_name}" och allt underliggande?`)) return;
  project.prt_parts = (project.prt_parts || []).filter(p => p.prt_id !== prt_id);
  partTable?.deleteRow(prt_id);
  (itemTable?.getData() || []).filter(i => i.itm_prt_id === prt_id).forEach(i => itemTable.deleteRow(i.itm_id));
  calcUtils.updateAllData(project); updatePartOptions(); applyPartFilter(); itemTable?.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, action: "deletePart" });
}

function handleDeleteItem(_e, cell) {
  const { itm_id, itm_name, itm_prt_id } = cell.getRow().getData();
  if (!window.confirm(`Vill du verkligen ta bort item "${itm_name}" och dess tasks?`)) return;
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id); if (!part) return;
  part.prt_items = (part.prt_items || []).filter(i => i.itm_id !== itm_id);
  itemTable?.deleteRow(itm_id);
  subtableToggle.openItemRows.delete(itm_id);
  calcUtils.updateAllData(project); partTable.getRow(itm_prt_id)?.update(part); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, action: "deleteItem" });
}

function handleDeleteTask(cell, itm_id) {
  const { tsk_id, tsk_name } = cell.getRow().getData();
  if (!window.confirm(`Vill du verkligen ta bort task "${tsk_name}"?`)) return;
  const item = findItemById(project, itm_id); if (!item) return;
  item.itm_tasks = (item.itm_tasks || []).filter(t => t.tsk_id !== tsk_id);
  const itemRow = itemTable.getRow(itm_id); itemRow?._subTaskTable?.deleteRow(tsk_id);
  calcUtils.updateAllData(project); updateDataAndRefresh(item);
  ajaxHandler.queuedEchoAjax({ tsk_id, action: "deleteTask" });
}

// ======= LÄGG TILL-RADER =======
function getNextId(collection, idField) { return collection.length ? Math.max(...collection.map(i => +i[idField] || 0)) + 1 : 1; }
const getNextPartId = () => getNextId(project.prt_parts || [], "prt_id");
const getNextItemId = () => getNextId(project.prt_parts?.flatMap(p => p.prt_items || []) || [], "itm_id");
const getNextTaskId = () => getNextId(project.prt_parts?.flatMap(p => (p.prt_items || []).flatMap(i => i.itm_tasks || [])) || [], "tsk_id");

function addPartRow() {
  const newId = getNextPartId(), newPart = { prt_id: newId, prt_prj_id: project.prj_id, prt_name: `Ny Part ${newId}`, prt_items: [], selected: true, prt_tags: [] };
  (project.prt_parts ||= []).push(newPart); calcUtils.updateAllData(project); partTable.addRow(newPart); updatePartOptions(); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ prt_id: newId, prt_name: newPart.prt_name, action: "addPart" });
  setTimeout(() => partTable.getRow(newId)?.getCell("prt_name").edit(), 0);
}

function addItemRow() {
  const newId = getNextItemId(), targetPart = project.prt_parts?.find(p => p.selected) || project.prt_parts?.[0];
  if (!targetPart) return ajaxHandler.showUserError("Skapa först en Part.");
  const newTaskId = getNextTaskId(), newTask = { tsk_id: newTaskId, tsk_itm_id: newId, tsk_name: `Ny Task ${newTaskId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [] };
  const newItem = { itm_id: newId, itm_prt_id: targetPart.prt_id, itm_name: `Ny Item ${newId}`, itm_category: "", itm_quantity: 1, itm_tasks: [newTask], itm_tags: [] };
  (targetPart.prt_items ||= []).push(newItem); calcUtils.updateAllData(project); itemTable.addRow(newItem); subtableToggle.openItemRows.add(newId);
  ajaxHandler.queuedEchoAjax({ itm_id: newId, itm_name: newItem.itm_name, action: "addItem" });
  ajaxHandler.queuedEchoAjax({ tsk_id: newTaskId, tsk_name: newTask.tsk_name, itm_id: newId, action: "addTask" });
  setTimeout(() => itemTable.getRow(newId)?.getCell("itm_name").edit(), 0);
}

function addTaskRow(itemData) {
  const newId = getNextTaskId(), newTask = { tsk_id: newId, tsk_itm_id: itemData.itm_id, tsk_name: `Ny Task ${newId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [] };
  const item = findItemById(project, itemData.itm_id); if (!item) return;
  (item.itm_tasks ||= []).push(newTask); calcUtils.updateAllData(project);
  const itemRow = itemTable.getRow(itemData.itm_id); if (!itemRow) return;
  if (itemRow._subTaskTable) {
    itemRow._subTaskTable.addRow(newTask);
    // Återinitiera taggar på subtabell (race-säkert)
    TagSystemUtils.attachToTable(itemRow._subTaskTable, project, "task", ajaxHandler);
  } else {
    itemTable.redraw(true);
  }
  updateDataAndRefresh(item); subtableToggle.openItemRows.add(itemData.itm_id);
  ajaxHandler.queuedEchoAjax({ tsk_id: newId, tsk_name: newTask.tsk_name, itm_id: itemData.itm_id, action: "addTask" });
  setTimeout(() => itemRow._subTaskTable?.getRow(newId)?.getCell("tsk_name").edit(), 0);
}

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

// ======= FILTER & OPTIONS =======
const applyPartFilter = () => {
  const selectedIds = (partTable?.getData() || []).filter(p => p.selected).map(p => p.prt_id);

  const combinedFilter = (data, filterParams) => {
    // Part-filter: kontrollera att item tillhör en vald part
    const partMatch = selectedIds.length === 0 || selectedIds.includes(data.itm_prt_id);
    if (!partMatch) return false;
    // Tagg-filter (sköts nu av TagSystemUtils automatiskt)
    return true;
  };

  itemTable.setFilter(combinedFilter);
};

const updatePartOptions = () => {
  const col = itemTable.getColumn("itm_prt_id"), partOptions = calcUtils.getPartOptions(project), partLookup = calcUtils.getPartLookup(project);
  col?.updateDefinition({ editorParams: { values: partOptions }, formatter: cell => partLookup[cell.getValue()] || "Okänd part" });
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
          taskTable.on("tableBuilt", () => {
            TagSystemUtils.attachToTable(taskTable, project, "task", ajaxHandler);
          });
        } else holderEl.appendChild(uiHelpers.createFooterButton("Lägg till Task", () => addTaskRow(d)));
      } else holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none";
      subtableToggle.restoreToggleState(row);
    },
  });

  partTable.on("tableBuilt", () => {
    TagSystemUtils.attachToTable(partTable, project, "part", ajaxHandler);
  });
  itemTable.on("tableBuilt", () => {
    TagSystemUtils.attachToTable(itemTable, project, "item", ajaxHandler);
  });

  itemTable.on("tableBuilt", () => { applyPartFilter(); updatePartOptions(); });
};

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
