// ======= IMPORTS =======
import * as calcUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@d587c03c86ac06b263c941591935651ac0a1a0eb/projectCalcUtils.js";
import * as uiHelpers from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@713f7a634adf852e4899dfbf62317955aa481b7d/uiHelpers.js";
import * as subtableToggle from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@229107bdd0fe8badb9cfc4b3280711a216246af8/subtableToggle.js";
import * as ajaxHandler from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@ede6ce639f16ee007a023700b617b4b64d6e2adf/ajaxHandler.js";
import * as partColors from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@44be448b9cbc2cff2549fab8ece33944dd33ada1/partColors.js";
import TagSystemUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@c8ec739af0a9f54f49d575e0a97e204fb011cf23/tagSystemUtils.js";
import { TabulatorCommentsModule } from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@d1b484df0ded2dab7384a4a60d5b721e3856db99/commentSystem.js";
import * as tableUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@7bffba94d2f334d5b5ea34bb49743459ba05cba1/tableUtils.js"; // NY! Alla hjälpfunktioner

// ======= EXEMPELDATA (uppdaterad med nya tagg-fält och kommentarsfält) =======
const data = [
  {
    prj_id: 1,
    prj_name: "Build House",
    prj_comments: [
      {
        text: "Projektet startades i december 2024. Kontakta oss på <a href='mailto:info@buildhouse.com'>info@buildhouse.com</a>",
        timestamp: "2024-12-01 09:00"
      }
    ],
    prt_parts: [
      {
        prt_id: 1,
        prt_prj_id: 1,
        prt_name: "Frame",
        prt_tags: ["structure", "wood"],
        prt_comments: [
          {
            text: "Frame work börjar nästa vecka. Se ritningar på <strong>www.buildplans.com</strong>",
            timestamp: "2024-12-01 10:30"
          }
        ],
        prt_items: [
          {
            itm_id: 111,
            itm_prt_id: 1,
            itm_name: "Stud",
            itm_category: "Wood",
            itm_quantity: 10,
            itm_tags: ["lumber", "2x4"],
            itm_comments: [
              {
                text: "Beställt från <a href='https://www.bauhaus.se'>Bauhaus</a>. Leverans imorgon.",
                timestamp: "2024-12-01 11:15"
              }
            ],
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
                tsk_comments: [
                  {
                    text: "Använd <strong>skyddsutrustning</strong>! Safety first.",
                    timestamp: "2024-12-01 12:00"
                  }
                ],
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
                tsk_comments: [],
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
        prt_comments: [],
        prt_items: [
          {
            itm_id: 121,
            itm_prt_id: 2,
            itm_name: "Tile",
            itm_category: "Clay",
            itm_quantity: 100,
            itm_tags: ["ceramic", "red"],
            itm_comments: [
              {
                text: "Röda tegelpannor. Kolla leverantör www.takrenovering.se",
                timestamp: "2024-12-01 14:20"
              }
            ],
            itm_tasks: [
              {
                tsk_id: 1211,
                itm_id: 121,
                tsk_name: "Lay tiles",
                tsk_total_quantity: 100,
                tsk_work_task_duration: 0.2,
                tsk_material_amount: 1,
                tsk_material_user_price: 6,
                tsk_tags: ["installation", "manual"],
                tsk_comments: [],
              },
              {
                tsk_id: 1212,
                itm_id: 121,
                tsk_name: "Inspect tiles",
                tsk_total_quantity: 100,
                tsk_work_task_duration: 0.05,
                tsk_material_amount: 0.5,
                tsk_material_user_price: 2,
                tsk_tags: ["quality", "check"],
                tsk_comments: [],
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
let commentsModule = null;

// ======= INIT =======
calcUtils.updateAllData(project);
project.prt_parts?.forEach(p => { p.selected = p.selected ?? true; });

// ======= FÖRBÄTTRAD KOMMENTARS-AJAX HANTERING =======
const handleCommentUpdate = (entityType, rowData, fieldName, newComment) => {
  // Skapa standardiserat AJAX-anrop som matchar resten av applikationen
  let ajaxData = {
    action: "updateComment",
    entityType: entityType,
    fieldName: fieldName,
    comment: newComment
  };

  // Lägg till rätt ID-fält baserat på entitetstyp
  switch (entityType) {
    case 'part':
      ajaxData.prt_id = rowData.prt_id;
      ajaxData.prt_name = rowData.prt_name;
      break;
    case 'item':
      ajaxData.itm_id = rowData.itm_id;
      ajaxData.itm_name = rowData.itm_name;
      ajaxData.itm_prt_id = rowData.itm_prt_id;
      break;
    case 'task':
      ajaxData.tsk_id = rowData.tsk_id;
      ajaxData.tsk_name = rowData.tsk_name;
      ajaxData.tsk_itm_id = rowData.tsk_itm_id;
      break;
  }

  // Skicka AJAX-anropet
  ajaxHandler.queuedEchoAjax(ajaxData);
  
  // Logga för debugging
  console.log('Comment AJAX sent:', ajaxData);
};

// Initiera kommentarsystemet
const initCommentsModule = async () => {
  try {
    commentsModule = new TabulatorCommentsModule({
      modalId: 'commentModal',
      allowHtml: true,
      maxCommentLength: 1000
    });
    
    await commentsModule.init();
    
    // Sätt upp callback för AJAX-anrop när kommentarer uppdateras
    commentsModule.setCommentUpdateCallback(handleCommentUpdate);
    
    return commentsModule;
  } catch (error) {
    console.error('Failed to initialize comments module:', error);
    return null;
  }
};

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
  console.log('Tags AJAX sent:', ajaxData);
};

// ======= GEMENSAM KOLUMN =======
const deleteColumn = (cellClick) => ({ title: "", formatter: () => "🗑️", width: 50, hozAlign: "center", cellClick, headerSort: false });

// ======= TABELLKONFIGURATION =======
const getPartTableColumns = () => [
  deleteColumn(handleDeletePart),
  { title: "Markerad", field: "selected", formatter: "tickCross", editor: true, headerSort: false, width: 80, cellEdited: () => applyPartFilter() },
  { title: "Part-ID", field: "prt_id", width: 80 },
  { title: "Part-namn", field: "prt_name", formatter: "plaintext", editor: "input", cellEdited: updatePartName },
  { title: "Materialpris Tot", field: "prt_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Arbetstid Tot", field: "prt_work_task_duration_total", formatter: tableUtils.formatHours },
  // Lägg till kommentarskolumn för parts
  ...(commentsModule ? [commentsModule.createCommentColumn('part', 'prt_name', { width: 200, title: "Part Comments" })] : [])
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
  { title: "Materialpris", field: "itm_material_user_price", ...tableUtils.formatMoney },
  { title: "Materialpris Tot", field: "itm_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Arbetstid", field: "itm_work_task_duration", formatter: tableUtils.formatHours },
  { title: "Arbetstid Tot", field: "itm_work_task_duration_total", formatter: tableUtils.formatHours },
  // Lägg till kommentarskolumn för items
  ...(commentsModule ? [commentsModule.createCommentColumn('item', 'itm_name', { width: 200, title: "Item Comments" })] : [])
];

const getTaskTableColumns = () => [
  deleteColumn((e, cell) => handleDeleteTask(cell, cell.getRow().getData().tsk_itm_id)),
  { title: "Task-ID", field: "tsk_id", width: 70 },
  { title: "Task-namn", field: "tsk_name", editor: "input", cellEdited: updateTaskCell },
  { title: "Quantity", field: "tsk_total_quantity", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Amount", field: "tsk_material_amount", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Price", field: "tsk_material_user_price", editor: "number", cellEdited: updateTaskCell },
  { title: "Material Price Total", field: "tsk_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Work Duration", field: "tsk_work_task_duration", editor: "number", cellEdited: updateTaskCell },
  { title: "Work Duration Total", field: "tsk_work_task_duration_total", formatter: tableUtils.formatHours },
  // Lägg till kommentarskolumn för tasks
  ...(commentsModule ? [commentsModule.createCommentColumn('task', 'tsk_name', { width: 200, title: "Task Comments" })] : [])
];

// ======= DELETE HANDLERS =======
const handleDeletePart = (_e, cell) => {
  const { prt_id, prt_name } = cell.getRow().getData();
  if (!tableUtils.confirmMsg(`Vill du verkligen ta bort part "${prt_name}" och allt underliggande?`)) return;
  project.prt_parts = (project.prt_parts || []).filter(p => p.prt_id !== prt_id);
  partTable?.deleteRow(prt_id);
  (itemTable?.getData() || []).filter(i => i.itm_prt_id === prt_id).forEach(i => itemTable.deleteRow(i.itm_id));
  calcUtils.updateAllData(project); updatePartOptions(); applyPartFilter(); itemTable?.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, action: "deletePart" });
};

const handleDeleteItem = (_e, cell) => {
  const { itm_id, itm_name, itm_prt_id } = cell.getRow().getData();
  if (!tableUtils.confirmMsg(`Vill du verkligen ta bort item "${itm_name}" och dess tasks?`)) return;
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id); if (!part) return;
  part.prt_items = (part.prt_items || []).filter(i => i.itm_id !== itm_id);
  itemTable?.deleteRow(itm_id);
  subtableToggle.openItemRows.delete(itm_id);
  calcUtils.updateAllData(project); partTable.getRow(itm_prt_id)?.update(part); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, action: "deleteItem" });
};

const handleDeleteTask = (cell, itm_id) => {
  const { tsk_id, tsk_name } = cell.getRow().getData();
  if (!tableUtils.confirmMsg(`Vill du verkligen ta bort task "${tsk_name}"?`)) return;
  const item = tableUtils.findItemById(project, itm_id); if (!item) return;
  item.itm_tasks = (item.itm_tasks || []).filter(t => t.tsk_id !== tsk_id);
  const itemRow = itemTable.getRow(itm_id); itemRow?._subTaskTable?.deleteRow(tsk_id);
  calcUtils.updateAllData(project); updateDataAndRefresh(item);
  ajaxHandler.queuedEchoAjax({ tsk_id, action: "deleteTask" });
};

// ======= TABELLER =======
const setupTables = async () => {
  // Vänta på att kommentarsmodulen är initierad
  if (!commentsModule) {
    commentsModule = await initCommentsModule();
  }
  
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
          
          // Registrera task-tabellen för kommentarssystemet
          if (commentsModule) {
            commentsModule.registerTable(`taskTable_${itm_id}`, taskTable);
          }
        } else holderEl.appendChild(uiHelpers.createFooterButton("Lägg till Task", () => addTaskRow(d)));
      } else holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none";
      subtableToggle.restoreToggleState(row);
    },
  });
  itemTable.on("tableBuilt", () => { applyPartFilter(); updatePartOptions(); });
  
  // Registrera tabeller för kommentarssystemet
  if (commentsModule) {
    commentsModule.registerTable('partTable', partTable);
    commentsModule.registerTable('itemTable', itemTable);
  }
};

