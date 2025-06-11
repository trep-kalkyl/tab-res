// constructionMethodFooter.js
// Footer functionality for Construction Method summaries with charts

class ConstructionMethodFooter {
  constructor() {
    this.dataTable = null
    this.footerContainer = null
    this.originalFunctions = {}
    this.materialChart = null
    this.workChart = null
    this.chartColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
      '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ]
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
    this.loadChartJS().then(() => {
      this.setupEventListeners()
      this.updateFooterDisplay()
    })
    return true
  }

  // Ladda Chart.js från CDN
  async loadChartJS() {
    if (typeof Chart !== 'undefined') {
      console.log('Chart.js already loaded')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
      script.onload = () => {
        console.log('Chart.js loaded successfully')
        resolve()
      }
      script.onerror = () => {
        console.error('Failed to load Chart.js')
        reject(new Error('Failed to load Chart.js'))
      }
      document.head.appendChild(script)
    })
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
    
    // Skapa HTML för footer med charts
    let footerHTML = `
      <div class="construction-footer-container">
        <h3>Summering per Construction Method</h3>
        
        <div class="charts-container">
          <div class="chart-wrapper">
            <h4>Material Fördelning</h4>
            <canvas id="materialChart" width="300" height="300"></canvas>
          </div>
          <div class="chart-wrapper">
            <h4>Arbetstid Fördelning</h4>
            <canvas id="workChart" width="300" height="300"></canvas>
          </div>
        </div>
    `
    
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
    
    footerHTML += '</div>' // Stäng construction-footer-container
    
    this.footerContainer.innerHTML = footerHTML
    
    // Skapa charts efter DOM har uppdaterats
    setTimeout(() => {
      this.createCharts(footerData)
    }, 100)
  }

  // Skapa donut charts
  createCharts(footerData) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded, skipping chart creation')
      return
    }

    // Förstör befintliga charts
    if (this.materialChart) {
      this.materialChart.destroy()
    }
    if (this.workChart) {
      this.workChart.destroy()
    }

    if (Object.keys(footerData).length === 0) {
      return
    }

    const methods = Object.keys(footerData).sort()
    const materialData = methods.map(method => footerData[method].totalMaterialPrice)
    const workData = methods.map(method => footerData[method].totalWorkDuration)

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || ''
              const value = context.parsed
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
              return `${label}: ${percentage}%`
            }
          }
        }
      },
      cutout: '60%'
    }

    // Material Chart
    const materialCtx = document.getElementById('materialChart')
    if (materialCtx) {
      this.materialChart = new Chart(materialCtx, {
        type: 'doughnut',
        data: {
          labels: methods,
          datasets: [{
            data: materialData,
            backgroundColor: this.chartColors.slice(0, methods.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || ''
                  const value = context.parsed
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                  return `${label}: ${value.toLocaleString('sv-SE')} kr (${percentage}%)`
                }
              }
            }
          }
        }
      })
    }

    // Work Chart
    const workCtx = document.getElementById('workChart')
    if (workCtx) {
      this.workChart = new Chart(workCtx, {
        type: 'doughnut',
        data: {
          labels: methods,
          datasets: [{
            data: workData,
            backgroundColor: this.chartColors.slice(0, methods.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || ''
                  const value = context.parsed
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                  return `${label}: ${value.toLocaleString('sv-SE', {minimumFractionDigits: 1, maximumFractionDigits: 1})} h (${percentage}%)`
                }
              }
            }
          }
        }
      })
    }
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
    // Förstör charts
    if (this.materialChart) {
      this.materialChart.destroy()
      this.materialChart = null
    }
    if (this.workChart) {
      this.workChart.destroy()
      this.workChart = null
    }
    
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

// Gör klassen tillgänglig globalt (för JSFiddle)
window.ConstructionMethodFooter = ConstructionMethodFooter
