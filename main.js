// ======= IMPORTS =======
import * as calcUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@d587c03c86ac06b263c941591935651ac0a1a0eb/projectCalcUtils.js";
import * as uiHelpers from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@afa909f041ec1778ed172a24de1d1d9ddab86921/uiHelpers.js";
import * as subtableToggle from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@229107bdd0fe8badb9cfc4b3280711a216246af8/subtableToggle.js";
import * as ajaxHandler from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@9862307261c7302923533e523fb8c01caf332b7f/ajaxHandler.js";
import * as partColors from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@44be448b9cbc2cff2549fab8ece33944dd33ada1/partColors.js";
import TagSystemUtils, { addTagsToTable } from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@5769333c6df2eab8b457c625d5e0a10ea368579d/tagSystemUtils.js";
import { TabulatorCommentsModule } from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@88c9adac5d37273f453a98392476a1cda6bb9654/commentSystem.js";
import * as tableUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@7bffba94d2f334d5b5ea34bb49743459ba05cba1/tableUtils.js"; 
import * as ItemManager from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@91210c6dfa4e5681373dcabf0aeba22b060c19d8/ItemManager.js";
import MaterialLinksModule from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@0fbe21b36caab5ce08f86634a61272d3cd9a5eea/materialLinks.js";
import { mathExpressionEditor } from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@2cbad2a1e5793822760906fc1b44c489b3b03b20/mathExpressionEditor.js";
import * as ExportModule from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@06e5ba13188cf37f5336ccbb0246c9c5f2909a17/ExportModule.js";

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
                tsk_itm_id: 121,
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
                tsk_itm_id: 121,
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

// ======= GEMENSAM KOLUMN =======
const deleteColumn = (cellClick) => ({
  title: "", formatter: () => "🗑️", width: 50, hozAlign: "center", cellClick, headerSort: false
});

// ======= TABELLKONFIGURATION =======
const getPartTableColumns = () => [
  deleteColumn((e, cell) => ItemManager.handleDeletePart(project, cell.getRow().getData(), partTable, itemTable, updatePartOptions, applyPartFilter)),
  { title: "Markerad", field: "selected", formatter: "tickCross", editor: true, headerSort: false, width: 80, cellEdited: () => applyPartFilter() },
  { title: "Part-ID", field: "prt_id", width: 80 },
  { title: "Part-namn", field: "prt_name", formatter: "plaintext", editor: "input", cellEdited: (cell) => ItemManager.updatePartName(project, cell, partTable, itemTable, updatePartOptions) },
  { title: "Materialpris Tot", field: "prt_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Arbetstid Tot", field: "prt_work_task_duration_total", formatter: tableUtils.formatHours },
  ExportModule.getPartExportColumn({
    exclude: ["selected", "prt_comments", "prt_tags", "_subTaskTable"]
  }),
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
  deleteColumn((e, cell) => ItemManager.handleDeleteItem(project, cell.getRow().getData(), partTable, itemTable, subtableToggle.openItemRows, updatePartOptions, applyPartFilter)),
  { title: "Item-ID", field: "itm_id", width: 70 },
  { title: "Item-namn", field: "itm_name", editor: "input", cellEdited: (cell) => ItemManager.updateItemCell(project, cell, itemTable, partTable) },
  {
    title: "Part", field: "itm_prt_id", editor: "list",
    editorParams: () => ({ values: calcUtils.getPartOptions(project) }),
    formatter: cell => calcUtils.getPartLookup(project)[cell.getValue()] || "Okänd part",
    cellEdited: (cell) => ItemManager.moveItemPartCell(project, cell, partTable, itemTable, partColors, applyPartFilter)
  },
  { title: "Antal", field: "itm_quantity", editor: mathExpressionEditor, cellEdited: (cell) => ItemManager.updateItemCell(project, cell, itemTable, partTable) },
  { title: "Materialpris", field: "itm_material_user_price", ...tableUtils.formatMoney },
  { title: "Materialpris Tot", field: "itm_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Arbetstid", field: "itm_work_task_duration", formatter: tableUtils.formatHours },
  { title: "Arbetstid Tot", field: "itm_work_task_duration_total", formatter: tableUtils.formatHours },
  ExportModule.getItemExportColumn({
    exclude: ["selected", "itm_comments", "itm_tags", "_subTaskTable"]
  }),
  ...(commentsModule ? [commentsModule.createCommentColumn('item', 'itm_name', { width: 200, title: "Item Comments" })] : [])
];

