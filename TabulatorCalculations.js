/**
 * TabulatorCalculations.js - Beräkningsmodul för hierarkisk Tabulator.js struktur
 * 
 * Struktur: Project → Part → Item → Task
 * 
 * Redigerbara fält:
 * - Task: tsk_total_quantity, tsk_material_amount, tsk_material_user_price, tsk_work_task_duration
 * - Item: itm_quantity
 * 
 * Beräkningar flödar uppåt i hierarkin vid cellredigering
 */

class TabulatorCalculations {
    constructor(dataManager) {
        this.dataManager = dataManager;
        console.log('🧮 TabulatorCalculations initialized');
    }

    /**
     * Kolumnkonfiguration med mutators och editors
     */
    getTaskColumns() {
        return [
            { title: "Task ID", field: "tsk_id", editor: "input", width: 100, validator: "required" },
            { title: "Task Name", field: "tsk_name", editor: "input", validator: "required" },
            {
                title: "Task Total Quantity",
                field: "tsk_total_quantity",
                editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbolAfter: false,
                    precision: false,
                    negativeSign: true,
                    allowNegative: true,
                },
                mutator: (value, data) => {
                    return parseFloat(value) || 0;
                },
                cellEdited: (cell) => {
                    this.updateTask(cell.getRow());
                }
            },
            {
                title: "Task Work Task Duration",
                field: "tsk_work_task_duration",
                editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbol: "h",
                    symbolAfter: true,
                    negativeSign: true,
                    precision: false,
                },
                mutator: (value, data) => {
                    return parseFloat(value) || 0;
                },
                cellEdited: (cell) => {
                    this.updateTask(cell.getRow());
                }
            },
            {
                title: "Task Total Work Task Duration",
                field: "tsk_work_task_duration_total",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbol: "h",
                    symbolAfter: true,
                    negativeSign: true,
                    precision: 2,
                },
                mutator: (value, data) => {
                    return (data.tsk_total_quantity || 0) * (data.tsk_work_task_duration || 0);
                }
            },
            {
                title: "Task Material Amount",
                field: "tsk_material_amount",
                editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbolAfter: false,
                    precision: false,
                    negativeSign: true,
                    allowNegative: true,
                },
                mutator: (value, data) => {
                    return parseFloat(value) || 0;
                },
                cellEdited: (cell) => {
                    this.updateTask(cell.getRow());
                }
            },
            {
                title: "Task Material Price",
                field: "tsk_material_user_price",
                editor: "number",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbol: "kr",
                    symbolAfter: true,
                    negativeSign: true,
                    precision: 2,
                },
                mutator: (value, data) => {
                    return parseFloat(value) || 0;
                },
                cellEdited: (cell) => {
                    this.updateTask(cell.getRow());
                }
            },
            {
                title: "Task Material Price Total",
                field: "tsk_material_user_price_total",
                formatter: "money",
                formatterParams: {
                    decimal: ",",
                    thousand: " ",
                    symbol: "kr",
                    symbolAfter: true,
                    negativeSign: true,
                    precision: false,
                },
                mutator: (value, data) => {
                    return (data.tsk_total_quantity || 0) * (data.tsk_material_amount || 0) * (data.tsk_material_user_price || 0);
                }
            },
            { title: "Item ID", field: "itm_id", width: 80, editor: false }
        ];
    }

    getItemColumns() {
        return [
            {
                title: "Show/Hide",
                field: "show-hide",
                headerSort: false,
                width: 80,
                hozAlign: "center",
                formatter: function (cell) {
                    return cell.getData().tasks?.length > 0 ? '<i class="fas fa-plus-square"></i>' : "";
                }
            },
            { title: "Item ID", field: "itm_id", editor: "input", width: 100, validator: "required" },
            { title: "Item Name", field: "itm_name", editor: "input", validator: "required" },
            {
                title: "Item Quantity",
                field: "itm_quantity",
                editor: "number",
                mutator: (value, data) => {
                    return parseFloat(value) || 0;
                },
                cellEdited: (cell) => {
                    this.updateItem(cell.getRow());
                }
            },
            {
                title: "Item Material User Price",
                field: "itm_material_user_price",
                formatter: "money",
                formatterParams: {
                    symbol: "kr",
                },
                mutator: (value, data) => {
                    // Summera från tasks
                    const tasks = data.tasks || [];
                    return tasks.reduce((sum, task) => {
                        return sum + ((task.tsk_total_quantity || 0) * (task.tsk_material_amount || 0) * (task.tsk_material_user_price || 0));
                    }, 0);
                }
            },
            {
                title: "Item Material Price Total",
                field: "itm_material_user_price_total",
                formatter: "money",
                formatterParams: {
                    symbol: "kr",
                    precision: 1,
                },
                mutator: (value, data) => {
                    return (data.itm_quantity || 0) * (data.itm_material_user_price || 0);
                }
            },
            {
                title: "Item Work Task Duration",
                field: "itm_work_task_duration",
                formatter: "money",
                formatterParams: {
                    symbol: "h",
                },
                mutator: (value, data) => {
                    // Summera från tasks
                    const tasks = data.tasks || [];
                    return tasks.reduce((sum, task) => {
                        return sum + ((task.tsk_total_quantity || 0) * (task.tsk_work_task_duration || 0));
                    }, 0);
                }
            },
            {
                title: "Item Work Task Duration Total",
                field: "itm_work_task_duration_total",
                formatter: "money",
                formatterParams: {
                    symbol: "h",
                },
                mutator: (value, data) => {
                    return (data.itm_quantity || 0) * (data.itm_work_task_duration || 0);
                }
            },
            { title: "Part ID", field: "prt_id", width: 80, editor: false }
        ];
    }

    getPartColumns() {
        return [
            { title: "Part ID", field: "prt_id", editor: "input", width: 100, validator: "required" },
            { title: "Part Name", field: "prt_name", editor: "input", validator: "required" },
            {
                title: "Part Material Price Total",
                field: "prt_material_user_price_total",
                formatter: "money",
                formatterParams: {
                    symbol: "kr",
                    precision: 1,
                },
                mutator: (value, data) => {
                    // Summera från items
                    const items = data.items || [];
                    return items.reduce((sum, item) => {
                        return sum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
                    }, 0);
                }
            },
            {
                title: "Part Work Task Duration Total",
                field: "prt_work_task_duration_total",
                formatter: "money",
                formatterParams: {
                    symbol: "h",
                },
                mutator: (value, data) => {
                    // Summera från items
                    const items = data.items || [];
                    return items.reduce((sum, item) => {
                        return sum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
                    }, 0);
                }
            },
            { title: "Projekt ID", field: "prj_id", width: 100, editor: false }
        ];
    }

    getProjectColumns() {
        return [
            { title: "Project ID", field: "prj_id", editor: "input", width: 120, validator: "required" },
            { title: "Project Name", field: "prj_name", editor: "input", validator: "required" },
            {
                title: "Project Material Price Total",
                field: "prj_material_user_price_total",
                formatter: "money",
                formatterParams: {
                    symbol: "kr",
                    precision: 1,
                },
                mutator: (value, data) => {
                    // Summera från parts
                    const parts = data.parts || [];
                    return parts.reduce((sum, part) => {
                        const items = part.items || [];
                        return sum + items.reduce((itemSum, item) => {
                            return itemSum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
                        }, 0);
                    }, 0);
                }
            },
            {
                title: "Project Work Task Duration Total",
                field: "prj_work_task_duration_total",
                formatter: "money",
                formatterParams: {
                    symbol: "h",
                },
                mutator: (value, data) => {
                    // Summera från parts
                    const parts = data.parts || [];
                    return parts.reduce((sum, part) => {
                        const items = part.items || [];
                        return sum + items.reduce((itemSum, item) => {
                            return itemSum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
                        }, 0);
                    }, 0);
                }
            }
        ];
    }

    /**
     * Uppdateringsfunktioner som triggas vid cellredigering
     */
    updateTask(taskRow) {
        const taskData = taskRow.getData();
        console.log('🔄 Updating task calculations:', taskData.tsk_id);

        // Beräkna task totaler
        const tsk_material_user_price_total = 
            (taskData.tsk_total_quantity || 0) * 
            (taskData.tsk_material_amount || 0) * 
            (taskData.tsk_material_user_price || 0);

        const tsk_work_task_duration_total = 
            (taskData.tsk_total_quantity || 0) * 
            (taskData.tsk_work_task_duration || 0);

        // Uppdatera task-raden
        taskRow.update({
            tsk_material_user_price_total: tsk_material_user_price_total,
            tsk_work_task_duration_total: tsk_work_task_duration_total
        });

        console.log('📊 Task totals calculated:', {
            tsk_material_user_price_total,
            tsk_work_task_duration_total
        });

        // Hitta och uppdatera parent item
        this.updateItemFromTaskChange(taskData);

        // Spara ändringen
        if (this.dataManager) {
            this.dataManager.saveData("tasks", taskData.tsk_id, taskData);
        }
    }

    updateItem(itemRow) {
        const itemData = itemRow.getData();
        console.log('🔄 Updating item calculations:', itemData.itm_id);

        // Beräkna item totaler baserat på tasks
        const tasks = itemData.tasks || [];
        
        const itm_material_user_price = tasks.reduce((sum, task) => {
            return sum + ((task.tsk_total_quantity || 0) * (task.tsk_material_amount || 0) * (task.tsk_material_user_price || 0));
        }, 0);

        const itm_work_task_duration = tasks.reduce((sum, task) => {
            return sum + ((task.tsk_total_quantity || 0) * (task.tsk_work_task_duration || 0));
        }, 0);

        const itm_material_user_price_total = (itemData.itm_quantity || 0) * itm_material_user_price;
        const itm_work_task_duration_total = (itemData.itm_quantity || 0) * itm_work_task_duration;

        // Uppdatera item-raden
        itemRow.update({
            itm_material_user_price: itm_material_user_price,
            itm_work_task_duration: itm_work_task_duration,
            itm_material_user_price_total: itm_material_user_price_total,
            itm_work_task_duration_total: itm_work_task_duration_total
        });

        console.log('📊 Item totals calculated:', {
            itm_material_user_price,
            itm_work_task_duration,
            itm_material_user_price_total,
            itm_work_task_duration_total
        });

        // Hitta och uppdatera parent part
        this.updatePartFromItemChange(itemData);

        // Spara ändringen
        if (this.dataManager) {
            this.dataManager.saveData("items", itemData.itm_id, itemData);
        }
    }

    updatePart(partRow) {
        const partData = partRow.getData();
        console.log('🔄 Updating part calculations:', partData.prt_id);

        // Summera från items
        const items = partData.items || [];
        
        const prt_material_user_price_total = items.reduce((sum, item) => {
            return sum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
        }, 0);

        const prt_work_task_duration_total = items.reduce((sum, item) => {
            return sum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
        }, 0);

        // Uppdatera part-raden
        partRow.update({
            prt_material_user_price_total: prt_material_user_price_total,
            prt_work_task_duration_total: prt_work_task_duration_total
        });

        console.log('📊 Part totals calculated:', {
            prt_material_user_price_total,
            prt_work_task_duration_total
        });

        // Hitta och uppdatera parent project
        this.updateProjectFromPartChange(partData);

        // Spara ändringen
        if (this.dataManager) {
            this.dataManager.saveData("parts", partData.prt_id, partData);
        }
    }

    updateProject(projectRow) {
        const projectData = projectRow.getData();
        console.log('🔄 Updating project calculations:', projectData.prj_id);

        // Summera från parts
        const parts = projectData.parts || [];
        
        const prj_material_user_price_total = parts.reduce((sum, part) => {
            const items = part.items || [];
            return sum + items.reduce((itemSum, item) => {
                return itemSum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
            }, 0);
        }, 0);

        const prj_work_task_duration_total = parts.reduce((sum, part) => {
            const items = part.items || [];
            return sum + items.reduce((itemSum, item) => {
                return itemSum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
            }, 0);
        }, 0);

        // Uppdatera project-raden
        projectRow.update({
            prj_material_user_price_total: prj_material_user_price_total,
            prj_work_task_duration_total: prj_work_task_duration_total
        });

        console.log('📊 Project totals calculated:', {
            prj_material_user_price_total,
            prj_work_task_duration_total
        });

        // Spara ändringen
        if (this.dataManager) {
            this.dataManager.saveData("projects", projectData.prj_id, projectData);
        }
    }

    /**
     * Hjälpfunktioner för att hitta och uppdatera parent-element
     */
    updateItemFromTaskChange(taskData) {
        // Hitta item i projektdata och uppdatera
        const project = this.findProjectContainingTask(taskData.tsk_id);
        if (project) {
            const part = project.parts.find(p => p.items?.some(i => i.tasks?.some(t => t.tsk_id === taskData.tsk_id)));
            if (part) {
                const item = part.items.find(i => i.tasks?.some(t => t.tsk_id === taskData.tsk_id));
                if (item) {
                    // Uppdatera item-beräkningar i datakällan
                    this.recalculateItemInData(item);
                    // Hitta motsvarande tabellrad och uppdatera
                    this.findAndUpdateItemRow(item);
                }
            }
        }
    }

    updatePartFromItemChange(itemData) {
        // Hitta part i projektdata och uppdatera
        const project = this.findProjectContainingItem(itemData.itm_id);
        if (project) {
            const part = project.parts.find(p => p.items?.some(i => i.itm_id === itemData.itm_id));
            if (part) {
                // Uppdatera part-beräkningar i datakällan
                this.recalculatePartInData(part);
                // Hitta motsvarande tabellrad och uppdatera
                this.findAndUpdatePartRow(part);
            }
        }
    }

    updateProjectFromPartChange(partData) {
        // Hitta project i projektdata och uppdatera
        const project = this.findProjectContainingPart(partData.prt_id);
        if (project) {
            // Uppdatera project-beräkningar i datakällan
            this.recalculateProjectInData(project);
            // Hitta huvudtabellraden och uppdatera
            this.findAndUpdateProjectRow(project);
        }
    }

    /**
     * Hjälpfunktioner för att hitta element i projektdata
     */
    findProjectContainingTask(taskId) {
        // Anta att projektData är tillgänglig globalt eller injiceras
        return window.projectData?.find(project => 
            project.parts?.some(part => 
                part.items?.some(item => 
                    item.tasks?.some(task => task.tsk_id === taskId)
                )
            )
        );
    }

    findProjectContainingItem(itemId) {
        return window.projectData?.find(project => 
            project.parts?.some(part => 
                part.items?.some(item => item.itm_id === itemId)
            )
        );
    }

    findProjectContainingPart(partId) {
        return window.projectData?.find(project => 
            project.parts?.some(part => part.prt_id === partId)
        );
    }

    /**
     * Funktioner för att räkna om data
     */
    recalculateItemInData(item) {
        const tasks = item.tasks || [];
        
        item.itm_material_user_price = tasks.reduce((sum, task) => {
            return sum + ((task.tsk_total_quantity || 0) * (task.tsk_material_amount || 0) * (task.tsk_material_user_price || 0));
        }, 0);

        item.itm_work_task_duration = tasks.reduce((sum, task) => {
            return sum + ((task.tsk_total_quantity || 0) * (task.tsk_work_task_duration || 0));
        }, 0);

        item.itm_material_user_price_total = (item.itm_quantity || 0) * item.itm_material_user_price;
        item.itm_work_task_duration_total = (item.itm_quantity || 0) * item.itm_work_task_duration;
    }

    recalculatePartInData(part) {
        const items = part.items || [];
        
        part.prt_material_user_price_total = items.reduce((sum, item) => {
            return sum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
        }, 0);

        part.prt_work_task_duration_total = items.reduce((sum, item) => {
            return sum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
        }, 0);
    }

    recalculateProjectInData(project) {
        const parts = project.parts || [];
        
        project.prj_material_user_price_total = parts.reduce((sum, part) => {
            const items = part.items || [];
            return sum + items.reduce((itemSum, item) => {
                return itemSum + ((item.itm_quantity || 0) * (item.itm_material_user_price || 0));
            }, 0);
        }, 0);

        project.prj_work_task_duration_total = parts.reduce((sum, part) => {
            const items = part.items || [];
            return sum + items.reduce((itemSum, item) => {
                return itemSum + ((item.itm_quantity || 0) * (item.itm_work_task_duration || 0));
            }, 0);
        }, 0);
    }

    /**
     * Funktioner för att hitta och uppdatera tabellrader
     */
    findAndUpdateItemRow(item) {
        // Implementera logik för att hitta och uppdatera item-rad i nested table
        // Detta kräver referens till tabellinstanserna
        console.log('🔄 Would update item row:', item.itm_id);
    }

    findAndUpdatePartRow(part) {
        // Implementera logik för att hitta och uppdatera part-rad
        console.log('🔄 Would update part row:', part.prt_id);
    }

    findAndUpdateProjectRow(project) {
        // Uppdatera huvudtabellraden
        if (window.mainTable) {
            const rows = window.mainTable.getRows();
            const projectRow = rows.find(row => row.getData().prj_id === project.prj_id);
            if (projectRow) {
                projectRow.update({
                    prj_material_user_price_total: project.prj_material_user_price_total,
                    prj_work_task_duration_total: project.prj_work_task_duration_total
                });
                console.log('✅ Updated project row:', project.prj_id);
            }
        }
    }

    /**
     * Batch-uppdateringsfunction för att räkna om allt
     */
    recalculateAll() {
        console.log('🔄 Recalculating all hierarchical data...');
        
        if (!window.projectData) {
            console.warn('⚠️ No project data found for recalculation');
            return;
        }

        window.projectData.forEach(project => {
            project.parts?.forEach(part => {
                part.items?.forEach(item => {
                    // Räkna om item först
                    this.recalculateItemInData(item);
                });
                // Räkna om part
                this.recalculatePartInData(part);
            });
            // Räkna om project
            this.recalculateProjectInData(project);
        });

        console.log('✅ All calculations completed');
    }
}

// Export för modulanvändning
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabulatorCalculations;
}

// Global tillgänglighet
window.TabulatorCalculations = TabulatorCalculations;
