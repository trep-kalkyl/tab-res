/**
 * ItemManager.js
 * Ansvarar för hantering av items och tasks, inklusive skapande, uppdatering och borttagning.
 */

import CalculatorService from "./CalculatorService.js";

class ItemManager {
  constructor() {
    this.data = [];
    this.allCategories = new Set();
    this.dataTable = null;
    this.menuTable = null;
    this.newCategoryCounter = 1;
  }

  /**
   * Initialiserar ItemManager med nödvändiga variabler och tabeller
   * @param {Array} data - Den globala data-arrayen
   * @param {Tabulator} dataTable - Huvuddatatabellen
   * @param {Tabulator} menuTable - Menytabellen
   */
  init(data, dataTable, menuTable) {
    this.data = data;
    this.dataTable = dataTable;
    this.menuTable = menuTable;
    
    // Skapa allCategories från data
    this.allCategories = new Set(data.map((item) => item.item_category));
  }

  /**
   * Skapar delete-knappen för kategorier
   * @param {Object} cell - Tabulator cell
   * @returns {HTMLElement} - Delete-knappen
   */
  createDeleteButton(cell) {
    const button = document.createElement("button");
    button.innerHTML = "✖";
    button.style.cursor = "pointer";
    button.style.background = "none";
    button.style.border = "none";
    button.style.color = "#ff4444";
    button.style.fontSize = "16px";

    button.addEventListener("click", () => {
      const category = cell.getRow().getData().menu_category;
      console.log("Attempting to delete category:", category);

      // Prevent deletion if it's the last category
      if (this.menuTable.getData().length <= 1) {
        alert("At least one category must remain.");
        return;
      }

      // Show a confirmation dialog
      const confirmDelete = confirm(
        `Are you sure you want to delete the category "${category}" and all its items?`
      );

      if (confirmDelete) {
        try {
          // Remove from allCategories
          this.allCategories.delete(category);
          console.log("Category removed from allCategories");
          console.log("Remaining categories:", Array.from(this.allCategories));

          // Find all affected rows in dataTable
          const rowsToDelete = this.dataTable
            .getRows()
            .filter((row) => row.getData().item_category === category);

          // Remove rows from dataTable one by one without redrawing the entire table
          rowsToDelete.forEach((row) => row.delete());

          // Remove from the global data array
          const itemsToRemoveIndexes = [];
          this.data.forEach((item, index) => {
            if (item.item_category === category) {
              itemsToRemoveIndexes.unshift(index); // Add to beginning to remove from the end
            }
          });
          itemsToRemoveIndexes.forEach((index) => this.data.splice(index, 1));
          console.log("Updated global data:", this.data);

          // Only remove the affected category row from the menu table
          const categoryRow = cell.getRow();
          categoryRow.delete();

          // Update the filter to reflect changes
          this.updateFilter();
        } catch (error) {
          console.error("Error during deletion:", error);
          alert(
            "An error occurred while deleting the category. Please check the console for details."
          );
        }
      }
    });

    return button;
  }

  /**
   * Uppdaterar totaler för en föräldrarrad
   * @param {Object} parentRow - Tabulator row för föräldraraden
   */
  updateParentTotals(parentRow) {
    const rowData = parentRow.getData();
    const totals = CalculatorService.calculateProjectTotals(rowData.tasks);

    // Update only the specific parent row
    parentRow.update({
      item_work_task_duration: totals.item_work_task_duration,
      item_material_user_price: totals.item_material_user_price,
      item_material_user_price_total:
        rowData.item_quantity * totals.item_material_user_price,
      item_work_task_duration_total:
        rowData.item_quantity * totals.item_work_task_duration,
    });

    // Update only the affected category in the menu
    this.updateCategoryInMenu(rowData.item_category);
  }

  /**
   * Hjälpfunktion för att uppdatera en kategori i menyn
   * @param {string} category - Kategorin som ska uppdateras
   */
  updateCategoryInMenu(category) {
    CalculatorService.calculateCategoryTotals(this.data, category);
    
    // Find and update only the affected category row
    let menuRows = this.menuTable.getRows();
    let categoryRow = menuRows.find(
      (row) => row.getData().menu_category === category
    );
    
    if (categoryRow) {
      const rowData = categoryRow.getData();
      const categoryTotal = CalculatorService.calculateCategoryTotals(this.data, category);
      
      categoryRow.update({
        ...rowData,
        category_material_user_price_total:
          categoryTotal.category_material_user_price_total,
        category_work_task_duration_total:
          categoryTotal.category_work_task_duration_total,
      });
    }
  }

  /**
   * Uppdaterar beräkningar i underliggande tabell
   * @param {Object} cell - Tabulator cell
   */
  updateCalculations(cell) {
    let row = cell.getRow();
    let data = row.getData();

    // Calculate totals using CalculatorService
    data = CalculatorService.updateTaskTotals(data);

    // Update the task row
    row.update(data);

    // Find and update the correct parent row
    let parentTable = Tabulator.findTable("#data-table")[0];
    let parentRow = parentTable.getRows().find((pRow) => {
      let pData = pRow.getData();
      return pData.tasks.some(
        (task) => task.estimation_item_id === data.estimation_item_id
      );
    });

    if (parentRow) {
      let parentData = parentRow.getData();
      const taskIndex = parentData.tasks.findIndex(
        (task) => task.estimation_item_id === data.estimation_item_id
      );
      if (taskIndex !== -1) {
        parentData.tasks[taskIndex] = data;
        this.updateParentTotals(parentRow);
      }
    }
  }

