/**
 * ChangeLogService - Tracks all changes made to Tabulator rows and subtables
 * Provides logging functionality for both main table and nested subtable modifications
 */
class ChangeLogService {
  constructor() {
    this.changeHistory = new Map(); // rowId -> array of changes
    this.globalChangeLog = []; // All changes in chronological order
  }

  /**
   * Initialize change tracking for a row
   * @param {string|number} rowId - The unique identifier for the row
   */
  initializeRowTracking(rowId) {
    if (!this.changeHistory.has(rowId)) {
      this.changeHistory.set(rowId, []);
    }
  }

  /**
   * Log a change event
   * @param {string|number} rowId - The row identifier
   * @param {Object} changeDetails - Details about the change
   */
  logChange(rowId, changeDetails) {
    const timestamp = new Date().toISOString();
    const changeEntry = {
      timestamp,
      rowId,
      ...changeDetails
    };

    // Add to row-specific history
    this.initializeRowTracking(rowId);
    this.changeHistory.get(rowId).push(changeEntry);

    // Add to global log
    this.globalChangeLog.push(changeEntry);

    // Emit custom event for external listeners
    this.emitChangeEvent(changeEntry);
  }

  /**
   * Log main table field changes
   * @param {string|number} rowId - The row identifier
   * @param {string} fieldName - Name of the changed field
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @param {string} itemName - Name of the item for context
   */
  logMainTableChange(rowId, fieldName, oldValue, newValue, itemName = '') {
    this.logChange(rowId, {
      type: 'MAIN_TABLE_EDIT',
      level: 'main',
      fieldName,
      oldValue,
      newValue,
      itemName,
      description: `Changed ${fieldName} from "${oldValue}" to "${newValue}" in main table`
    });
  }

  /**
   * Log subtable field changes
   * @param {string|number} rowId - The parent row identifier
   * @param {string|number} taskId - The subtable task identifier
   * @param {string} fieldName - Name of the changed field
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @param {string} taskName - Name of the task for context
   */
  logSubTableChange(rowId, taskId, fieldName, oldValue, newValue, taskName = '') {
    this.logChange(rowId, {
      type: 'SUBTABLE_EDIT',
      level: 'subtable',
      taskId,
      fieldName,
      oldValue,
      newValue,
      taskName,
      description: `Changed ${fieldName} from "${oldValue}" to "${newValue}" in subtask "${taskName}"`
    });
  }

  /**
   * Log row deletion
   * @param {string|number} rowId - The deleted row identifier
   * @param {string} itemName - Name of the deleted item
   * @param {string} level - 'main' or 'subtable'
   */
  logRowDeletion(rowId, itemName, level = 'main') {
    this.logChange(rowId, {
      type: 'ROW_DELETE',
      level,
      itemName,
      description: `Deleted ${level} row: "${itemName}"`
    });
  }

  /**
   * Log row addition
   * @param {string|number} rowId - The new row identifier
   * @param {string} itemName - Name of the added item
   * @param {string} level - 'main' or 'subtable'
   */
  logRowAddition(rowId, itemName, level = 'main') {
    this.logChange(rowId, {
      type: 'ROW_ADD',
      level,
      itemName,
      description: `Added new ${level} row: "${itemName}"`
    });
  }

  /**
   * Log category changes
   * @param {string|number} rowId - The row identifier
   * @param {string} oldCategory - Previous category
   * @param {string} newCategory - New category
   * @param {string} itemName - Name of the item
   */
  logCategoryChange(rowId, oldCategory, newCategory, itemName) {
    this.logChange(rowId, {
      type: 'CATEGORY_CHANGE',
      level: 'main',
      fieldName: 'item_category',
      oldValue: oldCategory,
      newValue: newCategory,
      itemName,
      description: `Moved "${itemName}" from category "${oldCategory}" to "${newCategory}"`
    });
  }

  /**
   * Get change history for a specific row
   * @param {string|number} rowId - The row identifier
   * @returns {Array} Array of changes for the specified row
   */
  getRowChangeHistory(rowId) {
    return this.changeHistory.get(rowId) || [];
  }

  /**
   * Get all changes in chronological order
   * @returns {Array} Array of all changes
   */
  getAllChanges() {
    return [...this.globalChangeLog];
  }

  /**
   * Get changes filtered by type
   * @param {string} changeType - Type of changes to filter by
   * @returns {Array} Filtered array of changes
   */
  getChangesByType(changeType) {
    return this.globalChangeLog.filter(change => change.type === changeType);
  }

