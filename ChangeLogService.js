// ChangeLogService.js
const ChangeLogService = (() => {
  // Unik lagring för loggar
  const __tabulatorChangeLog = {
    category: {}, // { [rowId]: [logEntry, ...] }
    quantity: {}, // { [parentId_taskId]: [logEntry, ...] }
  };

  // Logga kategoriändring på modernivå
  function logCategoryChange(rowId, oldCategory, newCategory) {
    if (!__tabulatorChangeLog.category[rowId]) __tabulatorChangeLog.category[rowId] = [];
    __tabulatorChangeLog.category[rowId].push({
      oldCategory,
      newCategory,
      timestamp: new Date().toISOString(),
    });
  }

  // Logga antaländring på subnivå
  function logQuantityChange(parentId, taskId, oldQuantity, newQuantity) {
    const key = `${parentId}_${taskId}`;
    if (!__tabulatorChangeLog.quantity[key]) __tabulatorChangeLog.quantity[key] = [];
    __tabulatorChangeLog.quantity[key].push({
      oldQuantity,
      newQuantity,
      timestamp: new Date().toISOString(),
    });
  }

  // Hämta logg för kategoriändringar
  function getCategoryLog(rowId) {
    return __tabulatorChangeLog.category[rowId] || [];
  }

  // Hämta logg för antaländringar
  function getQuantityLog(parentId, taskId) {
    return __tabulatorChangeLog.quantity[`${parentId}_${taskId}`] || [];
  }

  return {
    logCategoryChange,
    logQuantityChange,
    getCategoryLog,
    getQuantityLog,
  };
})();

export default ChangeLogService;
