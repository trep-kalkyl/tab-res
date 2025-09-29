// ItemManager.js - Handles add, delete, and update logic for Parts, Items, and Tasks in Tabulator project structure

import * as calcUtils from "./projectCalcUtils.js";
import * as ajaxHandler from "./ajaxHandler.js";

/**
 * Utility: Confirm dialog
 */
export function confirmMsg(msg) {
  return window.confirm(msg);
}

/**
 * Add a new Part to the project.
 */
export function addPartRow(project, partTable, itemTable, updatePartOptions, applyPartFilter) {
  const newId = calcUtils.getNextPartId(project);
  const newPart = {
    prt_id: newId,
    prt_prj_id: project.prj_id,
    prt_name: `Ny Part ${newId}`,
    prt_items: [],
    selected: true,
    prt_tags: [],
    prt_comments: []
  };
  (project.prt_parts ||= []).push(newPart);
  calcUtils.updateAllData(project);
  partTable.addRow(newPart);
  if (updatePartOptions) updatePartOptions();
  if (applyPartFilter) applyPartFilter();
  ajaxHandler.queuedEchoAjax({ prt_id: newId, prt_name: newPart.prt_name, action: "addPart" });
  setTimeout(() => partTable.getRow(newId)?.getCell("prt_name").edit(), 0);
}

/**
 * Add a new Item to the currently selected (or first) Part.
 */
export function addItemRow(project, itemTable, partTable, updatePartOptions, applyPartFilter, openItemRows) {
  const newId = calcUtils.getNextItemId(project);
  const targetPart = project.prt_parts?.find(p => p.selected) || project.prt_parts?.[0];
  if (!targetPart) {
    ajaxHandler.showUserError("Skapa först en Part.");
    return;
  }
  const newTaskId = calcUtils.getNextTaskId(project);
  const newTask = {
    tsk_id: newTaskId,
    tsk_itm_id: newId,
    tsk_name: `Ny Task ${newTaskId}`,
    tsk_total_quantity: 1,
    tsk_work_task_duration: 0,
    tsk_material_amount: 0,
    tsk_material_user_price: 0,
    tsk_tags: [],
    tsk_comments: []
  };
  const newItem = {
    itm_id: newId,
    itm_prt_id: targetPart.prt_id,
    itm_name: `Ny Item ${newId}`,
    itm_category: "",
    itm_quantity: 1,
    itm_tasks: [newTask],
    itm_tags: [],
    itm_comments: []
  };
  (targetPart.prt_items ||= []).push(newItem);
  calcUtils.updateAllData(project);
  itemTable.addRow(newItem);
  if (openItemRows) openItemRows.add(newId);
  ajaxHandler.queuedEchoAjax({ itm_id: newId, itm_name: newItem.itm_name, action: "addItem" });
  ajaxHandler.queuedEchoAjax({ tsk_id: newTaskId, tsk_name: newTask.tsk_name, itm_id: newId, action: "addTask" });
  setTimeout(() => itemTable.getRow(newId)?.getCell("itm_name").edit(), 0);
}

/**
 * Add a new Task to an Item.
 */
export function addTaskRow(project, itemData, itemTable, openItemRows) {
  const newId = calcUtils.getNextTaskId(project);
  const newTask = {
    tsk_id: newId,
    tsk_itm_id: itemData.itm_id,
    tsk_name: `Ny Task ${newId}`,
    tsk_total_quantity: 1,
    tsk_work_task_duration: 0,
    tsk_material_amount: 0,
    tsk_material_user_price: 0,
    tsk_tags: [],
    tsk_comments: []
  };
  const item = calcUtils.findItemById(project, itemData.itm_id);
  if (!item) return;
  (item.itm_tasks ||= []).push(newTask);
  calcUtils.updateAllData(project);
  const itemRow = itemTable.getRow(itemData.itm_id);
  if (!itemRow) return;
  if (itemRow._subTaskTable) {
    itemRow._subTaskTable.addRow(newTask);
  } else {
    itemTable.redraw(true);
  }
  updateDataAndRefresh(project, item, null, itemTable, null);
  if (openItemRows) openItemRows.add(itemData.itm_id);
  ajaxHandler.queuedEchoAjax({ tsk_id: newId, tsk_name: newTask.tsk_name, itm_id: itemData.itm_id, action: "addTask" });
  setTimeout(() => itemRow._subTaskTable?.getRow(newId)?.getCell("tsk_name").edit(), 0);
}