  /**
   * Get changes within a time range
   * @param {Date} startDate - Start of time range
   * @param {Date} endDate - End of time range
   * @returns {Array} Changes within the specified time range
   */
  getChangesInTimeRange(startDate, endDate) {
    return this.globalChangeLog.filter(change => {
      const changeDate = new Date(change.timestamp);
      return changeDate >= startDate && changeDate <= endDate;
    });
  }

  /**
   * Clear change history for a specific row
   * @param {string|number} rowId - The row identifier
   */
  clearRowHistory(rowId) {
    this.changeHistory.delete(rowId);
    this.globalChangeLog = this.globalChangeLog.filter(change => change.rowId !== rowId);
  }

  /**
   * Clear all change history
   */
  clearAllHistory() {
    this.changeHistory.clear();
    this.globalChangeLog = [];
  }

  /**
   * Export change history as JSON
   * @returns {string} JSON string of all changes
   */
  exportChangesAsJSON() {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalChanges: this.globalChangeLog.length,
      changes: this.globalChangeLog
    }, null, 2);
  }

  /**
   * Generate a summary of changes for a row
   * @param {string|number} rowId - The row identifier
   * @returns {Object} Summary statistics
   */
  getRowChangeSummary(rowId) {
    const changes = this.getRowChangeHistory(rowId);
    const summary = {
      totalChanges: changes.length,
      mainTableChanges: changes.filter(c => c.level === 'main').length,
      subtableChanges: changes.filter(c => c.level === 'subtable').length,
      lastChange: changes.length > 0 ? changes[changes.length - 1].timestamp : null,
      changeTypes: {}
    };

    changes.forEach(change => {
      summary.changeTypes[change.type] = (summary.changeTypes[change.type] || 0) + 1;
    });

    return summary;
  }

  /**
   * Create a formatted change log entry for display
   * @param {Object} change - The change object
   * @returns {string} Formatted string representation
   */
  formatChangeForDisplay(change) {
    const time = new Date(change.timestamp).toLocaleString('sv-SE');
    return `[${time}] ${change.description}`;
  }

  /**
   * Get formatted change log for a row
   * @param {string|number} rowId - The row identifier
   * @returns {Array} Array of formatted change strings
   */
  getFormattedRowLog(rowId) {
    return this.getRowChangeHistory(rowId).map(change => this.formatChangeForDisplay(change));
  }

  /**
   * Emit custom event for change notifications
   * @param {Object} changeEntry - The change entry
   * @private
   */
  emitChangeEvent(changeEntry) {
    if (typeof window !== 'undefined' && window.document) {
      const event = new CustomEvent('tabulatorChangeLogged', {
        detail: changeEntry
      });
      document.dispatchEvent(event);
    }
  }

  /**
   * Helper method to create a change tracking column for Tabulator
   * @param {string} level - 'main' or 'subtable'
   * @returns {Object} Tabulator column definition
   */
  static createChangeLogColumn(level = 'main') {
    return {
      title: "Ändringslogg",
      field: "_changeLog",
      width: 120,
      headerSort: false,
      formatter: function(cell) {
        const rowData = cell.getRow().getData();
        const rowId = level === 'main' ? rowData.id : `${rowData.estimation_item_id}_${rowData.estimation_row_name}`;
        const changeCount = window.changeLogService ? window.changeLogService.getRowChangeHistory(rowId).length : 0;
        
        if (changeCount > 0) {
          return `<span class="change-log-indicator" style="color: #007bff; cursor: pointer; text-decoration: underline;">${changeCount} ändringar</span>`;
        }
        return '<span style="color: #6c757d;">Inga ändringar</span>';
      },
      cellClick: function(e, cell) {
        const rowData = cell.getRow().getData();
        const rowId = level === 'main' ? rowData.id : `${rowData.estimation_item_id}_${rowData.estimation_row_name}`;
        
        if (window.changeLogService) {
          const changes = window.changeLogService.getFormattedRowLog(rowId);
          if (changes.length > 0) {
            alert(`Ändringshistorik för rad ${rowId}:\n\n${changes.join('\n')}`);
          } else {
            alert('Inga ändringar registrerade för denna rad.');
          }
        }
      }
    };
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.changeLogService = new ChangeLogService();
}

export default ChangeLogService;