// ======= LÄGG TILL-RADER =======
const addPartRow = () => {
  const newId = tableUtils.getNextPartId(project), newPart = { prt_id: newId, prt_prj_id: project.prj_id, prt_name: `Ny Part ${newId}`, prt_items: [], selected: true, prt_tags: [], prt_comments: [] };
  (project.prt_parts ||= []).push(newPart); calcUtils.updateAllData(project); partTable.addRow(newPart); updatePartOptions(); applyPartFilter();
  ajaxHandler.queuedEchoAjax({ prt_id: newId, prt_name: newPart.prt_name, action: "addPart" });
  setTimeout(() => partTable.getRow(newId)?.getCell("prt_name").edit(), 0);
};

const addItemRow = () => {
  const newId = tableUtils.getNextItemId(project), targetPart = project.prt_parts?.find(p => p.selected) || project.prt_parts?.[0];
  if (!targetPart) return ajaxHandler.showUserError("Skapa först en Part.");
  const newTaskId = tableUtils.getNextTaskId(project), newTask = { tsk_id: newTaskId, tsk_itm_id: newId, tsk_name: `Ny Task ${newTaskId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [], tsk_comments: [] };
  const newItem = { itm_id: newId, itm_prt_id: targetPart.prt_id, itm_name: `Ny Item ${newId}`, itm_category: "", itm_quantity: 1, itm_tasks: [newTask], itm_tags: [], itm_comments: [] };
  (targetPart.prt_items ||= []).push(newItem); calcUtils.updateAllData(project); itemTable.addRow(newItem); subtableToggle.openItemRows.add(newId);
  ajaxHandler.queuedEchoAjax({ itm_id: newId, itm_name: newItem.itm_name, action: "addItem" });
  ajaxHandler.queuedEchoAjax({ tsk_id: newTaskId, tsk_name: newTask.tsk_name, itm_id: newId, action: "addTask" });
  setTimeout(() => itemTable.getRow(newId)?.getCell("itm_name").edit(), 0);
};

const addTaskRow = (itemData) => {
  const newId = tableUtils.getNextTaskId(project), newTask = { tsk_id: newId, tsk_itm_id: itemData.itm_id, tsk_name: `Ny Task ${newId}`, tsk_total_quantity: 1, tsk_work_task_duration: 0, tsk_material_amount: 0, tsk_material_user_price: 0, tsk_tags: [], tsk_comments: [] };
  const item = tableUtils.findItemById(project, itemData.itm_id); if (!item) return;
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
  const { prt_id } = cell.getRow().getData();
  let newName = cell.getValue();
  
  // Förbättrad sanitering
  if (typeof newName === 'string') {
    newName = newName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/javascript:/gi, "")  // Ta bort javascript: protokoll
      .replace(/data:/gi, "")        // Ta bort data: protokoll
      .replace(/vbscript:/gi, "")    // Ta bort vbscript: (IE)
      .trim(); // Ta bort whitespace i början/slutet
  }
  
  const part = project.prt_parts?.find(p => p.prt_id === prt_id); 
  if (!part) return;
  
  part.prt_name = newName;
  calcUtils.updateAllData(project); 
  cell.getRow().update(part); 
  updatePartOptions(); 
  itemTable.redraw(true);
  
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

    // Använd TagSystemUtils' tagg-editor och patcha för AJAX
    tags.tagEditor = function(cell, onRendered, success, cancel, editorParams) {
      return tags.createTagEditor(cell, onRendered, success, cancel, tagField, entityType, project, handleTagUpdate, tableUtils.findPartById, tableUtils.findItemById, tableUtils.findTaskById);
    };

    // Patch customTagHeaderFilter för rätt fältnamn
    const originalHeaderFilter = tags.customTagHeaderFilter.bind(tags);
    tags.customTagHeaderFilter = function(headerValue, rowValue, rowData, filterParams) {
      return originalHeaderFilter(headerValue, rowValue, rowData, filterParams);
    };

    tags.init(table, { filterLogic: "AND", tagsField: tagField });

    tags.ensureTagsArray(table, entityType);

    // Modifierad kolumn-konfiguration med AJAX-hantering
    const tagCol = tags.getColumnConfig(tagField);
    
    // Wrappa den ursprungliga editorn för att lägga till AJAX-funktionalitet
    const originalEditor = tagCol.editor;
    tagCol.editor = function(cell, onRendered, success, cancel, editorParams) {
      const rowData = cell.getRow().getData();
      const oldTags = Array.isArray(rowData[tagField]) ? [...rowData[tagField]] : [];
      
      return tags.createTagEditor(cell, onRendered, (newTags) => {
        // Uppdatera data i rätt entitet baserat på tabelltyp
        let entityId, entityTypeStr;
        
        if (entityType === "part") {
          entityId = rowData.prt_id;
          entityTypeStr = "part";
          // Uppdatera part i project data
          const part = tableUtils.findPartById(project, entityId);
          if (part) {
            part.prt_tags = newTags || [];
          }
        } else if (entityType === "item") {
          entityId = rowData.itm_id;
          entityTypeStr = "item";
          // Uppdatera item i project data
          const item = tableUtils.findItemById(project, entityId);
          if (item) {
            item.itm_tags = newTags || [];
          }
        } else if (entityType === "task") {
          entityId = rowData.tsk_id;
          entityTypeStr = "task";
          // Uppdatera task i project data
          const task = tableUtils.findTaskById(project, entityId);
          if (task) {
            task.tsk_tags = newTags || [];
          }
        }
        
        // Skicka AJAX-anrop för tagguppdatering
        handleTagUpdate(entityTypeStr, entityId, newTags || [], oldTags);
        
        // Anropa ursprunglig success-callback
        success(newTags);
      }, cancel, tagField, entityType, project);
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

// ======= UI INIT =======
const initUI = async () => {
  partColors.createColorStyles();
  
  // Initiera kommentarsmodulen först
  commentsModule = await initCommentsModule();
  
  // Sedan sätt upp tabellerna
  await setupTables();
  
  // Initiera taggar när tabellerna finns
  waitForTables(["#part-table", "#item-table"])
    .then(([partTable, itemTable]) => {
      addTagsToTable(partTable, "part");
      addTagsToTable(itemTable, "item");
    })
    .catch(err => console.warn("Tagg-init misslyckades:", err));

  const handlers = {
    "redraw-items-btn": () => itemTable.redraw(true),
    "update-item-part-names-btn": () => { itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts)); updatePartOptions(); applyPartFilter(); itemTable.redraw(true); }
  };
  Object.entries(handlers).forEach(([id, h]) => document.getElementById(id)?.addEventListener("click", h));
};

document.addEventListener("DOMContentLoaded", initUI);
