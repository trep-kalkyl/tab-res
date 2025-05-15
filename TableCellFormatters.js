/**
 * Swedish Tabulator Formatters
 * Usage:
 *   import * as svSE_Formatters from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@main/TableCellFormatters.js"
 *   ...
 *   { formatter: svSE_Formatters.svSE_currency2Formatter }
 */

/**
 * svSE_currency2Formatter
 * Formats a number as Swedish currency (SEK) with 2 decimals and "kr" suffix.
 * Example: 1234.5 -> "1 234,50 kr"
 * Usage: formatter: svSE_Formatters.svSE_currency2Formatter
 */
export function svSE_currency2Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2 }).replace("SEK", "kr")
        : "-";
}

/**
 * svSE_currency1Formatter
 * Formats a number as Swedish currency (SEK) with 1 decimal and "kr" suffix.
 * Example: 1234.5 -> "1 234,5 kr"
 * Usage: formatter: svSE_Formatters.svSE_currency1Formatter
 */
export function svSE_currency1Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace("SEK", "kr")
        : "-";
}

/**
 * svSE_currency0Formatter
 * Formats a number as Swedish currency (SEK) with no decimals and "kr" suffix.
 * Example: 1234.5 -> "1 235 kr"
 * Usage: formatter: svSE_Formatters.svSE_currency0Formatter
 */
export function svSE_currency0Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace("SEK", "kr")
        : "-";
}

/**
 * svSE_number2Formatter
 * Formats a number with 2 decimals, Swedish style (no currency).
 * Example: 1234.5 -> "1 234,50"
 * Usage: formatter: svSE_Formatters.svSE_number2Formatter
 */
export function svSE_number2Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "-";
}

/**
 * svSE_number1Formatter
 * Formats a number with 1 decimal, Swedish style (no currency).
 * Example: 1234.5 -> "1 234,5"
 * Usage: formatter: svSE_Formatters.svSE_number1Formatter
 */
export function svSE_number1Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "-";
}

/**
 * svSE_number0Formatter
 * Formats a number with no decimals, Swedish style (no currency).
 * Example: 1234.5 -> "1 235"
 * Usage: formatter: svSE_Formatters.svSE_number0Formatter
 */
export function svSE_number0Formatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { maximumFractionDigits: 0 })
        : "-";
}

/**
 * svSE_percent1Formatter
 * Formats a decimal as percentage with 1 decimal, Swedish style.
 * Example: 0.253 -> "25,3 %"
 * Usage: formatter: svSE_Formatters.svSE_percent1Formatter
 */
export function svSE_percent1Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    return (value * 100).toFixed(1).replace(".", ",") + " %";
}

/**
 * svSE_percent0Formatter
 * Formats a decimal as percentage with no decimals, Swedish style.
 * Example: 0.25 -> "25 %"
 * Usage: formatter: svSE_Formatters.svSE_percent0Formatter
 */
export function svSE_percent0Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    return Math.round(value * 100) + " %";
}

/**
 * svSE_timeHMSFormatter
 * Formats a duration in seconds as HH:mm:ss.
 * Example: 3661 -> "01:01:01"
 * Usage: formatter: svSE_Formatters.svSE_timeHMSFormatter
 */
export function svSE_timeHMSFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    const totalSeconds = Math.floor(value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0")
    ].join(":");
}

/**
 * svSE_timeHMFormatter
 * Formats a duration in seconds as H:mm.
 * Example: 3900 -> "1:05"
 * Usage: formatter: svSE_Formatters.svSE_timeHMFormatter
 */
export function svSE_timeHMFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    const totalSeconds = Math.floor(value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours + ":" + minutes.toString().padStart(2, "0");
}

/**
 * svSE_decimalHour2Formatter
 * Formats a decimal hour with 2 decimals and " tim" suffix, Swedish style.
 * Example: 0.15 -> "0,15 tim"
 * Usage: formatter: svSE_Formatters.svSE_decimalHour2Formatter
 */
export function svSE_decimalHour2Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    return value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " tim";
}

/**
 * svSE_dateFormatter
 * Formats a date string or Date object as Swedish date (YYYY-MM-DD).
 * Usage: formatter: svSE_Formatters.svSE_dateFormatter
 */
export function svSE_dateFormatter(cell) {
    const value = cell.getValue();
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleDateString("sv-SE");
}

/**
 * svSE_thousandSeparatorFormatter
 * Formats a number with Swedish thousand separators (no decimals).
 * Example: 10000 -> "10 000"
 * Usage: formatter: svSE_Formatters.svSE_thousandSeparatorFormatter
 */
export function svSE_thousandSeparatorFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

/**
 * svSE_phoneFormatter
 * Formats a Swedish phone number (10 digits) as "070-123 45 67".
 * Usage: formatter: svSE_Formatters.svSE_phoneFormatter
 */
export function svSE_phoneFormatter(cell) {
    const value = cell.getValue();
    if (!value) return "-";
    return value.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1-$2 $3 $4");
}