const getTaskTableColumns = () => [
  deleteColumn((e, cell) => ItemManager.handleDeleteTask(project, cell.getRow().getData(), itemTable, subtableToggle.openItemRows)),
  { title: "Task-ID", field: "tsk_id", width: 70 },
  { title: "Task-namn", field: "tsk_name", editor: "input", cellEdited: (cell) => ItemManager.updateTaskCell(project, cell, itemTable, partTable) },
  { title: "Quantity", field: "tsk_total_quantity", editor: mathExpressionEditor, cellEdited: (cell) => ItemManager.updateTaskCell(project, cell, itemTable, partTable) },

  // Material-länk-kolumner
  {
    title: "Material Number",
    field: "tsk_material_number",
    editor: "input",
    cellEdited: function(cell) {
      MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
      const rowData = cell.getRow().getData();
      ajaxHandler.queuedEchoAjax({
        tsk_id: rowData.tsk_id,
        field: "tsk_material_number",
        value: rowData.tsk_material_number,
        action: "updateTaskMaterialField"
      });
    }
  },
  {
    title: "Material Name",
    field: "tsk_material_name",
    editor: "input",
    cellEdited: function(cell) {
      MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
      const rowData = cell.getRow().getData();
      ajaxHandler.queuedEchoAjax({
        tsk_id: rowData.tsk_id,
        field: "tsk_material_name",
        value: rowData.tsk_material_name,
        action: "updateTaskMaterialField"
      });
    }
  },
  {
    title: "Material Type",
    field: "tsk_material_type",
    editor: "list",
    editorParams: { values: MaterialLinksModule.config.materialTypes },
    cellEdited: function(cell) {
      MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
      const rowData = cell.getRow().getData();
      ajaxHandler.queuedEchoAjax({
        tsk_id: rowData.tsk_id,
        field: "tsk_material_type",
        value: rowData.tsk_material_type,
        action: "updateTaskMaterialField"
      });
    }
  },
  {
    title: "Material Links",
    field: "tsk_material_link",
    formatter: function(cell) {
      const rowData = cell.getRow().getData();
      const itemType = rowData.tsk_material_type;
      const typeLabels = MaterialLinksModule.config.linkTextPerType;
      return `<span class="link-like-text">${typeLabels[itemType] || typeLabels.default}</span>`;
    },
    cellClick: function(e, cell) {
      const rowData = cell.getRow().getData();
      MaterialLinksModule.linksModalUtils.show(
        rowData.tsk_material_number,
        rowData.tsk_material_name,
        rowData.tsk_material_type,
        MaterialLinksModule
      );
    },
    width: 120,
    hozAlign: "center"
  },

  { title: "Material Amount", field: "tsk_material_amount", editor: mathExpressionEditor, cellEdited: (cell) => ItemManager.updateTaskCell(project, cell, itemTable, partTable) },
  { title: "Material Price", field: "tsk_material_user_price", editor: mathExpressionEditor, cellEdited: (cell) => ItemManager.updateTaskCell(project, cell, itemTable, partTable) },
  { title: "Material Price Total", field: "tsk_material_user_price_total", ...tableUtils.formatMoney },
  { title: "Work Duration", field: "tsk_work_task_duration", editor: "number", cellEdited: (cell) => ItemManager.updateTaskCell(project, cell, itemTable, partTable) },
  { title: "Work Duration Total", field: "tsk_work_task_duration_total", formatter: tableUtils.formatHours },

  ExportModule.getTaskExportColumn({
    exclude: ["tsk_comments", "tsk_tags"]
  }),

  ...(commentsModule ? [commentsModule.createCommentColumn('task', 'tsk_name', { width: 200, title: "Task Comments" })] : [])
];

