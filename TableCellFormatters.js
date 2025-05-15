// SV_FormatterParams.js
// ---------------------------------------------------------------
// Swedish formatterParams and custom formatters for Tabulator JS
// ---------------------------------------------------------------
// This file collects all standard formatterParams and custom formatters
// for Swedish number, currency, percent, time and date formatting.
// Import the entire file in your main Tabulator setup to always have
// access to all formatters and formatterParams.
//
// Usage Example (in your main file):
// ---------------------------------------------------------------
// import * as SVFormatters from "./SV_FormatterParams.js";
//
// const columns = [
//   // Use spread operator for formatterParams objects
//   {
//     title: "Pris",
//     field: "item_material_user_price",
//     ...SVFormatters.SV_money
//   },
//   {
//     title: "Timpris",
//     field: "item_hourly_rate",
//     ...SVFormatters.SV_hourlyRate
//   },
//   {
//     title: "Arbetstid",
//     field: "item_work_task_duration",
//     formatter: SVFormatters.SV_timeDurationFormatter,
//     formatterParams: { format: "decimal" }
//   },
//   {
//     title: "Datum",
//     field: "item_comments[0].timestamp",
//     formatter: SVFormatters.SV_dateFormatter
//   },
//   {
//     title: "Marginal",
//     field: "item_margin",
//     ...SVFormatters.SV_percent
//   }
// ];
//
// // Pass columns to your Tabulator table as usual
// new Tabulator("#your-table", {
//   data: tabledata,
//   columns: columns,
//   // ... other options ...
// });
//
// ---------------------------------------------------------------

// --- Standard formatterParams for Tabulator's built-in formatters ---

/**
 * Swedish currency formatting: "1 234,56 kr"
 */
export const SV_money = {
  formatter: "money",
  formatterParams: {
    decimal: ",",
    thousand: " ",
    symbol: "kr",
    symbolAfter: true,
    precision: 2,
  }
};

/**
 * Swedish hourly rate formatting: "1 234,50 kr/tim"
 */
export const SV_hourlyRate = {
  formatter: "money",
  formatterParams: {
    decimal: ",",
    thousand: " ",
    symbol: " kr/tim",
    symbolAfter: true,
    precision: 2,
  }
};

/**
 * Swedish hours formatting: "1 234,5 h"
 */
export const SV_hours = {
  formatter: "money",
  formatterParams: {
    decimal: ",",
    thousand: " ",
    symbol: " h",
    symbolAfter: true,
    precision: 1,
  }
};

/**
 * Swedish percent formatting: "12,3 %"
 */
export const SV_percent = {
  formatter: "money",
  formatterParams: {
    decimal: ",",
    thousand: " ",
    symbol: " %",
    symbolAfter: true,
    precision: 1,
  }
};

// --- Custom formatters for time and date (not built-in in Tabulator) ---

/**
 * SV_timeDurationFormatter
 * Formats durations as decimal hours ("1,5 h") or "h:mm h".
 * Use formatterParams: { format: "decimal" } or { format: "h:mm" }
 *
 * Example:
 * {
 *   title: "Arbetstid",
 *   field: "item_work_task_duration",
 *   formatter: SV_timeDurationFormatter,
 *   formatterParams: { format: "decimal" }
 * }
 */
export function SV_timeDurationFormatter(cell, params = {}) {
  const value = cell.getValue();
  if (value == null || isNaN(value)) return "-";
  if (params.format === "decimal" || !params.format) {
    return value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " h";
  }
  // "h:mm"-format
  const totalMinutes = Math.round(Number(value) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")} h`;
}

/**
 * SV_dateFormatter
 * Formats ISO date string to "YYYY-MM-DD HH:mm"
 *
 * Example:
 * {
 *   title: "Datum",
 *   field: "item_comments[0].timestamp",
 *   formatter: SV_dateFormatter
 * }
 */
export function SV_dateFormatter(cell) {
  const value = cell.getValue();
  if (!value) return "-";
  return value.replace("T", " ").substring(0, 16);
}
