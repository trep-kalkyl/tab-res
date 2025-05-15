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
      // Hämta data först innan vi gör någon ändring
      const row = cell.getRow();
      if (!row) {
        console.error("Row reference is invalid");
        return;
      }
      
      const rowData = row.getData();
      if (!rowData) {
        console.error("Unable to get row data");
        return;
      }
      
      const category = rowData.menu_category;
      console.log("Attempting to delete category:", category);

      // Hämta tabeller
      const menuTable = cell.getTable();
      if (!menuTable) {
        console.error("Menu table reference is invalid");
        return;
      }
      
      const dataTable = Tabulator.findTable("#data-table")[0];
      if (!dataTable) {
        console.error("Data table reference is invalid");
        return;
      }

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

          // Först spara alla påverkade rader och deras data
          const rowsToDeleteData = [];
          dataTable.getRows().forEach(dataRow => {
            const rowData = dataRow.getData();
            if (rowData && rowData.item_category === category) {
              rowsToDeleteData.push(rowData);
            }
          });

          // Ta bort från den globala data-arrayen först
          this.data = this.data.filter(item => item.item_category !== category);
          console.log("Updated global data:", this.data);

          // Säkert ta bort rader från dataTable
          dataTable.getRows().forEach(dataRow => {
            const data = dataRow.getData();
            if (data && data.item_category === category) {
              // Använd deleteRow som är säkrare än row.delete()
              dataTable.deleteRow(dataRow.getIndex());
            }
          });

          // Ta bort kategoriraden från menytabellen
          menuTable.deleteRow(row.getIndex());

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
    if (!parentRow) {
      console.error("Invalid parent row reference");
      return;
    }
    
    const rowData = parentRow.getData();
    if (!rowData) {
      console.error("Unable to get parent row data");
      return;
    }
    
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
    if (!category) return;
    
    // Beräkna kategorins totaler
    const categoryTotal = this.calculatorService.calculateCategoryTotals(this.data, category);
    
    // Hitta och uppdatera endast den påverkade kategoriraden
    const menuTable = Tabulator.findTable("#menu-table")[0];
    if (!menuTable) {
      console.error("Menu table reference is invalid");
      return;
    }
    
    // Använd getRows() med försiktighet - kontrollera att tabellen finns och har data
    const menuData = menuTable.getData();
    const categoryRowIndex = menuData.findIndex(row => row.menu_category === category);
    
    if (categoryRowIndex !== -1) {
      const rowData = menuData[categoryRowIndex];
      // Uppdatera tabellen med nya värden
      menuTable.updateData([{
        ...rowData,
        category_material_user_price_total: categoryTotal.category_material_user_price_total,
        category_work_task_duration_total: categoryTotal.category_work_task_duration_total
      }]);
    }
  }

  // Uppdatera beräkningar i en underordnad tabell
  updateCalculations(cell) {
    let row = cell.getRow();
    if (!row) {
      console.error("Row reference is invalid");
      return;
    }
    
    let data = row.getData();
    if (!data) {
      console.error("Unable to get row data");
      return;
    }

    // Beräkna totaler med hjälp av CalculatorService
    data = this.calculatorService.updateTaskTotals(data);

    // Uppdatera uppgiftsraden
    row.update(data);

    // Hitta och uppdatera korrekt överordnad rad
    let parentTable = Tabulator.findTable("#data-table")[0];
    if (!parentTable) {
      console.error("Parent table reference is invalid");
      return;
    }
    
    // Säker sökning efter överordnad rad
    const parentData = parentTable.getData();
    const parentIndex = parentData.findIndex(pData => 
      pData.tasks && pData.tasks.some(task => task.estimation_item_id === data.estimation_item_id)
    );
    
    if (parentIndex !== -1) {
      const parentRow = parentTable.getRow(parentIndex);
      if (parentRow) {
        let parentRowData = parentRow.getData();
        const taskIndex = parentRowData.tasks.findIndex(
          (task) => task.estimation_item_id === data.estimation_item_id
        );
        
        if (taskIndex !== -1) {
          parentRowData.tasks[taskIndex] = data;
          
          // Uppdatera först den globala data-arrayen
          const globalIndex = this.data.findIndex(item => item.id === parentRowData.id);
          if (globalIndex !== -1) {
            this.data[globalIndex].tasks[taskIndex] = data;
          }
          
          this.updateParentTotals(parentRow);
        }
      }
    }
  }

  // Ta bort en uppgiftsrad och uppdatera beräkningar
  deleteTaskRow(row) {
    if (!row) {
      console.error("Row reference is invalid");
      return;
    }
    
    let taskData = row.getData();
    if (!taskData) {
      console.error("Unable to get task data");
      return;
    }
    
    const estimationId = taskData.estimation_item_id;
    let parentTable = Tabulator.findTable("#data-table")[0];
    if (!parentTable) {
      console.error("Parent table reference is invalid");
      return;
    }
    
    // Säker sökning efter överordnad rad
    const parentData = parentTable.getData();
    const parentIndex = parentData.findIndex(pData => 
      pData.tasks && pData.tasks.some(task => task.estimation_item_id === estimationId)
    );
    
    if (parentIndex !== -1) {
      const parentRow = parentTable.getRow(parentIndex);
      if (parentRow) {
        let parentRowData = parentRow.getData();
        const category = parentRowData.item_category;
        
        // Behåll referensen till den ursprungliga arrayen men filtrera innehållet
        parentRowData.tasks = parentRowData.tasks.filter(
          (task) => task.estimation_item_id !== estimationId
        );
        
        // Uppdatera först den globala data-arrayen
        const globalIndex = this.data.findIndex(item => item.id === parentRowData.id);
        if (globalIndex !== -1) {
          this.data[globalIndex].tasks = [...parentRowData.tasks];
        }

        // Ta bort den aktuella raden från undertabellen innan vi gör andra ändringar
        const subTable = row.getTable();
        if (subTable) {
          subTable.deleteRow(row.getIndex());
        }
        
        // Uppdatera överordnad rad och beräkna nya totaler
        this.updateParentTotals(parentRow);
      }
    } else {
      // Om vi inte hittade en föräldrarad, ta bara bort uppgiftsraden
      const subTable = row.getTable();
      if (subTable) {
        subTable.deleteRow(row.getIndex());
      }
    }
  }

  // Lägg till en ny uppgiftsrad
  addTaskRow(parentRow) {
    if (!parentRow) {
      console.error("Parent row reference is invalid");
      return;
    }
    
    const parentData = parentRow.getData();
    if (!parentData) {
      console.error("Unable to get parent row data");
      return;
    }
    
    const newTask = {
      estimation_item_id: `E${Math.floor(Math.random() * 1000000)}`, // Öka för att minska kollisionsrisk
      total_quantity: 1,
      work_task_duration: 0,
      work_task_duration_total: 0,
      material_amount: 1,
      material_user_price: 0,
      material_user_price_total: 0,
    };

    // Lägg till den nya uppgiften i överordnad rads uppgiftsarray
    if (!parentData.tasks) {
      parentData.tasks = [];
    }
    parentData.tasks.push(newTask);
    
    // Uppdatera först den globala data-arrayen
    const globalIndex = this.data.findIndex(item => item.id === parentData.id);
    if (globalIndex !== -1) {
      if (!this.data[globalIndex].tasks) {
        this.data[globalIndex].tasks = [];
      }
      this.data[globalIndex].tasks.push({...newTask});
    }

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
          subTableInstance.addData([{...newTask}]);
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
    
    // Generera unik ID
    const newId = Math.max(...this.data.map(item => item.id), 0) + 1;

    const newItem = {
      id: newId,
      item_name: "New Item",
      item_category: firstCategory,
      item_quantity: 1,
      item_material_user_price: 0,
      item_material_user_price_total: 0,
      item_work_task_duration: 0,
      item_work_task_duration_total: 0,
      tasks: [
        {
          estimation_item_id: `E${Math.floor(Math.random() * 1000000)}`, // Öka för att minska kollisionsrisk
          total_quantity: 1,
          work_task_duration: 0,
          work_task_duration_total: 0,
          material_amount: 1,
          material_user_price: 0,
          material_user_price_total: 0,
        },
      ],
    };

    // Lägg till i den globala data-arrayen först
    this.data.push({...newItem});

    // Lägg bara till den nya raden i dataTable
    const dataTable = Tabulator.findTable("#data-table")[0];
    if (dataTable) {
      dataTable.addData([{...newItem}]);
    }

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(firstCategory);
  }

  // Hantera kategoriändring i menytabellen
  handleCategoryEdit(cell, updateFilterCallback, refreshCategoryDropdownsCallback) {
    if (!cell) {
      console.error("Cell reference is invalid");
      return;
    }
    
    const oldCategory = cell.getOldValue();
    const newCategory = cell.getValue();
    
    if (oldCategory === newCategory) return;

    // Uppdatera allCategories set
    this.allCategories.delete(oldCategory);
    this.allCategories.add(newCategory);

    // Uppdatera den globala data-arrayen först
    this.data.forEach(item => {
      if (item.item_category === oldCategory) {
        item.item_category = newCategory;
      }
    });

    // Uppdatera kategorinamn i alla påverkade artiklar
    const dataTable = Tabulator.findTable("#data-table")[0];
    if (!dataTable) {
      console.error("Data table reference is invalid");
      return;
    }
    
    // Uppdatera data i tabellen med updateData istället för att iterera över rader
    const updatedRows = dataTable.getData()
      .filter(row => row.item_category === oldCategory)
      .map(row => ({...row, item_category: newCategory}));
      
    if (updatedRows.length > 0) {
      dataTable.updateData(updatedRows);
    }

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
    if (!cell) {
      console.error("Cell reference is invalid");
      return;
    }
    
    const row = cell.getRow();
    if (!row) {
      console.error("Row reference is invalid");
      return;
    }
    
    const rowData = row.getData();
    if (!rowData) {
      console.error("Unable to get row data");
      return;
    }

    // Uppdatera först den globala data-arrayen
    const globalIndex = this.data.findIndex(item => item.id === rowData.id);
    if (globalIndex !== -1) {
      this.data[globalIndex].item_quantity = rowData.item_quantity;
    }

    // Uppdatera totaler för denna rad med CalculatorService
    this.calculatorService.updateItemTotals(rowData);
    row.update(rowData);

    // Uppdatera bara den påverkade kategorin i menyn
    this.updateCategoryInMenu(rowData.item_category);
  }

  // Ta bort en artikel
  deleteItem(cell) {
    if (!cell) {
      console.error("Cell reference is invalid");
      return;
    }
    
    const row = cell.getRow();
    if (!row) {
      console.error("Row reference is invalid");
      return;
    }
    
    const rowData = row.getData();
    if (!rowData) {
      console.error("Unable to get row data");
      return;
    }
    
    const category = rowData.item_category;
    const itemId = rowData.id;

    // Ta bort från den globala data-arrayen först
    this.data = this.data.filter(item => item.id !== itemId);

    // Använd deleteRow som är säkrare än row.delete()
    const dataTable = row.getTable();
    if (dataTable) {
      dataTable.deleteRow(row.getIndex());
    }

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
    if (menuTable) {
      menuTable.addData([{...newCategoryData}]);
    }
    
    return newCategory;
  }

  // Rendera kategori-dropdown för dataTable
  renderCategoryDropdown(cell) {
    if (!cell) {
      console.error("Cell reference is invalid");
      return document.createElement("div");
    }
    
    const category = cell.getValue();
    const select = document.createElement("select");
    
    // Hämta menytabellen för att få alla tillgängliga kategorier
    const menuTable = Tabulator.findTable("#menu-table")[0];
    if (!menuTable) {
      console.error("Menu table reference is invalid");
      return select;
    }
    
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
      
      if (oldCategory === newCategory) return;

      // Säkerhetskontroller
      const row = cell.getRow();
      if (!row) {
        console.error("Row reference is invalid");
        return;
      }
      
      const rowData = row.getData();
      if (!rowData) {
        console.error("Unable to get row data");
        return;
      }

      // Uppdatera först den globala data-arrayen
      const dataIndex = this.data.findIndex(item => item.id === rowData.id);
      if (dataIndex !== -1) {
        this.data[dataIndex].item_category = newCategory;
      }

      // Uppdatera bara den påverkade raden
      rowData.item_category = newCategory;
      row.update(rowData);

      // Uppdatera bara de påverkade kategorierna i menyn
      this.updateCategoryInMenu(oldCategory);
      this.updateCategoryInMenu(newCategory);
    });
    
    return select;
  }

  // Återställ filter för meny
  resetMenuFilter() {
    const menuTable = Tabulator.findTable("#menu-table")[0];
    if (!menuTable) {
      console.error("Menu table reference is invalid");
      return;
    }
    
    // Uppdatera alla data på en gång för bättre prestanda
    const allData = menuTable.getData().map(row => ({...row, selected: true}));
    menuTable.updateData(allData);
  }
}

// Exportera klassen för användning i andra moduler
export default ItemManager;
