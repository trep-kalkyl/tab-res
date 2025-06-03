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
    try {
      // Hämta row-referensen direkt från cell
      const row = cell.getRow();
      if (!row) {
        console.error("Row reference is invalid");
        return;
      }
      
      // Hämta data INNAN vi gör några ändringar
      const rowData = row.getData();
      if (!rowData) {
        console.error("Unable to get row data");
        return;
      }
      
      const category = rowData.menu_category;
      console.log("Attempting to delete category:", category);

      // Hämta tabellreferenser
      const menuTable = Tabulator.findTable("#menu-table")[0];
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
        console.log("User confirmed deletion");

        // 1. Ta bort från allCategories FÖRST
        this.allCategories.delete(category);
        console.log("Category removed from allCategories");

        // 2. Uppdatera den globala data-arrayen FÖRST
        const itemsToDelete = this.data.filter(item => item.item_category === category);
        this.data = this.data.filter(item => item.item_category !== category);
        console.log(`Removed ${itemsToDelete.length} items from global data`);

        // 3. Ta bort från dataTable - använd filter istället för deleteRow
        // För att undvika "No matching row found" fel
        const remainingDataTableRows = dataTable.getData().filter(item => item.item_category !== category);
        dataTable.setData(remainingDataTableRows);
        console.log("Updated data table");

        // 4. Ta bort kategoriraden från menytabellen
        // Använd row-objektet direkt istället för index
        try {
          row.delete();
          console.log("Menu row deleted successfully");
        } catch (deleteError) {
          console.error("Error deleting menu row:", deleteError);
          // Fallback: använd setData för att återskapa tabellen utan den borttagna kategorin
          const remainingMenuRows = menuTable.getData().filter(menuRow => menuRow.menu_category !== category);
          menuTable.setData(remainingMenuRows);
          console.log("Menu table recreated without deleted category");
        }

        // 5. Uppdatera filtret
        if (updateFilterCallback) {
          updateFilterCallback();
        }

        console.log("Category deletion completed successfully");
      }
    } catch (error) {
      console.error("Error during category deletion:", error);
      alert("An error occurred while deleting the category. Please check the console for details.");
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
// ERSÄTT updateCategoryInMenu metoden i ItemManager.js (rad ~115-140)
// med denna fixade version:

updateCategoryInMenu(category) {
  if (!category) return;
  
  // Beräkna kategorins totaler FRÅN SCRATCH baserat på aktuell data
  const categoryTotal = this.calculatorService.calculateCategoryTotals(this.data, category);
  
  // Hitta och uppdatera endast den påverkade kategoriraden
  const menuTable = Tabulator.findTable("#menu-table")[0];
  if (!menuTable) {
    console.error("Menu table reference is invalid");
    return;
  }
  
  // VIKTIGT: Använd updateData istället för att manipulera rader direkt
  const menuData = menuTable.getData();
  const categoryRowIndex = menuData.findIndex(row => row.menu_category === category);
  
  if (categoryRowIndex !== -1) {
    const rowData = menuData[categoryRowIndex];
    
    // Skapa uppdaterat data-objekt
    const updatedRow = {
      ...rowData,
      category_material_user_price_total: categoryTotal.category_material_user_price_total,
      category_work_task_duration_total: categoryTotal.category_work_task_duration_total
    };
    
    console.log(`Updating menu category "${category}":`, {
      old_price: rowData.category_material_user_price_total,
      new_price: categoryTotal.category_material_user_price_total,
      old_duration: rowData.category_work_task_duration_total,
      new_duration: categoryTotal.category_work_task_duration_total
    });
    
    // Uppdatera tabellen med nya värden
    menuTable.updateData([updatedRow]);
  } else {
    console.warn(`Category "${category}" not found in menu table`);
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
    
    // VIKTIGT: Spara all nödvändig data innan vi gör något som kan göra row ogiltig
    const taskData = row.getData();
    if (!taskData) {
      console.error("Unable to get task data");
      return;
    }
    
    const estimationId = taskData.estimation_item_id;
    const rowIndex = row.getIndex();
    const subTable = row.getTable();
    
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
      // Uppdatera den globala data-arrayen först
      const parentRow = parentTable.getRow(parentIndex);
      if (parentRow) {
        let parentRowData = parentRow.getData();
        const category = parentRowData.item_category;
        
        // Uppdatera den globala data-arrayen först
        const globalIndex = this.data.findIndex(item => item.id === parentRowData.id);
        if (globalIndex !== -1) {
          this.data[globalIndex].tasks = this.data[globalIndex].tasks.filter(
            task => task.estimation_item_id !== estimationId
          );
        }
        
        // Uppdatera sedan den lokala data-strukturen
        parentRowData.tasks = parentRowData.tasks.filter(
          task => task.estimation_item_id !== estimationId
        );
        
        // Ta bort uppgiftsraden EFTER att alla datastrukturer är uppdaterade
        if (subTable) {
          subTable.deleteRow(rowIndex);
        }
        
        // Uppdatera överordnad rad och beräkna nya totaler
        this.updateParentTotals(parentRow);
      }
    } else {
      // Om vi inte hittade en föräldrarad, ta bara bort uppgiftsraden
      if (subTable) {
        subTable.deleteRow(rowIndex);
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
    
    // VIKTIGT: Spara all nödvändig information innan någon operation utförs
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
    const rowIndex = row.getIndex();
    const dataTable = cell.getTable(); // Spara tabellreferensen

    // Uppdatera den globala data-arrayen INNAN radoperationer
    this.data = this.data.filter(item => item.id !== itemId);

    // Använd det sparade indexet och tabellreferensen för att ta bort raden
    // EFTER att vi har uppdaterat alla datastrukturer
    if (dataTable) {
      dataTable.deleteRow(rowIndex);
    }

    // Uppdatera bara den påverkade kategorin i menyn
    // Detta körs EFTER att raden har tagits bort
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
// Uppdaterad renderCategoryDropdown metod för ItemManager.js
// Denna ersätter den befintliga metoden

// ERSÄTT hela renderCategoryDropdown metoden i ItemManager.js (rad ~320-430)
// med denna fixade version:

renderCategoryDropdown(cell) {
  if (!cell) {
    console.error("Cell reference is invalid");
    return document.createElement("div");
  }
  
  const category = cell.getValue();
  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.height = "100%";
  select.style.border = "none";
  select.style.background = "transparent";
  
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
    e.stopPropagation(); // Förhindra att eventet bubblar upp
    
    const oldCategory = cell.getValue(); // VIKTIGT: Hämta INNAN vi uppdaterar
    const newCategory = e.target.value;
    
    if (oldCategory === newCategory) return;

    console.log(`Changing category from "${oldCategory}" to "${newCategory}"`);

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

    // KRITISKT: Uppdatera först den globala data-arrayen
    const dataIndex = this.data.findIndex(item => item.id === rowData.id);
    if (dataIndex !== -1) {
      this.data[dataIndex].item_category = newCategory;
      console.log("Updated global data for item:", rowData.id);
    }

    // Uppdatera rowData
    rowData.item_category = newCategory;
    
    // KRITISKT: Uppdatera cellen och raden för att Tabulator ska känna till ändringen
    try {
      // Uppdatera cell-värdet direkt
      cell.getElement().querySelector('select').value = newCategory;
      
      // Trigga Tabulator's interna uppdatering
      row.update(rowData);
      
      // Force en re-render av cellen om nödvändigt
      cell.getTable().redraw();
      
    } catch (updateError) {
      console.error("Error updating cell/row:", updateError);
    }

    // FIXAT: Uppdatera BÅDA kategorierna i RÄTT ORDNING
    // Först den gamla kategorin (som nu har förlorat ett item)
    console.log("Updating old category:", oldCategory);
    this.updateCategoryInMenu(oldCategory);
    
    // Sedan den nya kategorin (som nu har fått ett item)  
    console.log("Updating new category:", newCategory);
    this.updateCategoryInMenu(newCategory);
    
    console.log("Category change completed");
  });

  // Lägg till focus/blur handlers för bättre UX
  select.addEventListener("focus", (e) => {
    e.target.style.outline = "2px solid #007bff";
  });
  
  select.addEventListener("blur", (e) => {
    e.target.style.outline = "none";
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