// ======= TABELLER =======
const setupTables = async () => {
  if (!commentsModule) {
    commentsModule = await initCommentsModule();
  }

  MaterialLinksModule.init();

  partTable = new Tabulator("#part-table", {
    index: "prt_id",
    data: project.prt_parts || [],
    layout: "fitDataFill",
    columns: getPartTableColumns(),
    footerElement: uiHelpers.createFooterButton("Lägg till Part", () =>
      ItemManager.addPartRow(project, partTable, itemTable, updatePartOptions, applyPartFilter)
    ),
    rowFormatter: (row) => partColors.applyPartColorToRow(row, row.getData().prt_id)
  });

  itemTable = new Tabulator("#item-table", {
    index: "itm_id",
    data: calcUtils.getAllItemsWithPartRef(project.prt_parts),
    layout: "fitDataFill",
    columns: getItemTableColumns(),
    footerElement: uiHelpers.createFooterButton("Lägg till Item", () =>
      ItemManager.addItemRow(project, itemTable, partTable, updatePartOptions, applyPartFilter, subtableToggle.openItemRows)
    ),
    rowFormatter: (row) => {
      const d = row.getData(), itm_id = d.itm_id, partId = d.itm_prt_id;
      partColors.applyPartColorToRow(row, partId);
      let holderEl = row.getElement().querySelector(".subtable-holder");
      if (!holderEl) {
        holderEl = document.createElement("div");
        holderEl.className = "subtable-holder";
        holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none";
        row.getElement().appendChild(holderEl);
        if ((d.itm_tasks || []).length) {
          const taskDiv = document.createElement("div");
          holderEl.appendChild(taskDiv);
          const taskTable = new Tabulator(taskDiv, {
            index: "tsk_id",
            data: d.itm_tasks,
            layout: "fitDataFill",
            columns: getTaskTableColumns(),
            footerElement: uiHelpers.createFooterButton("Lägg till Task", () =>
              ItemManager.addTaskRow(project, d, itemTable, subtableToggle.openItemRows)
            ),
            rowFormatter: (taskRow) => partColors.applyPartColorToRow(taskRow, partId)
          });
          row._subTaskTable = taskTable;
          addTagsToTable(taskTable, "task", project, ajaxHandler.handleTagUpdate, tableUtils);
          if (commentsModule) {
            commentsModule.registerTable(`taskTable_${itm_id}`, taskTable);
          }
        } else {
          holderEl.appendChild(uiHelpers.createFooterButton("Lägg till Task", () =>
            ItemManager.addTaskRow(project, d, itemTable, subtableToggle.openItemRows)
          ));
        }
      } else {
        holderEl.style.display = subtableToggle.openItemRows.has(itm_id) ? "block" : "none";
      }
      subtableToggle.restoreToggleState(row);
    },
  });

  itemTable.on("tableBuilt", () => { applyPartFilter(); updatePartOptions(); });

  if (commentsModule) {
    commentsModule.registerTable('partTable', partTable);
    commentsModule.registerTable('itemTable', itemTable);
  }
};

// ======= FILTER & OPTIONS =======
let itemsTagFilter = null;

const applyPartFilter = () => {
  const selectedIds = (partTable?.getData() || []).filter(p => p.selected).map(p => p.prt_id);
  const combinedFilter = (data, filterParams) => {
    const partMatch = selectedIds.length > 0 && selectedIds.includes(data.itm_prt_id);
    if (!partMatch) return false;
    if (itemsTagFilter && itemsTagFilter.length > 0) {
      const tags = Array.isArray(data.itm_tags) ? data.itm_tags : [];
      if (tags.length === 0) return false;
      const tagUtils = window.__tagUtils?.['item-table'];
      const logic = tagUtils?.getFilterLogic() || 'AND';
      if (logic === 'AND') {
        return itemsTagFilter.every(selectedTag => tags.includes(selectedTag));
      } else {
        return itemsTagFilter.some(selectedTag => tags.includes(selectedTag));
      }
    }
    return true;
  };
  itemTable.setFilter(combinedFilter);
};

const updatePartOptions = () => {
  const col = itemTable.getColumn("itm_prt_id"),
    partOptions = calcUtils.getPartOptions(project),
    partLookup = calcUtils.getPartLookup(project);
  col?.updateDefinition({
    editorParams: { values: partOptions },
    formatter: cell => partLookup[cell.getValue()] || "Okänd part"
  });
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

// ======= UI INIT =======
const initUI = async () => {
  partColors.createColorStyles();
  commentsModule = await initCommentsModule();
  await setupTables();
  waitForTables(["#part-table", "#item-table"])
    .then(([partTable, itemTable]) => {
      addTagsToTable(partTable, "part", project, ajaxHandler.handleTagUpdate, tableUtils);
      addTagsToTable(itemTable, "item", project, ajaxHandler.handleTagUpdate, tableUtils);
    })
    .catch(err => console.warn("Tagg-init misslyckades:", err));
  const handlers = {
    "redraw-items-btn": () => itemTable.redraw(true),
    "update-item-part-names-btn": () => {
      itemTable.setData(calcUtils.getAllItemsWithPartRef(project.prt_parts));
      updatePartOptions();
      applyPartFilter();
      itemTable.redraw(true);
    }
  };
  Object.entries(handlers).forEach(([id, h]) => document.getElementById(id)?.addEventListener("click", h));
};

document.addEventListener("DOMContentLoaded", initUI);
