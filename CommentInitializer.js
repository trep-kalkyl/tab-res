/**
 * CommentInitializer.js
 * 
 * Detta script hanterar initiering och konfiguration av kommentarsfunktionalitet
 * för tabulator-tabeller.
 */

export default class CommentInitializer {
  constructor() {
    // Skapa kommentarhanterare
    this.commentManager = null;
  }

  /**
   * Initialisera kommentarhanteraren
   */
  initialize() {
    if (!window.CommentModalManager) {
      console.error('CommentModalManager är inte tillgänglig globalt');
      return;
    }
    
    this.commentManager = new window.CommentModalManager();
    window.commentManager = this.commentManager; // Gör den globalt tillgänglig
  }

  /**
   * Registrera tabeller som behöver kommentarsfunktionalitet
   * @param {Object} tables - Ett objekt med tabellnamn som nycklar och tabulatorinstanser som värden
   */
  registerTables(tables) {
    if (!this.commentManager) {
      this.initialize();
    }
    
    Object.entries(tables).forEach(([name, table]) => {
      this.commentManager.registerTable(name, table);
    });
  }

  /**
   * Skapa kommentarkolumn-konfiguration för tabeller
   * @param {string} type - Typ av kommentarkolumn (t.ex. 'category', 'item', 'row')
   * @param {string} referenceField - Fältet som används för att identifiera raden
   * @returns {Object} Kolumnkonfiguration för tabulator
   */
  static createCommentColumnConfig(type, referenceField) {
    if (!window.CommentFormatter) {
      console.error('CommentFormatter är inte tillgänglig globalt');
      return {};
    }
    
    return window.CommentFormatter.createCommentColumn(type, referenceField);
  }
}
