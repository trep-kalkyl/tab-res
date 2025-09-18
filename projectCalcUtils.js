// ======= projectCalcUtils.js =======

const DEBUG = false;

// Calculation helpers
export function updateTaskTotals(task) {
  if (DEBUG) console.log("[updateTaskTotals][IN]", { tsk_id: task?.tsk_id });
  const quantity = Number(task.tsk_total_quantity) || 0;
  const amount = Number(task.tsk_material_amount) || 0;
  const price = Number(task.tsk_material_user_price) || 0;
  const duration = Number(task.tsk_work_task_duration) || 0;
  task.tsk_material_user_price_total = quantity * amount * price;
  task.tsk_work_task_duration_total = quantity * duration;
  if (DEBUG) console.log("[updateTaskTotals][OUT]", {
    tsk_id: task?.tsk_id,
    mat_total: task.tsk_material_user_price_total,
    dur_total: task.tsk_work_task_duration_total
  });
}

export function updateItemTotals(item) {
  if (DEBUG) console.log("[updateItemTotals][IN]", { itm_id: item?.itm_id });
  if (!item?.itm_tasks) return;
  item.itm_tasks.forEach(updateTaskTotals);
  item.itm_material_user_price = item.itm_tasks.reduce(
    (sum, t) => sum + (Number(t.tsk_material_user_price_total) || 0), 0);
  item.itm_work_task_duration = item.itm_tasks.reduce(
    (sum, t) => sum + (Number(t.tsk_work_task_duration_total) || 0), 0);
  const quantity = Number(item.itm_quantity) || 0;
  item.itm_material_user_price_total = quantity * item.itm_material_user_price;
  item.itm_work_task_duration_total = quantity * item.itm_work_task_duration;
  if (DEBUG) console.log("[updateItemTotals][OUT]", {
    itm_id: item?.itm_id,
    mat_total: item.itm_material_user_price_total,
    dur_total: item.itm_work_task_duration_total
  });
}

export function updatePartTotals(part) {
  if (DEBUG) console.log("[updatePartTotals][IN]", { prt_id: part?.prt_id });
  if (!part?.prt_items) return;
  part.prt_items.forEach(updateItemTotals);
  part.prt_material_user_price_total = part.prt_items.reduce(
    (sum, i) => sum + (Number(i.itm_material_user_price_total) || 0), 0);
  part.prt_work_task_duration_total = part.prt_items.reduce(
    (sum, i) => sum + (Number(i.itm_work_task_duration_total) || 0), 0);
  if (DEBUG) console.log("[updatePartTotals][OUT]", {
    prt_id: part?.prt_id,
    mat_total: part.prt_material_user_price_total,
    dur_total: part.prt_work_task_duration_total
  });
}

export function updateProjectTotals(project) {
  if (DEBUG) console.log("[updateProjectTotals][IN]", { parts: project?.prt_parts?.length });
  if (!project?.prt_parts) return;
  project.prj_material_user_price_total = project.prt_parts.reduce(
    (sum, p) => sum + (Number(p.prt_material_user_price_total) || 0), 0
  );
  project.prj_work_task_duration_total = project.prt_parts.reduce(
    (sum, p) => sum + (Number(p.prt_work_task_duration_total) || 0), 0
  );
  if (DEBUG) console.log("[updateProjectTotals][OUT]", {
    mat_total: project.prj_material_user_price_total,
    dur_total: project.prj_work_task_duration_total
  });
}

export function updateAllData(project) {
  if (DEBUG) console.log("[updateAllData][IN]", { parts: project?.prt_parts?.length });
  if (!project?.prt_parts) return;
  project.prt_parts.forEach(updatePartTotals);
  updateProjectTotals(project);
  if (DEBUG) console.log("[updateAllData][OUT]", {
    prj_mat_total: project.prj_material_user_price_total,
    prj_dur_total: project.prj_work_task_duration_total
  });
}

// Data helpers

export function getAllItemsWithPartRef(parts, selectedParts) {
  if (DEBUG) console.log("[getAllItemsWithPartRef][IN]", {
    parts: parts?.length, selectedParts: selectedParts?.length
  });
  if (!parts) return [];
  const result = parts.flatMap(part =>
    (!selectedParts || selectedParts.includes(part.prt_id))
      ? (part.prt_items || [])
      : []
  );
  if (DEBUG) console.log("[getAllItemsWithPartRef][OUT]", { items: result.length });
  return result;
}

export function getPartOptions(project) {
  if (DEBUG) console.log("[getPartOptions][IN]", { parts: project?.prt_parts?.length });
  const options = project.prt_parts?.map(p => ({
    value: p.prt_id,
    label: p.prt_name || `Part ${p.prt_id}`,
  })) || [];
  if (DEBUG) console.log("[getPartOptions][OUT]", { count: options.length });
  return options;
}

export function getPartLookup(project) {
  if (DEBUG) console.log("[getPartLookup][IN]", { parts: project?.prt_parts?.length });
  const lookup = Object.fromEntries(getPartOptions(project).map(p => [p.value, p.label]));
  if (DEBUG) console.log("[getPartLookup][OUT]", { keys: Object.keys(lookup).length });
  return lookup;
}

