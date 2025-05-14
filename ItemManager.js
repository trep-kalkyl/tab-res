/**
 * ItemManager.js
 *
 * Responsible for managing items and tasks, including creation, updating, and deletion.
 * Works together with CalculatorService for all calculations.
 */

class ItemManager {
  /**
   * Constructor initializes the manager with a data source and calculator service.
   * Also sets up the category set and internal flags.
   * @param {Array} dataSource - The main data array for items.
   * @param {CalculatorService} calculatorService - The calculation utility.
   */
  constructor(dataSource, calculatorService) {
    this.data = dataSource;
    this.calculatorService = calculatorService;
    this.allCategories = new Set();
    this.newCategoryCounter = 1;
    // Flags to prevent duplicate additions
    this.isAddingItem = false;
    this.isAddingTask = false;

    // Initialize the category set from the initial data
    this.refreshCategorySet();
  }

  /**
   * Refreshes the allCategories set based on the current data.
   */
  refreshCategorySet() {
    this.allCategories = new Set(this.data.map((item) => item.item_category));
  }

  /**
   * Creates a delete button for a category in the menu table.
   * Handles confirmation, deletion from all relevant data structures, and UI updates.
   * @param {Tabulator.CellComponent} cell - The cell where the button is rendered.
   * @param {Function} updateFilterCallback - Callback to update filters after deletion.
   * @returns {HTMLButtonElement} - The delete button element.
   */
  createDeleteButton(cell, updateFilterCallback) {
    const button = document.createElement("button");
    button.innerHTML = "✖";
    button.style.cursor = "pointer";
    button.style.background = "none";
    button.style.border = "none";
    button.style.color = "#ff4444";
    button.style.fontSize = "16px";

    button.addEventListener("click", () => {
      try {
        // Hämta all data tidigt, innan några förändringar
        const row = cell.getRow();
        const rowData = row.getData();
        const category = rowData.menu_category; // Använd rowData istället för cell.getRow().getData()
        console.log("Attempting to delete category:", category);

        // Get references to the menu and data tables
        const menuTable = cell.getTable();
        const dataTable = Tabulator.findTable("#data-table")[0];

        // Prevent deletion if only one category remains
        if (menuTable.getData().length <= 1) {
          alert("At least one category must remain.");
          return;
        }

        // Show a confirmation dialog
        const confirmDelete = confirm(
          `Are you sure you want to delete the category "${category}" and all its items?`
        );

        if (!confirmDelete) {
          return;
        }

        // Ta bort från allCategories set
        this.allCategories.delete(category);
        console.log("Category removed from allCategories");
        console.log("Remaining categories:", Array.from(this.allCategories));

        // Skapa en kopia av påverkade rader för att undvika problem med förändringar under iteration
        const rowsToDelete = dataTable
          .getRows()
          .filter((row) => row.getData().item_category === category);

        // Remove items from the global data array
        const itemsToRemoveIndexes = [];
        this.data.forEach((item, index) => {
          if (item.item_category === category) {
            itemsToRemoveIndexes.unshift(index); // Remove from end to avoid index shift
          }
        });
        itemsToRemoveIndexes.forEach((index) => this.data.splice(index, 1));
        console.log("Updated global data:", this.data);

        // Remove rows from dataTable one by one
        rowsToDelete.forEach((row) => row.delete());

        // Ta bort menyraden sist, efter att all data har använts
        row.delete();

        // Update the filter to reflect changes efter att raden tagits bort
        if (updateFilterCallback) {
          updateFilterCallback();
        }
      } catch (error) {
        console.error("Error during category deletion:", error);
        alert(
          "An error occurred while deleting the category. Please check the console for details."
        );
      }
    });

    return button;
  }

