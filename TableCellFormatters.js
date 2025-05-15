// TableCellFormatters.js
// Collection of Tabulator formatters optimized for Swedish standards
// All Swedish formatters are prefixed with SV_ to allow for future language additions

/**
 * Basic price formatter with two decimals (default)
 * Example: 100 -> "100.00 kr"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted price
 */
export function priceFormatter(cell) {
  // Get the value from the cell
  const value = cell.getValue();
  
  // Format as currency (two decimal places) and add " kr"
  return value !== null && value !== undefined ? value.toFixed(2) + " kr" : "-";
}

/**
 * Swedish price formatter with two decimals, uses space as thousands separator
 * Example: 1000 -> "1 000,00 kr"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted price
 */
export function SV_priceFormatter(cell) {
  const value = cell.getValue();
  
  if (value === null || value === undefined) return "-";
  
  // Format with Swedish standards (comma as decimal separator, space as thousands separator)
  return value.toLocaleString('sv-SE', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }) + " kr";
}

/**
 * Swedish price formatter without decimals
 * Example: 1000 -> "1 000 kr"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted price
 */
export function SV_priceWholeFormatter(cell) {
  const value = cell.getValue();
  
  if (value === null || value === undefined) return "-";
  
  // Format with Swedish standards (no decimals, space as thousands separator)
  return value.toLocaleString('sv-SE', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }) + " kr";
}

/**
 * Swedish time formatter for hours and minutes
 * Example: 1.5 -> "1 h 30 min"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted time
 */
export function SV_timeHoursMinFormatter(cell) {
  const value = cell.getValue();
  
  if (value === null || value === undefined) return "-";
  
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  
  if (hours === 0) {
    return minutes + " min";
  } else if (minutes === 0) {
    return hours + " h";
  } else {
    return hours + " h " + minutes + " min";
  }
}

/**
 * Swedish time formatter for decimal hours
 * Example: 1.5 -> "1,5 h"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted time
 */
export function SV_timeDecimalFormatter(cell) {
  const value = cell.getValue();
  
  if (value === null || value === undefined) return "-";
  
  // Format with Swedish standards (comma as decimal separator)
  return value.toLocaleString('sv-SE', { 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }) + " h";
}

/**
 * Swedish percentage formatter with one decimal
 * Example: 0.156 -> "15,6 %"
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted percentage
 */
export function SV_percentFormatter(cell) {
  const value = cell.getValue();
  
  if (value === null || value === undefined) return "-";
  
  // Convert to percentage and format with Swedish standards
  const percentage = value * 100;
  return percentage.toLocaleString('sv-SE', { 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }) + " %";
}

/**
 * Swedish date formatter (YYYY-MM-DD)
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted date
 */
export function SV_dateFormatter(cell) {
  const value = cell.getValue();
  
  if (!value) return "-";
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) return "-";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Swedish comment formatter that displays the most recent comment
 * Expects comment array with {text, timestamp} objects
 * @param {Object} cell - Tabulator cell object
 * @returns {string} Formatted comment
 */
export function SV_commentFormatter(cell) {
  const comments = cell.getValue();
  
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return "-";
  }
  
  // Sort comments by timestamp (most recent first)
  const sortedComments = [...comments].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Return the most recent comment text
  return sortedComments[0].text;
}
