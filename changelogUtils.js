// changelogUtils.js
class ChangelogUtils {
  constructor() {
    this.maxEntries = 20; // Kan justeras
  }

  /**
   * Loggar en ändring på huvudradnivå
   * @param {Object} mainRowData - Data för huvudraden
   * @param {string} field - Fältnamn som ändrades
   * @param {*} oldValue - Gammalt värde
   * @param {*} newValue - Nytt värde
   * @param {string} source - 'main' eller 'subtable'
   * @param {string} subtableId - ID för subtable-rad (om applicable)
   */
  logChange(mainRowData, field, oldValue, newValue, source = 'main', subtableId = null) {
    const timestamp = new Date().toLocaleString('sv-SE');
    
    const changeEntry = {
      timestamp: timestamp,
      field: field,
      oldValue: this.formatValue(oldValue),
      newValue: this.formatValue(newValue),
      source: source, // 'main' eller 'subtable'
      subtableId: subtableId // För att identifiera vilken subtable-rad
    };
    
    // Säkerställ att changelog-array finns
    if (!mainRowData.changelog) {
      mainRowData.changelog = [];
    }
    
    // Lägg till senaste först
    mainRowData.changelog.unshift(changeEntry);
    
    // Begränsa antalet entries
    if (mainRowData.changelog.length > this.maxEntries) {
      mainRowData.changelog = mainRowData.changelog.slice(0, this.maxEntries);
    }
  }

  /**
   * Loggar ändring från subtable - skickar upp till huvudraden
   * @param {Object} subtableRowData - Data för subtable-raden
   * @param {Object} mainRowData - Data för huvudraden
   * @param {string} field - Fältnamn som ändrades
   * @param {*} oldValue - Gammalt värde
   * @param {*} newValue - Nytt värde
   */
  logSubtableChange(subtableRowData, mainRowData, field, oldValue, newValue) {
    const subtableId = subtableRowData.estimation_item_id || subtableRowData.id || 'Okänd';
    const subtableName = subtableRowData.estimation_row_name || 'Okänd rad';
    
    this.logChange(
      mainRowData, 
      `${subtableName} - ${field}`, 
      oldValue, 
      newValue, 
      'subtable', 
      subtableId
    );
  }

  /**
   * Formaterar värden för visning
   * @param {*} value - Värdet som ska formateras
   * @returns {string} - Formaterat värde
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return 'Tom';
    }
    if (typeof value === 'number') {
      return value.toLocaleString('sv-SE');
    }
    return String(value);
  }

  /**
   * Skapar HTML för changelog-visning
   * @param {Array} changelog - Array med ändringar
   * @returns {string} - HTML-sträng
   */
  formatChangelogForDisplay(changelog) {
    if (!changelog || changelog.length === 0) {
      return '<span style="color: #888; font-style: italic;">Inga ändringar</span>';
    }
    
    let html = '<div style="max-height: 200px; overflow-y: auto; font-size: 11px; line-height: 1.3;">';
    
    changelog.forEach((change, index) => {
      const isSubtable = change.source === 'subtable';
      const bgColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
      const borderColor = isSubtable ? '#2196F3' : '#4CAF50';
      const icon = isSubtable ? '📋' : '📝';
      
      html += `
        <div style="
          margin-bottom: 3px; 
          padding: 5px; 
          background-color: ${bgColor};
          border-left: 3px solid ${borderColor}; 
          border-radius: 3px;
        ">
          <div style="
            font-weight: bold; 
            color: ${borderColor}; 
            font-size: 10px;
            margin-bottom: 2px;
          ">
            ${icon} ${change.timestamp}
          </div>
          <div style="color: #333;">
            <strong>${change.field}:</strong><br>
            <span style="color: #c62828;">${change.oldValue}</span> → 
            <span style="color: #2e7d32;">${change.newValue}</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Skapar en popup med fullständig changelog
   * @param {Array} changelog - Array med ändringar
   * @param {string} itemName - Namn på item för popup-titel
   */
  showFullChangelog(changelog, itemName = 'Item') {
    if (!changelog || changelog.length === 0) {
      alert('Inga ändringar att visa för denna rad.');
      return;
    }

    let content = `Fullständig ändringshistorik för: ${itemName}\n\n`;
    
    changelog.forEach((change, index) => {
      const source = change.source === 'subtable' ? '[SUBTABLE]' : '[MAIN]';
      content += `${index + 1}. ${change.timestamp} ${source}\n`;
      content += `   ${change.field}: ${change.oldValue} → ${change.newValue}\n\n`;
    });

    // Skapa en bättre modal om du vill, annars använd alert
    alert(content);
  }

  /**
   * Skapar kolumn-konfiguration för Tabulator
   * @returns {Object} - Tabulator kolumn-konfiguration
   */
  createChangelogColumn() {
    const self = this;
    
    return {
      title: "Ändringar",
      field: "changelog",
      width: 180,
      headerSort: false,
      formatter: function(cell) {
        const changelog = cell.getValue();
        return self.formatChangelogForDisplay(changelog);
      },
      cellClick: function(e, cell) {
        const changelog = cell.getValue();
        const rowData = cell.getRow().getData();
        const itemName = rowData.item_name || rowData.id || 'Okänd';
        self.showFullChangelog(changelog, itemName);
      },
      tooltip: "Klicka för att se fullständig ändringshistorik"
    };
  }

  /**
   * Initialiserar changelog för befintlig data
   * @param {Array} dataArray - Array med data-objekt
   */
  initializeChangelogForData(dataArray) {
    dataArray.forEach(item => {
      if (!item.changelog) {
        item.changelog = [];
      }
    });
  }

  /**
   * Wrapper-funktioner för enklare användning i Tabulator callbacks
   */
  createMainRowLogger(mainRowData) {
    return (field, oldValue, newValue) => {
      this.logChange(mainRowData, field, oldValue, newValue, 'main');
    };
  }

  createSubtableRowLogger(subtableRowData, mainRowData) {
    return (field, oldValue, newValue) => {
      this.logSubtableChange(subtableRowData, mainRowData, field, oldValue, newValue);
    };
  }
}

// Exportera som default
const changelogUtils = new ChangelogUtils();
export default changelogUtils;
