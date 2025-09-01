// tableUtils.js
// General helper functions for Tabulator project data (extracted from main.js)

/** Find part by ID in the project */
export const findPartById = (proj, prt_id) =>
  (proj.prt_parts || []).find(p => p.prt_id === prt_id) || null;

/** Find item by ID in the project */
export const findItemById = (proj, itm_id) => {
  for (const part of proj.prt_parts || []) {
    const found = (part.prt_items || []).find(i => i.itm_id === itm_id);
    if (found) return found;
  }
  return null;
};

/** Find task by ID in the project */
export const findTaskById = (proj, tsk_id) => {
  for (const part of proj.prt_parts || []) {
    for (const item of part.prt_items || []) {
      const found = (item.itm_tasks || []).find(t => t.tsk_id === tsk_id);
      if (found) return found;
    }
  }
  return null;
};

/** Get next numeric id for a collection */
export const getNextId = (collection, idField) =>
  collection.length ? Math.max(...collection.map(i => +i[idField] || 0)) + 1 : 1;

export const getNextPartId = (project) => getNextId(project.prt_parts || [], "prt_id");
export const getNextItemId = (project) =>
  getNextId(project.prt_parts?.flatMap(p => p.prt_items || []) || [], "itm_id");
export const getNextTaskId = (project) =>
  getNextId(project.prt_parts?.flatMap(p => (p.prt_items || []).flatMap(i => i.itm_tasks || [])) || [], "tsk_id");

/** Money formatter for Tabulator */
export const formatMoney = { formatter: "money", formatterParams: { symbol: "kr", precision: 2, thousand: " " } };

/** Hours formatter for Tabulator */
export const formatHours = cell => `${(Number(cell.getValue()) || 0).toFixed(2)} h`;

/** Simple confirm dialog */
export const confirmMsg = msg => window.confirm(msg);
