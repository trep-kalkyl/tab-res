/**
 * CalculatorService.js
 * En modul för att hantera beräkningar i trep-kalkyl
 */

export default class CalculatorService {
  /**
   * Beräknar totaler för ett item baserat på dess uppgifter
   * @param {Object} item - Item-objektet som ska beräknas
   * @returns {Object} Det uppdaterade item-objektet
   */
  static updateItemTotals(item) {
    // Om item innehåller tasks, beräkna item-värdena baserat på dessa
    if (item.tasks && item.tasks.length > 0) {
      const totals = this.calculateProjectTotals(item.tasks);
      item.item_work_task_duration = totals.item_work_task_duration;
      item.item_material_user_price = totals.item_material_user_price;
    }
    
    // Beräkna totalerna baserat på kvantitet
    item.item_material_user_price_total = 
      item.item_quantity * item.item_material_user_price;
    item.item_work_task_duration_total = 
      item.item_quantity * item.item_work_task_duration;
    
    return item;
  }
  
  /**
   * Beräknar totalsummor för en lista av tasks
   * @param {Array} tasks - Lista med task-objekt
   * @returns {Object} Objekt med beräknade totaler
   */
  static calculateProjectTotals(tasks) {
    return {
      item_work_task_duration: tasks.reduce(
        (sum, task) => sum + (task.work_task_duration_total || 0),
        0
      ),
      item_material_user_price: tasks.reduce(
        (sum, task) => sum + (task.material_user_price_total || 0),
        0
      ),
    };
  }
  
  /**
   * Beräknar totaler för en enskild task
   * @param {Object} task - Task-objektet som ska beräknas
   * @returns {Object} Det uppdaterade task-objektet
   */
  static updateTaskTotals(task) {
    // Beräkna arbetstid total
    task.work_task_duration_total = task.work_task_duration * task.total_quantity;
    
    // Beräkna materialpris total
    task.material_user_price_total = 
      task.total_quantity * task.material_amount * task.material_user_price;
    
    return task;
  }
  
  /**
   * Beräknar kategoritotaler för meny-data
   * @param {Array} data - Lista med item-objekt
   * @returns {Array} Lista med kategori-summor
   */
  static createMenuData(data, allCategories) {
    const summary = {};
    
    // Lägg först till befintliga kategorier från data
    data.forEach((item) => {
      if (!summary[item.item_category]) {
        summary[item.item_category] = {
          menu_category: item.item_category,
          category_material_user_price_total: 0,
          category_work_task_duration_total: 0,
          selected: true,
        };
      }
      summary[item.item_category].category_material_user_price_total +=
        item.item_material_user_price_total;
      summary[item.item_category].category_work_task_duration_total +=
        item.item_work_task_duration_total;
    });
    
    // Lägg till tomma kategorier som finns i allCategories men inte i data
    allCategories.forEach((category) => {
      if (!summary[category]) {
        summary[category] = {
          menu_category: category,
          category_material_user_price_total: 0,
          category_work_task_duration_total: 0,
          selected: true,
        };
      }
    });
    
    return Object.values(summary);
  }
  
  /**
   * Beräknar totaler för en specifik kategori
   * @param {Array} data - Lista med item-objekt
   * @param {String} category - Kategorin att beräkna för
   * @returns {Object} Objekt med kategori-totaler
   */
  static calculateCategoryTotals(data, category) {
    let categoryTotal = {
      category_material_user_price_total: 0,
      category_work_task_duration_total: 0,
    };
    
    data.forEach((item) => {
      if (item.item_category === category) {
        categoryTotal.category_material_user_price_total +=
          item.item_material_user_price_total;
        categoryTotal.category_work_task_duration_total +=
          item.item_work_task_duration_total;
      }
    });
    
    return categoryTotal;
  }
}