  /**
   * Tar bort en task-rad och uppdaterar beräkningar
   * @param {Object} row - Tabulator row för task-raden
   */
  deleteTaskRow(row) {
    let taskData = row.getData();
    let parentTable = Tabulator.findTable("#data-table")[0];
    let parentRow = parentTable.getRows().find((pRow) => {
      let pData = pRow.getData();
      return pData.tasks.some(
        (task) => task.estimation_item_id === taskData.estimation_item_id
      );
    });

    if (parentRow) {
      let parentData = parentRow.getData();
      // Keep the reference to the original array but filter the content
      parentData.tasks = parentData.tasks.filter(
        (task) => task.estimation_item_id !== taskData.estimation_item_id
      );

      // Update the parent row and calculate new totals
      this.updateParentTotals(parentRow);
    }

    // Remove the current row from the subtable
    row.delete();
  }

  /**
   * Lägger till en ny task-rad
   * @param {Object} parentRow - Tabulator row för föräldraraden
   */
  addTaskRow(parentRow) {
    const parentData = parentRow.getData();
    const newTask = {
      estimation_item_id: `E${Math.floor(Math.random() * 1000)}`,
      total_quantity: 1,
      work_task_duration: 0,
      work_task_duration_total: 0,
      material_amount: 1,
      material_user_price: 0,
      material_user_price_total: 0,
    };

    // Add the new task to the parent row's tasks array
    parentData.tasks.push(newTask);

    // Update only the specific parent row
    parentRow.update(parentData);

    // Update only the subtable for this parent
    const subTableHolder = parentRow
      .getElement()
      .querySelector(".subtable-holder");
    if (subTableHolder) {
      const subTable = subTableHolder.querySelector(".tabulator");
      if (subTable) {
        const subTableInstance = Tabulator.findTable(subTable)[0];
        if (subTableInstance) {
          // Add only the new row
          subTableInstance.addData([newTask]);
        }
      }
    }

    // Update totals for the parent row
    this.updateParentTotals(parentRow);
  }

  /**
   * Lägger till en ny item-rad
   */
  addItemRow() {
    // Select first available category or create a new one
    const firstCategory = Array.from(this.allCategories)[0] || "New Category";

    const newItem = {
      id: this.data.length + 1,
      item_name: "New Item",
      item_category: firstCategory,
      item_quantity: 1,
      item_material_user_price: 0,
      item_material_user_price_total: 0,
      item_work_task_duration: 0,
      item_work_task_duration_total: 0,
      tasks: [
        {
          estimation_item_id: `E${Math.floor(Math.random() * 1000)}`,
          total_quantity: 1,
          work_task_duration: 0,
          work_task_duration_total: 0,
          material_amount: 1,
          material_user_price: 0,
          material_user_price_total: 0,
        },
      ],
    };

    // Add to the global data array
    this.data.push(newItem);

    // Add only the new row to dataTable
    this.dataTable.addData([newItem]);

    // Update only the affected category in the menu
    this.updateCategoryInMenu(firstCategory);
  }

  /**
   * Uppdaterar filtret baserat på valda kategorier
   */
  updateFilter() {
    console.log("Updating filter");
    const selectedCategories = this.menuTable
      .getData()
      .filter((row) => row.selected)
      .map((row) => row.menu_category);
    console.log("Selected categories for filter:", selectedCategories);

    // Update only the filter without redrawing the entire table
    if (selectedCategories.length > 0) {
      this.dataTable.setFilter("item_category", "in", selectedCategories);
    } else {
      this.dataTable.clearFilter();
    }
  }

  /**
   * Uppdaterar kategori-dropdowns
   */
  refreshCategoryDropdowns() {
    // Force the entire table to redraw itself
    this.dataTable.redraw(true);
  }

  /**
   * Lägger till en ny kategori i menyn
   */
  addMenuCategory() {
    const newCategory = `New Category ${this.newCategoryCounter++}`;
    this.allCategories.add(newCategory);

    // Create a new category object
    const newCategoryData = {
      menu_category: newCategory,
      category_material_user_price_total: 0,
      category_work_task_duration_total: 0,
      selected: true,
    };

    // Add only the new category to the menu table
    this.menuTable.addData([newCategoryData]);
    this.refreshCategoryDropdowns();
  }

  /**
   * Rensar filtret och markerar alla kategorier som valda
   */
  clearFilter() {
    // Update all menuTable rows individually without running setData
    this.menuTable.getRows().forEach((row) => {
      const rowData = row.getData();
      rowData.selected = true;
      row.update(rowData);
    });

    // Update the filter
    this.updateFilter();
  }
}

// Exportera instans av ItemManager för att kunna användas globalt
const itemManager = new ItemManager();
export default itemManager;
