/**
 * CalculatorService.js
 * A module for handling calculations in trep-kalkyl.
 */

export default class CalculatorService {
  /**
   * Updates all totals for an item based on its tasks and quantity.
   * @param {Object} item - The item object to update.
   * @returns {Object} The updated item object.
   */
  static updateItemTotals(item) {
    // If the item has tasks, calculate item-level values based on those tasks
    if (item.tasks && item.tasks.length > 0) {
      const totals = this.calculateProjectTotals(item.tasks);
      item.item_work_task_duration = totals.item_work_task_duration;
      item.item_material_user_price = totals.item_material_user_price;
    }
    
    // Calculate totals based on the item's quantity
    item.item_material_user_price_total = 
      item.item_quantity * item.item_material_user_price;
    item.item_work_task_duration_total = 
      item.item_quantity * item.item_work_task_duration;
    
    return item;
  }
  
  /**
   * Calculates total work duration and material price for a list of tasks.
   * @param {Array} tasks - Array of task objects.
   * @returns {Object} Object with calculated totals.
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
   * Updates totals for a single task.
   * @param {Object} task - The task object to update.
   * @returns {Object} The updated task object.
   */
  static updateTaskTotals(task) {
    // Calculate total work duration for the task
    task.work_task_duration_total = task.work_task_duration * task.total_quantity;
    
    // Calculate total material price for the task
    task.material_user_price_total = 
      task.total_quantity * task.material_amount * task.material_user_price;
    
    return task;
  }
  
  /**
   * Creates summary data for the menu table, aggregating totals per category.
   * Adds empty categories from allCategories if not present in data.
   * @param {Array} data - Array of item objects.
   * @param {Set} allCategories - Set of all category names.
   * @returns {Array} Array of category summary objects.
   */
  static createMenuData(data, allCategories) {
    const summary = {};
    
    // First, aggregate totals for each category present in data
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
    
    // Add empty categories that exist in allCategories but not in data
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
   * Calculates totals for a specific category.
   * @param {Array} data - Array of item objects.
   * @param {String} category - The category to calculate totals for.
   * @returns {Object} Object with category totals.
   */
  static calculateCategoryTotals(data, category) {
    let categoryTotal = {
      category_material_user_price_total: 0,
      category_work_task_duration_total: 0,
    };
    
    // Sum up totals for all items in the given category
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
