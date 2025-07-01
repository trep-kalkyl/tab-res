// ======= projectCalcUtils.js =======

// Calculation helpers
export function updateTaskTotals(task) {
  const quantity = Number(task.tsk_total_quantity) || 0;
  const amount = Number(task.tsk_material_amount) || 0;
  const price = Number(task.tsk_material_user_price) || 0;
  const duration = Number(task.tsk_work_task_duration) || 0;
  task.tsk_material_user_price_total = quantity * amount * price;
  task.tsk_work_task_duration_total = quantity * duration;
}

export function updateItemTotals(item) {
  if (!item?.itm_tasks) return;
  item.itm_tasks.forEach(updateTaskTotals);
  item.itm_material_user_price = item.itm_tasks.reduce(
    (sum, t) => sum + (Number(t.tsk_material_user_price_total) || 0), 0);
  item.itm_work_task_duration = item.itm_tasks.reduce(
    (sum, t) => sum + (Number(t.tsk_work_task_duration_total) || 0), 0);
  const quantity = Number(item.itm_quantity) || 0;
  item.itm_material_user_price_total = quantity * item.itm_material_user_price;
  item.itm_work_task_duration_total = quantity * item.itm_work_task_duration;
}

export function updatePartTotals(part) {
  if (!part?.prt_items) return;
  part.prt_items.forEach(updateItemTotals);
  part.prt_material_user_price_total = part.prt_items.reduce(
    (sum, i) => sum + (Number(i.itm_material_user_price_total) || 0), 0);
  part.prt_work_task_duration_total = part.prt_items.reduce(
    (sum, i) => sum + (Number(i.itm_work_task_duration_total) || 0), 0);
}

export function updateProjectTotals(project) {
  if (!project?.prt_parts) return;
  project.prj_material_user_price_total = project.prt_parts.reduce(
    (sum, p) => sum + (Number(p.prt_material_user_price_total) || 0), 0
  );
  project.prj_work_task_duration_total = project.prt_parts.reduce(
    (sum, p) => sum + (Number(p.prt_work_task_duration_total) || 0), 0
  );
}

export function updateAllData(project) {
  if (!project?.prt_parts) return;
  project.prt_parts.forEach(updatePartTotals);
  updateProjectTotals(project);
}

// Data helpers
export function getAllItemsWithPartRef(parts, selectedParts) {
  if (!parts) return [];
  return parts.flatMap(part =>
    (!selectedParts || selectedParts.includes(part.prt_id))
      ? (part.prt_items || []).map(item => ({
          ...item,
          itm_prt_id: part.prt_id,
          itm_tasks: (item.itm_tasks || []).map(t => ({ ...t }))
        }))
      : []
  );
}

export function getPartOptions(project) {
  return project.prt_parts?.map(p => ({
    value: p.prt_id,
    label: p.prt_name || `Part ${p.prt_id}`,
  })) || [];
}

export function getPartLookup(project) {
  return Object.fromEntries(getPartOptions(project).map(p => [p.value, p.label]));
}

// Move item between parts
export function moveItemToPart(project, itemId, newPartId) {
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
  if (!item) return {newItem: null, oldPart: null, newPart: null};
  const newPart = project.prt_parts?.find(p => p.prt_id == newPartId);
  if (!newPart) {
    if (oldPart) oldPart.prt_items.push(item);
    return {newItem: null, oldPart, newPart: null};
  }
  item.itm_prt_id = newPart.prt_id;
  if (!newPart.prt_items) newPart.prt_items = [];
  newPart.prt_items.push(item);

  updatePartTotals(oldPart);
  updatePartTotals(newPart);
  updateProjectTotals(project);

  return {
    newItem: {
      ...item,
      itm_prt_id: newPart.prt_id,
      itm_tasks: (item.itm_tasks || []).map(t => ({ ...t }))
    },
    oldPart,
    newPart
  };
}
