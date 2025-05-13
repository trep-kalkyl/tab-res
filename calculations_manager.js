// calculations_manager.js

/**
 * En klass för att hantera alla beräkningar i applikationen
 */
export default class CalculationsManager {
  constructor() {}

  /**
   * Beräknar projektets totaler baserat på uppgifter
   * @param {Array} tasks - Lista med uppgifter
   * @returns {Object} Beräknade totaler
   */
  calculateProjectTotals(tasks) {
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
   * Uppdaterar föräldraradens totaler
   * @param {Object} parentRow - Föräldraraden som ska uppdateras
   * @param {Function} updateCategoryCallback - Callback för att uppdatera kategori
   */
  updateParentTotals(parentRow, updateCategoryCallback) {
    const rowData = parentRow.getData();
    const totals = this.calculateProjectTotals(rowData.tasks);

    // Uppdatera endast den specifika föräldraraden
    parentRow.update({
      item_work_task_duration: totals.item_work_task_duration,
      item_material_user_price: totals.item_material_user_price,
      item_material_user_price_total:
        rowData.item_quantity * totals.item_material_user_price,
      item_work_task_duration_total:
        rowData.item_quantity * totals.item_work_task_duration,
    });

    // Uppdatera endast den påverkade kategorin i menyn
    if (updateCategoryCallback) {
      updateCategoryCallback(rowData.item_category);
    }
  }

  /**
   * Uppdaterar beräkningar när en cell ändras
   * @param {Object} cell - Cellen som ändrats
   * @param {Function} findParentRowCallback - Callback för att hitta föräldraraden
   */
  updateCalculations(cell, findParentRowCallback) {
    let row = cell.getRow();
    let data = row.getData();

    // Beräkna work_task_duration_total
    data.work_task_duration_total = data.work_task_duration * data.total_quantity;

    // Beräkna material_user_price_total
    data.material_user_price_total =
      data.total_quantity * data.material_amount * data.material_user_price;

    // Uppdatera uppgiftsraden
    row.update(data);

    // Hitta och uppdatera den korrekta föräldraraden
    const parentRow = findParentRowCallback(data.estimation_item_id);

    if (parentRow) {
      let parentData = parentRow.getData();
      const taskIndex = parentData.tasks.findIndex(
        (task) => task.estimation_item_id === data.estimation_item_id
      );
      if (taskIndex !== -1) {
        parentData.tasks[taskIndex] = data;
        this.updateParentTotals(parentRow, (category) => 
          this.updateCategoryInMenu(category, findParentRowCallback));
      }
    }
  }

  /**
   * Uppdaterar totaler för en rad
   * @param {Object} row - Raden som ska uppdateras
   * @returns {Object} Uppdaterad rad
   */
  updateTotals(row) {
    if (row.tasks && row.tasks.length > 0) {
      const totals = this.calculateProjectTotals(row.tasks);
      row.item_work_task_duration = totals.item_work_task_duration;
      row.item_material_user_price = totals.item_material_user_price;
    }

    row.item_material_user_price_total =
      row.item_quantity * row.item_material_user_price;
    row.item_work_task_duration_total =
      row.item_quantity * row.item_work_task_duration;
    return row;
  }

  /**
   * Uppdaterar en kategori i menyn
   * @param {string} category - Kategorin som ska uppdateras
   * @param {Function} findAllItemsCallback - Callback för att hitta alla objekt
   * @returns {Object} Beräknade kategoritotaler
   */
  updateCategoryInMenu(category, findAllItemsCallback) {
    // Beräkna nya totaler för denna kategori
    let categoryTotal = {
      category_material_user_price_total: 0,
      category_work_task_duration_total: 0,
    };

    const items = findAllItemsCallback();
    items.forEach((item) => {
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