/**
 * Delete a Part (and all its Items/Tasks).
 */
export function handleDeletePart(project, rowData, partTable, itemTable, updatePartOptions, applyPartFilter) {
  const { prt_id, prt_name } = rowData;
  if (!confirmMsg(`Vill du verkligen ta bort part "${prt_name}" och allt underliggande?`)) return;
  project.prt_parts = (project.prt_parts || []).filter(p => p.prt_id !== prt_id);
  partTable?.deleteRow(prt_id);
  (itemTable?.getData() || []).filter(i => i.itm_prt_id === prt_id).forEach(i => itemTable.deleteRow(i.itm_id));
  calcUtils.updateAllData(project);
  if (updatePartOptions) updatePartOptions();
  if (applyPartFilter) applyPartFilter();
  itemTable?.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, action: "deletePart" });
}

/**
 * Delete an Item (and all its Tasks).
 */
export function handleDeleteItem(project, rowData, partTable, itemTable, openItemRows, updatePartOptions, applyPartFilter) {
  const { itm_id, itm_name, itm_prt_id } = rowData;
  if (!confirmMsg(`Vill du verkligen ta bort item "${itm_name}" och dess tasks?`)) return;
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id);
  if (!part) return;
  part.prt_items = (part.prt_items || []).filter(i => i.itm_id !== itm_id);
  itemTable?.deleteRow(itm_id);
  if (openItemRows) openItemRows.delete(itm_id);
  calcUtils.updateAllData(project);
  partTable.getRow(itm_prt_id)?.update(part);
  if (applyPartFilter) applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, action: "deleteItem" });
}

/**
 * Delete a Task from an Item.
 */
export function handleDeleteTask(project, rowData, itemTable, openItemRows) {
  const { tsk_id, tsk_name, tsk_itm_id } = rowData;
  if (!confirmMsg(`Vill du verkligen ta bort task "${tsk_name}"?`)) return;
  const item = calcUtils.findItemById(project, tsk_itm_id);
  if (!item) return;
  item.itm_tasks = (item.itm_tasks || []).filter(t => t.tsk_id !== tsk_id);
  const itemRow = itemTable.getRow(tsk_itm_id);
  itemRow?._subTaskTable?.deleteRow(tsk_id);
  calcUtils.updateAllData(project);
  updateDataAndRefresh(project, item, null, itemTable, null);
  ajaxHandler.queuedEchoAjax({ tsk_id, action: "deleteTask" });
}

/**
 * Update and refresh Item (and optionally Part) after changes.
 */
export function updateDataAndRefresh(project, item, part = null, itemTable = null, partTable = null) {
  calcUtils.updateAllData(project);
  if (itemTable) itemTable.getRow(item.itm_id)?.update(item);
  const targetPart = part || project.prt_parts?.find(p => p.prt_id === item.itm_prt_id);
  if (targetPart && partTable) partTable.getRow(targetPart.prt_id)?.update(targetPart);
}

/**
 * Update Part name with sanitization.
 */
export function updatePartName(project, cell, partTable, itemTable, updatePartOptions) {
  const { prt_id } = cell.getRow().getData();
  let newName = cell.getValue();
  // Sanitize
  if (typeof newName === 'string') {
    newName = newName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .replace(/vbscript:/gi, "")
      .trim();
  }
  const part = project.prt_parts?.find(p => p.prt_id === prt_id);
  if (!part) return;
  part.prt_name = newName;
  calcUtils.updateAllData(project);
  cell.getRow().update(part);
  if (updatePartOptions) updatePartOptions();
  itemTable.redraw(true);
  ajaxHandler.queuedEchoAjax({ prt_id, prt_name: newName, action: "updatePartName" });
}

/**
 * Update Item cell (e.g. name, quantity) and related totals.
 */
