// ChangeLogService.js
const ChangeLogService = (() => {
  // Unikt namn för logg-lagring
  const __tabulatorChangeLogs = {};

  // Skapa en loggrad
  function logChange(rowId, field, oldValue, newValue, context = "main", subId = null) {
    const key = context === "main" ? `main_${rowId}` : `sub_${rowId}_${subId}`;
    if (!__tabulatorChangeLogs[key]) __tabulatorChangeLogs[key] = [];
    __tabulatorChangeLogs[key].push({
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    });
  }

  // Hämta logg för rad
  function getLog(rowId, context = "main", subId = null) {
    const key = context === "main" ? `main_${rowId}` : `sub_${rowId}_${subId}`;
    return __tabulatorChangeLogs[key] || [];
  }

  return {
    logChange,
    getLog,
  };
})();

export default ChangeLogService;
