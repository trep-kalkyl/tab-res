// dataHelpers.js

export const getNextId = (collection, idField) => {
  const allIds = collection.map(item => item[idField]);
  return allIds.length ? Math.max(...allIds) + 1 : 1;
};

export const getNextPartId = (project) => 
  getNextId(project.prt_parts || [], 'prt_id');

export const getNextItemId = (project) => 
  getNextId(project.prt_parts?.flatMap(p => p.prt_items || []) || [], 'itm_id');

export const getNextTaskId = (project) => 
  getNextId(
    project.prt_parts?.flatMap(p => (p.prt_items || []).flatMap(i => i.itm_tasks || [])) || [],
    'tsk_id'
  );

export const findItemById = (project, itm_id) => {
  for (const part of project.prt_parts || []) {
    const found = (part.prt_items || []).find(i => i.itm_id === itm_id);
    if (found) return found;
  }
  return null;
};