// Move item between parts
export function moveItemToPart(project, itemId, newPartId) {
  if (DEBUG) {
    console.log("[moveItemToPart][IN]", { itemId, newPartId, partCount: project.prt_parts?.length });
  }

  let oldPart = null, item = null;
  for (const part of project.prt_parts || []) {
    const idx = (part.prt_items || []).findIndex(i => i.itm_id === itemId);
    if (idx >= 0) {
      oldPart = part;
      item = part.prt_items[idx];
      part.prt_items.splice(idx, 1);
      break;
    }
  }
  if (!item) {
    if (DEBUG) console.log("[moveItemToPart][OUT] item not found", { itemId });
    return {newItem: null, oldPart: null, newPart: null};
  }
  const newPart = project.prt_parts?.find(p => p.prt_id == newPartId);
  if (!newPart) {
    if (oldPart) oldPart.prt_items.push(item);
    if (DEBUG) console.log("[moveItemToPart][OUT] newPart not found", { newPartId });
    return {newItem: null, oldPart, newPart: null};
  }
  item.itm_prt_id = newPart.prt_id;
  if (!newPart.prt_items) newPart.prt_items = [];
  newPart.prt_items.push(item);

  updatePartTotals(oldPart);
  updatePartTotals(newPart);
  updateProjectTotals(project);

  if (DEBUG) {
    console.log("[moveItemToPart][OUT]", {
      movedItem: item.itm_id,
      from: oldPart?.prt_id,
      to: newPart.prt_id,
      oldPartItems: oldPart?.prt_items?.length,
      newPartItems: newPart.prt_items?.length,
    });
  }

  return {
    newItem: item,
    oldPart,
    newPart
  };
}

// Helpers for next id, find, selected, etc.

export function getNextPartId(project) {
  if (DEBUG) console.log("[getNextPartId][IN]", { parts: project?.prt_parts?.length });
  const max = project.prt_parts?.reduce((acc, p) => Math.max(acc, Number(p.prt_id) || 0), 0) || 0;
  if (DEBUG) console.log("[getNextPartId][OUT]", { next: max + 1 });
  return max + 1;
}

export function getNextItemId(project) {
  if (DEBUG) console.log("[getNextItemId][IN]", { parts: project?.prt_parts?.length });
  let max = 0;
  for (const part of project.prt_parts || []) {
    for (const item of part.prt_items || []) {
      max = Math.max(max, Number(item.itm_id) || 0);
    }
  }
  if (DEBUG) console.log("[getNextItemId][OUT]", { next: max + 1 });
  return max + 1;
}

export function getNextTaskId(project) {
  if (DEBUG) console.log("[getNextTaskId][IN]", { parts: project?.prt_parts?.length });
  let max = 0;
  for (const part of project.prt_parts || []) {
    for (const item of part.prt_items || []) {
      for (const task of item.itm_tasks || []) {
        max = Math.max(max, Number(task.tsk_id) || 0);
      }
    }
  }
  if (DEBUG) console.log("[getNextTaskId][OUT]", { next: max + 1 });
  return max + 1;
}

export function findItemById(project, itm_id) {
  if (DEBUG) console.log("[findItemById][IN]", { itm_id });
  for (const part of project.prt_parts || []) {
    for (const item of part.prt_items || []) {
      if (item.itm_id == itm_id) {
        if (DEBUG) console.log("[findItemById][OUT]", { found: true, itm_id });
        return item;
      }
    }
  }
  if (DEBUG) console.log("[findItemById][OUT]", { found: false, itm_id });
  return null;
}

export function getSelectedPartIds(parts) {
  if (DEBUG) console.log("[getSelectedPartIds][IN]", { parts: parts?.length });
  const selected = (parts || []).filter(p => p.selected).map(p => p.prt_id);
  if (DEBUG) console.log("[getSelectedPartIds][OUT]", { count: selected.length });
  return selected;
}

/**
 * Beräknar summerad material- och arbetstid för ett Item-array (t.ex. filtrerat från Tabulator).
 * @param {Array} items - Array av item-objekt
 * @returns {Object} { materialTotal, workTotal }
 */
export function sumItemTotals(items) {
  let materialTotal = 0, workTotal = 0;
  (items || []).forEach(item => {
    materialTotal += Number(item.itm_material_user_price_total) || 0;
    workTotal    += Number(item.itm_work_task_duration_total) || 0;
  });
  return { materialTotal, workTotal };
}

/**
 * Summerar materialkostnad och arbetstid per construction stage bland ett array av items.
 * @param {Array} items - Array av item-objekt.
 * @returns {Object} { [stageName]: { materialTotal, workTotal } }
 */
export function sumTotalsPerStage(items) {
  const stageSums = {};
  (items || []).forEach(item => {
    (item.itm_tasks || []).forEach(task => {
      const stage = task.tsk_construction_stage || 'Okänd';
      if (!stageSums[stage]) stageSums[stage] = { materialTotal: 0, workTotal: 0 };
      stageSums[stage].materialTotal += Number(task.tsk_material_user_price_total) || 0;
      stageSums[stage].workTotal    += Number(task.tsk_work_task_duration_total) || 0;
    });
  });
  return stageSums;
}
