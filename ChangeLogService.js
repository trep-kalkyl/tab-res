// ChangeLogService.js
const ChangeLogService = (() => {
  const _log = {
    category: {}, // { [rowId]: [logEntry, ...] }
    quantity: {}, // { [parentId_taskId]: [logEntry, ...] }
  };

  function logCategoryChange(rowId, oldCategory, newCategory) {
    if (!_log.category[rowId]) _log.category[rowId] = [];
    _log.category[rowId].push({
      oldCategory,
      newCategory,
      timestamp: new Date().toISOString(),
    });
  }

  function logQuantityChange(parentId, taskId, oldQuantity, newQuantity) {
    const key = `${parentId}_${taskId}`;
    if (!_log.quantity[key]) _log.quantity[key] = [];
    _log.quantity[key].push({
      oldQuantity,
      newQuantity,
      timestamp: new Date().toISOString(),
    });
  }

  function getCategoryLog(rowId) {
    return _log.category[rowId] || [];
  }

  function getQuantityLog(parentId, taskId) {
    return _log.quantity[`${parentId}_${taskId}`] || [];
  }

  return {
    logCategoryChange,
    logQuantityChange,
    getCategoryLog,
    getQuantityLog,
  };
})();

export default ChangeLogService;
