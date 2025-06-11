// constructionMethodFooter.js
// Footer functionality for Construction Method summaries

class ConstructionMethodFooter {
  constructor() {
    this.dataTable = null
    this.footerContainer = null
    this.originalFunctions = {}
  }

  // Initiera footer med dataTable reference
  init(dataTable, footerContainerId = 'construction-method-footer') {
    this.dataTable = dataTable
    this.footerContainer = document.getElementById(footerContainerId)
    
    if (!this.footerContainer) {
      console.error(`Footer container with ID '${footerContainerId}' not found!`)
      return false
    }
    
    console.log('Initializing Construction Method Footer...')
    this.setupEventListeners()
    this.updateFooterDisplay()
    return true
  }

  // Funktion för att beräkna footer-data
  calculateFooterData() {
    const footerData = {}
    
    if (!this.dataTable) {
      console.warn('DataTable not initialized')
      return footerData
    }
    
    // Hämta filtrerade data direkt från Tabulator
    const filteredData = this.dataTable.getData("visible")
    
    console.log('Filtered data count:', filteredData.length) // Debug
    
    // Loopa igenom alla filtrerade rader och deras tasks
    filteredData.forEach(rowData => {
      // Kontrollera att tasks finns
      if (rowData.tasks && Array.isArray(rowData.tasks)) {
        rowData.tasks.forEach(task => {
          const constructionMethod = task.construction_method || 'Okänd metod'
          
          // Initiera om construction method inte finns
          if (!footerData[constructionMethod]) {
            footerData[constructionMethod] = {
              totalMaterialPrice: 0,
              totalWorkDuration: 0
            }
          }
          
          // Summera värdena
          footerData[constructionMethod].totalMaterialPrice += parseFloat(task.material_user_price_total || 0)
          footerData[constructionMethod].totalWorkDuration += parseFloat(task.work_task_duration_total || 0)
        })
      }
    })
    
    console.log('Footer data:', footerData) // Debug
    return footerData
  }

  // Funktion för att uppdatera footer-display
  updateFooterDisplay() {
    if (!this.footerContainer) {
      console.warn('Footer container not available')
      return
    }

    const footerData = this.calculateFooterData()
    
    // Skapa HTML för footer
    let footerHTML = '<h3>Summering per Construction Method</h3>'
    
    if (Object.keys(footerData).length === 0) {
      footerHTML += '<p style="color: #6c757d; font-style: italic;">Inga data att visa</p>'
    } else {
      footerHTML += '<div class="footer-grid">'
      
      // Sortera construction methods alfabetiskt
      const sortedMethods = Object.keys(footerData).sort()
      
      sortedMethods.forEach(method => {
        const data = footerData[method]
        footerHTML += `
          <div class="method-card">
            <h4>${method}</h4>
            <div class="method-row">
              <span class="method-label">Material:</span>
              <span class="method-value">${data.totalMaterialPrice.toLocaleString('sv-SE')} kr</span>
            </div>
            <div class="method-row">
              <span class="method-label">Arbetstid:</span>
              <span class="method-value">${data.totalWorkDuration.toLocaleString('sv-SE', {minimumFractionDigits: 1, maximumFractionDigits: 1})} h</span>
            </div>
          </div>
        `
      })
      
      footerHTML += '</div>'
      
      // Lägg till totalsumma
      const totalMaterial = Object.values(footerData).reduce((sum, data) => sum + data.totalMaterialPrice, 0)
      const totalWork = Object.values(footerData).reduce((sum, data) => sum + data.totalWorkDuration, 0)
      
      footerHTML += `
        <div class="footer-total">
          <div class="method-row">
            <span>Total Material:</span>
            <span class="total-value">${totalMaterial.toLocaleString('sv-SE')} kr</span>
          </div>
          <div class="method-row">
            <span>Total Arbetstid:</span>
            <span class="total-value">${totalWork.toLocaleString('sv-SE', {minimumFractionDigits: 1, maximumFractionDigits: 1})} h</span>
          </div>
        </div>
      `
    }
    
    this.footerContainer.innerHTML = footerHTML
  }

  // Wrappa en funktion för att inkludera footer-uppdatering
  wrapFunction(obj, functionName, context = window) {
    if (typeof context[functionName] === 'function') {
      // Spara original-funktionen
      this.originalFunctions[functionName] = context[functionName]
      
      // Skapa wrapper
      const self = this
      context[functionName] = function(...args) {
        // Kör original-funktionen
        const result = self.originalFunctions[functionName].apply(this, args)
        // Uppdatera footer
        setTimeout(() => self.updateFooterDisplay(), 50)
        return result
      }
      
      console.log(`Wrapped function: ${functionName}`)
    } else {
      console.warn(`Function ${functionName} not found on context`)
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.dataTable) return

    // Lyssna på Tabulator's egna filter-events
    this.dataTable.on("dataFiltered", () => {
      console.log('Data filtered, updating footer...') // Debug
      setTimeout(() => this.updateFooterDisplay(), 50)
    })
    
    // Lyssna på när data laddas/uppdateras
    this.dataTable.on("dataChanged", () => {
      console.log('Data changed, updating footer...') // Debug
      setTimeout(() => this.updateFooterDisplay(), 50)
    })

    // Wrappa updateFilter om den finns
    if (typeof window.updateFilter === 'function') {
      const originalUpdateFilter = window.updateFilter
      window.updateFilter = () => {
        originalUpdateFilter()
        setTimeout(() => this.updateFooterDisplay(), 200)
      }
    }

    // Wrappa andra funktioner
    this.wrapFunction(window, 'updateParentTotals')
    this.wrapFunction(window, 'updateCalculations')
    this.wrapFunction(window, 'deleteTaskRow')
    this.wrapFunction(window, 'addTaskRow')
    this.wrapFunction(window, 'addItemRow')

    // Lyssna på tag-system filter om det finns
    setTimeout(() => {
      if (window.tagSystem && window.tagSystem.applyFilters) {
        const originalApplyFilters = window.tagSystem.applyFilters
        window.tagSystem.applyFilters = (...args) => {
          originalApplyFilters.apply(window.tagSystem, args)
          setTimeout(() => this.updateFooterDisplay(), 100)
        }
        console.log('Wrapped tagSystem.applyFilters')
      }
    }, 1000)
  }

  // Manuell uppdatering (för extern användning)
  refresh() {
    this.updateFooterDisplay()
  }

  // Rensa upp (om behövs)
  destroy() {
    // Återställ original-funktioner
    Object.keys(this.originalFunctions).forEach(functionName => {
      if (this.originalFunctions[functionName]) {
        window[functionName] = this.originalFunctions[functionName]
      }
    })
    
    this.originalFunctions = {}
    this.dataTable = null
    this.footerContainer = null
  }
}

// Exportera klassen som default
export default ConstructionMethodFooter