  /**
   * Updates totals for a parent (item) row based on its tasks.
   * Only the specific parent row and its category in the menu are updated.
   * @param {Tabulator.RowComponent} parentRow - The parent row to update.
   */
  updateParentTotals(parentRow) {
    const rowData = parentRow.getData();
    const totals = this.calculatorService.calculateProjectTotals(rowData.tasks);

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
   * Updates a specific category row in the menu table with new totals.
   * @param {String} category - The category to update.
   */
  updateCategoryInMenu(category) {
    // Calculate new totals for this category
    const categoryTotal = this.calculatorService.calculateCategoryTotals(this.data, category);

    // Find and update only the affected category row in the menu table
    const menuTable = Tabulator.findTable("#menu-table")[0];
    if (!menuTable) return; // Ensure the table exists

    let menuRows = menuTable.getRows();
    let categoryRow = menuRows.find(
      (row) => row.getData().menu_category === category
    );

    if (categoryRow) {
      const rowData = categoryRow.getData();

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
   * Updates calculations for a task row in a subtable and propagates changes to the parent.
   * @param {Tabulator.CellComponent} cell - The edited cell in the subtable.
   */
  updateCalculations(cell) {
    let row = cell.getRow();
    let data = row.getData();

    // Calculate totals using CalculatorService
    data = this.calculatorService.updateTaskTotals(data);

    // Update the task row
    row.update(data);

    // Find and update the correct parent row in the main table
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
   * Deletes a task row and updates calculations in the parent row.
   * @param {Tabulator.RowComponent} row - The task row to delete.
   */
  deleteTaskRow(row) {
  try {
    // Spara data innan vi tar bort raden
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
      parentData.tasks = parentData.tasks.filter(
        (task) => task.estimation_item_id !== taskData.estimation_item_id
      );
      this.updateParentTotals(parentRow);
    }

    // Ta bort raden sist, efter att all data har använts
    row.delete();

    // Undvik att använda row-objektet här efteråt!
  } catch (error) {
    console.error("Error in deleteTaskRow:", error);
  }
}


  /**
   * Adds a new task row to a parent item and updates the subtable and totals.
   * Prevents duplicate additions using a flag.
   * @param {Tabulator.RowComponent} parentRow - The parent row to add a task to.
   */
  addTaskRow(parentRow) {
    // Prevent duplicate additions
    if (this.isAddingTask) return;
    this.isAddingTask = true;

    try {
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

      // Add the new task to the parent's tasks array
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
    } finally {
      // Reset the flag
      this.isAddingTask = false;
    }
  }

  /**
   * Adds a new item row to the main data table and updates the menu.
   * Prevents duplicate additions using a flag.
   */
  addItemRow() {
    // Prevent duplicate additions
    if (this.isAddingItem) return;
    this.isAddingItem = true;

    try {
      // Select first available category or create a new one
      const firstCategory = Array.from(this.allCategories)[0] || "New Category";

      const newItem = {
        id: `item_${Date.now()}`, // Unique ID to avoid duplication
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

      console.log("Adding new item:", newItem);

      // Add to the global data array
      this.data.push(newItem);

      // Add only the new row to the dataTable if it exists
      const dataTable = Tabulator.findTable("#data-table")[0];
      if (dataTable) {
        dataTable.addData([newItem]);
      } else {
        console.error("Data table not found");
      }

      // Update only the affected category in the menu
      this.updateCategoryInMenu(firstCategory);
    } finally {
      // Reset the flag
      this.isAddingItem = false;
    }
  }

  /**
   * Handles category editing in the menu table.
   * Updates all relevant data, filters, and dropdowns.
   * @param {Tabulator.CellComponent} cell - The edited cell.
   * @param {Function} updateFilterCallback - Callback to update filters.
   * @param {Function} refreshCategoryDropdownsCallback - Callback to refresh dropdowns.
   */
  handleCategoryEdit(cell, updateFilterCallback, refreshCategoryDropdownsCallback) {
    const oldCategory = cell.getOldValue();
    const newCategory = cell.getValue();

    // Abort if category hasn't changed
    if (oldCategory === newCategory) return;

    // Update allCategories set
    this.allCategories.delete(oldCategory);
    this.allCategories.add(newCategory);

    // Update category name in all affected items
    const dataTable = Tabulator.findTable("#data-table")[0];
    const affectedRows = dataTable
      .getRows()
      .filter((row) => row.getData().item_category === oldCategory);

    // Update each affected row
    affectedRows.forEach((row) => {
      const rowData = row.getData();
      rowData.item_category = newCategory;
      row.update(rowData);
    });

    // Also update in the global data array
    this.data.forEach((item) => {
      if (item.item_category === oldCategory) {
        item.item_category = newCategory;
      }
    });

    // Update filter if callback provided
    if (updateFilterCallback) {
      updateFilterCallback();
    }

    // Refresh dropdowns if callback provided
    if (refreshCategoryDropdownsCallback) {
      refreshCategoryDropdownsCallback();
    }
  }

  /**
   * Handles quantity editing for an item row.
   * Updates totals using CalculatorService and updates the menu.
   * @param {Tabulator.CellComponent} cell - The edited cell.
   */
  handleQuantityEdit(cell) {
    const row = cell.getRow();
    const rowData = row.getData();

    // Update totals for this row with CalculatorService
    this.calculatorService.updateItemTotals(rowData);
    row.update(rowData);

    // Update only the affected category in the menu
    this.updateCategoryInMenu(rowData.item_category);
  }

  /**
   * Deletes an item row from the data table and updates the menu.
   * @param {Tabulator.CellComponent} cell - The cell in the row to delete.
   */
  deleteItem(cell) {
    try {
      // Spara data innan vi tar bort raden
      const row = cell.getRow();
      const rowData = row.getData();
      const category = rowData.item_category;

      // Ta bort från den globala data-arrayen
      const index = this.data.findIndex((item) => item.id === rowData.id);
      if (index !== -1) {
        this.data.splice(index, 1);
      }

      // Uppdatera kategorin i menyn innan vi tar bort raden
      this.updateCategoryInMenu(category);
      
      // Ta bort raden sist, efter att all data har använts
      row.delete();
    } catch (error) {
      console.error("Error in deleteItem:", error);
    }
  }

  /**
   * Adds a new category to the menu.
   * @returns {String} The name of the new category.
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
    const menuTable = Tabulator.findTable("#menu-table")[0];
    if (menuTable) {
      menuTable.addData([newCategoryData]);
    } else {
      console.error("Menu table not found");
    }

    return newCategory;
  }

  /**
   * Renders a category dropdown for the data table.
   * Ensures all available categories are shown.
   * @param {Tabulator.CellComponent} cell - The cell to render the dropdown for.
   * @returns {HTMLSelectElement} The dropdown element.
   */
  renderCategoryDropdown(cell) {
    const category = cell.getValue();
    const select = document.createElement("select");

    // Get the menu table to retrieve all available categories
    const menuTable = Tabulator.findTable("#menu-table")[0];

    // If menu table is missing, fallback to just the current category
    if (!menuTable) {
      console.error("Menu table not found");
      const option = document.createElement("option");
      option.value = category;
      option.text = category;
      option.selected = true;
      select.appendChild(option);
      return select;
    }

    // Add all categories from the menu table as options
    menuTable.getData().forEach((row) => {
      const option = document.createElement("option");
      option.value = row.menu_category;
      option.text = row.menu_category;
      if (category === row.menu_category) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Prevent duplicate change handling
    let isChanging = false;

    select.addEventListener("change", (e) => {
      if (isChanging) return;
      isChanging = true;

      try {
        const oldCategory = cell.getValue();
        const newCategory = e.target.value;

        // Abort if no actual change
        if (oldCategory === newCategory) {
          return;
        }

        // Update only the affected row
        const row = cell.getRow();
        const rowData = row.getData();
        rowData.item_category = newCategory;
        row.update(rowData);

        // Also update in the global data array
        const dataIndex = this.data.findIndex((item) => item.id === rowData.id);
        if (dataIndex !== -1) {
          this.data[dataIndex].item_category = newCategory;
        }

        // Update only the affected categories in the menu
        this.updateCategoryInMenu(oldCategory);
        this.updateCategoryInMenu(newCategory);
      } finally {
        isChanging = false;
      }
    });

    return select;
  }

  /**
   * Resets the menu filter to show all categories as selected.
   */
  resetMenuFilter() {
    const menuTable = Tabulator.findTable("#menu-table")[0];

    if (!menuTable) {
      console.error("Menu table not found");
      return;
    }

    // Update all menuTable rows individually without calling setData
    menuTable.getRows().forEach((row) => {
      const rowData = row.getData();
      rowData.selected = true;
      row.update(rowData);
    });
  }
}

// Export the ItemManager class as the default export of this module
export default ItemManager;
