/**
 * ItemManager.js
 * 
 * Ansvarar för hantering av items och tasks, inklusive skapande, uppdatering och borttagning.
 * Fungerar tillsammans med CalculatorService för beräkningar.
 */

class ItemManager {
  constructor(dataSource, calculatorService) {
    this.data = dataSource;
    this.calculatorService = calculatorService;
    this.allCategories = new Set();
    this.newCategoryCounter = 1;
    
    // Initiera kategoriset från den ursprungliga datan
    this.refreshCategorySet();
  }

  // Uppdatera allCategories set baserat på aktuell data
  refreshCategorySet() {
    this.allCategories = new Set(this.data.map((item) => item.item_category));
  }

  // Skapa en knapp för att ta bort kategorier
  createDeleteButton(cell, updateFilterCallback) {
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

      // Hämta tabeller
      const menuTable = cell.getTable();
      const dataTable = Tabulator.findTable("#data-table")[0];

      // Förhindra radering om det är den sista kategorin
      if (menuTable.getData().length <= 1) {
        alert("At least one category must remain.");
        return;
      }

      // Visa en bekräftelsedialog
      const confirmDelete = confirm(
        `Are you sure you want to delete the category "${category}" and all its items?`
      );

      if (confirmDelete) {
        try {
          // Ta bort från allCategories
          this.allCategories.delete(category);
          console.log("Category removed from allCategories");
          console.log("Remaining categories:", Array.from(this.allCategories));

          // Hitta alla påverkade rader i dataTable
          const rowsToDelete = dataTable
            .getRows()
            .filter((row) => row.getData().item_category === category);

          // Ta bort rader från dataTable en efter en utan att rita om hela tabellen
          rowsToDelete.forEach((row) => row.delete());

          // Ta bort från den globala data-arrayen
          const itemsToRemoveIndexes = [];
          this.data.forEach((item, index) => {
            if (item.item_category === category) {
              itemsToRemoveIndexes.unshift(index); // Lägg till i början för att ta bort från slutet
            }
          });
          itemsToRemoveIndexes.forEach((index) => this.data.splice(index, 1));
          console.log("Updated global data:", this.data);

          // Ta bara bort den påverkade kategoriraden från menytabellen
          const categoryRow = cell.getRow();
          categoryRow.delete();

          // Uppdatera filtret för att spegla ändringar
          if (updateFilterCallback) {
            updateFilterCallback();
          }
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

  // Uppdatera totaler för en överordnad rad
  updateParentTotals(parentRow) {
    const rowData = parentRow.getData();
    const totals = this.calculatorService.calculateProjectTotals(rowData.tasks);

    // Uppdatera bara den specifika överordnade raden
    parentRow.update({
      item_work_task_duration: totals.item_work_task_duration,
      item_material_user_price: totals.item_material_user_price,
      item_material_user_price_total:
        rowData.item_quantity * totals.item_material_user_price,
      item_work_task_duration_total:
        rowData.item_quantity * totals.item_work_task_duration,
    });

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(rowData.item_category);
  }

  // Uppdatera en kategori i menytabellen
  updateCategoryInMenu(category) {
    // Beräkna kategorins totaler
    this.calculatorService.calculateCategoryTotals(this.data, category);
    
    // Hitta och uppdatera endast den påverkade kategoriraden
    const menuTable = Tabulator.findTable("#menu-table")[0];
    let menuRows = menuTable.getRows();
    let categoryRow = menuRows.find(
      (row) => row.getData().menu_category === category
    );
    
    if (categoryRow) {
      const rowData = categoryRow.getData();
      const categoryTotal = this.calculatorService.calculateCategoryTotals(this.data, category);
      
      categoryRow.update({
        ...rowData,
        category_material_user_price_total:
          categoryTotal.category_material_user_price_total,
        category_work_task_duration_total:
          categoryTotal.category_work_task_duration_total,
      });
    }
  }

  // Uppdatera beräkningar i en underordnad tabell
  updateCalculations(cell) {
    let row = cell.getRow();
    let data = row.getData();

    // Beräkna totaler med hjälp av CalculatorService
    data = this.calculatorService.updateTaskTotals(data);

    // Uppdatera uppgiftsraden
    row.update(data);

    // Hitta och uppdatera korrekt överordnad rad
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

  // Ta bort en uppgiftsrad och uppdatera beräkningar
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
      // Behåll referensen till den ursprungliga arrayen men filtrera innehållet
      parentData.tasks = parentData.tasks.filter(
        (task) => task.estimation_item_id !== taskData.estimation_item_id
      );

      // Uppdatera överordnad rad och beräkna nya totaler
      this.updateParentTotals(parentRow);
    }

    // Ta bort den aktuella raden från undertabellen
    row.delete();
  }

  // Lägg till en ny uppgiftsrad
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

    // Lägg till den nya uppgiften i överordnad rads uppgiftsarray
    parentData.tasks.push(newTask);

    // Uppdatera bara den specifika överordnade raden
    parentRow.update(parentData);

    // Uppdatera bara undertabellen för denna överordnade
    const subTableHolder = parentRow
      .getElement()
      .querySelector(".subtable-holder");
    if (subTableHolder) {
      const subTable = subTableHolder.querySelector(".tabulator");
      if (subTable) {
        const subTableInstance = Tabulator.findTable(subTable)[0];
        if (subTableInstance) {
          // Lägg bara till den nya raden
          subTableInstance.addData([newTask]);
        }
      }
    }

    // Uppdatera totaler för den överordnade raden
    this.updateParentTotals(parentRow);
  }

  // Lägg till en ny artikelrad
  addItemRow() {
    // Välj första tillgängliga kategori eller skapa en ny
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

    // Lägg till i den globala data-arrayen
    this.data.push(newItem);

    // Lägg bara till den nya raden i dataTable
    const dataTable = Tabulator.findTable("#data-table")[0];
    dataTable.addData([newItem]);

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(firstCategory);
  }

  // Hantera kategoriändring i menytabellen
  handleCategoryEdit(cell, updateFilterCallback, refreshCategoryDropdownsCallback) {
    const oldCategory = cell.getOldValue();
    const newCategory = cell.getValue();

    // Uppdatera allCategories set
    this.allCategories.delete(oldCategory);
    this.allCategories.add(newCategory);

    // Uppdatera kategorinamn i alla påverkade artiklar
    const dataTable = Tabulator.findTable("#data-table")[0];
    const affectedRows = dataTable
      .getRows()
      .filter((row) => row.getData().item_category === oldCategory);

    // Uppdatera varje påverkad rad
    affectedRows.forEach((row) => {
      const rowData = row.getData();
      rowData.item_category = newCategory;
      row.update(rowData);
    });

    // Uppdatera även i den globala data-arrayen
    this.data.forEach((item) => {
      if (item.item_category === oldCategory) {
        item.item_category = newCategory;
      }
    });

    // Uppdatera filtret
    if (updateFilterCallback) {
      updateFilterCallback();
    }

    // Uppdatera rullgardinsmenyer i datatabellen
    if (refreshCategoryDropdownsCallback) {
      refreshCategoryDropdownsCallback();
    }
  }

  // Uppdatera kvantitet för en artikel
  handleQuantityEdit(cell) {
    const row = cell.getRow();
    const rowData = row.getData();

    // Uppdatera totaler för denna rad med CalculatorService
    this.calculatorService.updateItemTotals(rowData);
    row.update(rowData);

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(rowData.item_category);
  }

  // Ta bort en artikel
  deleteItem(cell) {
    const row = cell.getRow();
    const rowData = row.getData();
    const category = rowData.item_category;

    // Ta bort från den globala data-arrayen
    const index = this.data.findIndex((item) => item.id === rowData.id);
    if (index !== -1) {
      this.data.splice(index, 1);
    }

    // Ta bara bort denna specifika rad
    row.delete();

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(category);
  }

  // Lägg till en ny kategori i menyn
  addMenuCategory() {
    const newCategory = `New Category ${this.newCategoryCounter++}`;
    this.allCategories.add(newCategory);

    // Skapa ett nytt kategoriobjekt
    const newCategoryData = {
      menu_category: newCategory,
      category_material_user_price_total: 0,
      category_work_task_duration_total: 0,
      selected: true,
    };

    // Lägg bara till den nya kategorin i menytabellen
    const menuTable = Tabulator.findTable("#menu-table")[0];
    menuTable.addData([newCategoryData]);
    
    return newCategory;
  }

  // Rendera kategori-dropdown för dataTable
  renderCategoryDropdown(cell) {
    const category = cell.getValue();
    const select = document.createElement("select");
    
    // Hämta menytabellen för att få alla tillgängliga kategorier
    const menuTable = Tabulator.findTable("#menu-table")[0];
    
    menuTable.getData().forEach((row) => {
      const option = document.createElement("option");
      option.value = row.menu_category;
      option.text = row.menu_category;
      if (category === row.menu_category) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", (e) => {
      const oldCategory = cell.getValue();
      const newCategory = e.target.value;

      // Uppdatera bara den påverkade raden
      const row = cell.getRow();
      const rowData = row.getData();
      rowData.item_category = newCategory;
      row.update(rowData);

      // Uppdatera även i den globala data-arrayen
      const dataIndex = this.data.findIndex((item) => item.id === rowData.id);
      if (dataIndex !== -1) {
        this.data[dataIndex].item_category = newCategory;
      }

      // Uppdatera bara de påverkade kategorierna i menyn
      this.updateCategoryInMenu(oldCategory);
      this.updateCategoryInMenu(newCategory);
    });
    
    return select;
  }

  // Återställ filter för meny
  resetMenuFilter() {
    const menuTable = Tabulator.findTable("#menu-table")[0];
    
    // Uppdatera alla menuTable-rader individuellt utan att köra setData
    menuTable.getRows().forEach((row) => {
      const rowData = row.getData();
      rowData.selected = true;
      row.update(rowData);
    });
  }
}

// Exportera klassen för användning i andra moduler
export default ItemManager;