export function updateItemCell(project, cell, itemTable, partTable) {
  const { itm_id, itm_prt_id } = cell.getRow().getData();
  const part = project.prt_parts?.find(p => p.prt_id === itm_prt_id);
  const item = part?.prt_items?.find(i => i.itm_id === itm_id);
  if (!item) return;
  const field = cell.getField(), value = cell.getValue();
  item[field] = value;
  calcUtils.updateItemTotals(item);
  calcUtils.updatePartTotals(part);
  calcUtils.updateProjectTotals(project);
  updateDataAndRefresh(project, item, part, itemTable, partTable);
  ajaxHandler.queuedEchoAjax({ itm_id, [field]: value, action: "updateItem" });
}

/**
 * Move Item to another Part and update all references.
 */
export function moveItemPartCell(project, cell, partTable, itemTable, partColors, applyPartFilter) {
  const { itm_id } = cell.getRow().getData();
  const newPartId = cell.getValue();
  const { newItem, oldPart, newPart } = calcUtils.moveItemToPart(project, itm_id, newPartId);
  if (!newItem) return;
  calcUtils.updateAllData(project);
  [oldPart, newPart].forEach(p => p && partTable.getRow(p.prt_id)?.update(p));
  const row = cell.getRow();
  row.update(newItem);
  if (partColors) partColors.updateRowPartColor(row, newPartId);
  row._subTaskTable?.getRows().forEach(taskRow => partColors && partColors.updateRowPartColor(taskRow, newPartId));
  if (applyPartFilter) applyPartFilter();
  ajaxHandler.queuedEchoAjax({ itm_id, newPartId, action: "moveItemPart" });
}

/**
 * Update Task cell and recalculate all totals.
 * This version ensures totals update instantly for task, item, part, and project.
 */
export function updateTaskCell(project, cell, itemTable, partTable) {
  const taskData = cell.getRow().getData();
  let item = null, part = null, task = null;

  // Find parent Item, Part, and Task object
  for (const p of project.prt_parts || []) {
    for (const i of p.prt_items || []) {
      if (i.itm_id == taskData.tsk_itm_id) {
        item = i;
        part = p;
        task = i.itm_tasks?.find(t => t.tsk_id == taskData.tsk_id);
        break;
      }
    }
    if (item) break;
  }
  if (!task || !item || !part) return;

  const field = cell.getField(), value = cell.getValue();
  task[field] = value;

  // Recalculate all totals
  calcUtils.updateTaskTotals(task);
  calcUtils.updateItemTotals(item);
  calcUtils.updatePartTotals(part);
  calcUtils.updateProjectTotals(project);

  // Update rows in Tabulator
  cell.getRow().update({ ...task });
  if (itemTable) itemTable.getRow(item.itm_id)?.update({ ...item });
  if (partTable) partTable.getRow(part.prt_id)?.update({ ...part });

  ajaxHandler.queuedEchoAjax({ tsk_id: task.tsk_id, [field]: value, action: "updateTask" });
}

/**
 * Copy a Task: Deep clone a task in same Item, assign new ID, reset comments/tags, update all and sync Tabulator.
 */
export function copyTaskRow(project, rowData, itemTable, openItemRows) {
  // Find parent item
  const item = calcUtils.findItemById(project, rowData.tsk_itm_id);
  if (!item) return;

  // Deep clone and assign new ID
  const newTask = { ...JSON.parse(JSON.stringify(rowData)) };
  newTask.tsk_id = calcUtils.getNextTaskId(project);
  newTask.tsk_name = (rowData.tsk_name || "") + " (kopiera)";
  newTask.tsk_comments = [];
  newTask.tsk_tags = [];

  // Add to item
  item.itm_tasks.push(newTask);

  // Update all calculations
  calcUtils.updateAllData(project);

  // Update Tabulator subtable (if present) or redraw
  const itemRow = itemTable.getRow(item.itm_id);
  if (itemRow && itemRow._subTaskTable) {
    itemRow._subTaskTable.addRow(newTask);
  } else {
    itemTable.redraw(true);
  }
  // Keep subtable open
  openItemRows?.add(item.itm_id);

  // AJAX notify
  ajaxHandler.queuedEchoAjax({
    action: "copyTask",
    sourceTaskId: rowData.tsk_id,
    newTaskId: newTask.tsk_id,
    itemId: item.itm_id,
    partId: item.itm_prt_id,
    tsk_name: newTask.tsk_name,
  });

  // Optional: Focus name cell for edit
  setTimeout(() => itemRow._subTaskTable?.getRow(newTask.tsk_id)?.getCell("tsk_name").edit(), 0);
}
