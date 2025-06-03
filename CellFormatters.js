/**
 * Swedish Tabulator Formatters
 * Usage:
 *   import * as svSE_Formatters from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@main/CellFormatters.js"
 *   ...
 *   { formatter: svSE_Formatters.svSE_currency2Formatter }
 */

/**
 * Helper: Wrap value in red span if negative
 */
function svSE_redIfNegative(value, isNegative) {
    return isNegative
        ? `<span style="color: red;">${value}</span>`
        : value;
}

/**
 * svSE_currency2Formatter
 * Formats a number as Swedish currency (SEK) with 2 decimals and "kr" suffix.
 * Negative numbers are displayed in red.
 */
export function svSE_currency2Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2 }).replace("SEK", "kr");
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_currency1Formatter
 * Formats a number as Swedish currency (SEK) with 1 decimal and "kr" suffix.
 * Negative numbers are displayed in red.
 */
export function svSE_currency1Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace("SEK", "kr");
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_currency0Formatter
 * Formats a number as Swedish currency (SEK) with no decimals and "kr" suffix.
 * Negative numbers are displayed in red.
 */
export function svSE_currency0Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace("SEK", "kr");
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_number2Formatter
 * Formats a number with 2 decimals, Swedish style (no currency).
 * Negative numbers are displayed in red.
 */
export function svSE_number2Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_number1Formatter
 * Formats a number with 1 decimal, Swedish style (no currency).
 * Negative numbers are displayed in red.
 */
export function svSE_number1Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_number0Formatter
 * Formats a number with no decimals, Swedish style (no currency).
 * Negative numbers are displayed in red.
 */
export function svSE_number0Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_percent1Formatter
 * Formats a decimal as percentage with 1 decimal, Swedish style.
 * Negative numbers are displayed in red.
 */
export function svSE_percent1Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const num = value * 100;
    const formatted = num.toFixed(1).replace(".", ",") + " %";
    return svSE_redIfNegative(formatted, num < 0);
}

/**
 * svSE_percent0Formatter
 * Formats a decimal as percentage with no decimals, Swedish style.
 * Negative numbers are displayed in red.
 */
export function svSE_percent0Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const num = Math.round(value * 100);
    const formatted = num + " %";
    return svSE_redIfNegative(formatted, num < 0);
}

/**
 * svSE_timeHMSFormatter
 * Formats a duration in seconds as HH:mm:ss.
 * Negative times are displayed in red.
 */
export function svSE_timeHMSFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    const isNegative = value < 0;
    const totalSeconds = Math.abs(Math.floor(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formatted = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0")
    ].join(":");
    return svSE_redIfNegative((isNegative ? "-" : "") + formatted, isNegative);
}

/**
 * svSE_timeHMFormatter
 * Formats a duration in seconds as H:mm.
 * Negative times are displayed in red.
 */
export function svSE_timeHMFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    const isNegative = value < 0;
    const totalSeconds = Math.abs(Math.floor(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formatted = hours + ":" + minutes.toString().padStart(2, "0");
    return svSE_redIfNegative((isNegative ? "-" : "") + formatted, isNegative);
}

/**
 * svSE_decimalHour2Formatter
 * Formats a decimal hour with 2 decimals and " tim" suffix, Swedish style.
 * Negative hours are displayed in red.
 */
export function svSE_decimalHour2Formatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || isNaN(value)) return "-";
    const isNegative = value < 0;
    const formatted = Math.abs(value).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " tim";
    return svSE_redIfNegative((isNegative ? "-" : "") + formatted, isNegative);
}

/**
 * svSE_dateFormatter
 * Formats a date string or Date object as Swedish date (YYYY-MM-DD).
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
 * Negative numbers are displayed in red.
 */
export function svSE_thousandSeparatorFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    const formatted = value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    return svSE_redIfNegative(formatted, value < 0);
}

/**
 * svSE_phoneFormatter
 * Formats a Swedish phone number (10 digits) as "070-123 45 67".
 */
export function svSE_phoneFormatter(cell) {
    const value = cell.getValue();
    if (!value) return "-";
    return value.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1-$2 $3 $4");
}

/**
 * svSE_preserveRawNumberFormatter
 * Displays the cell value as entered, but always uses comma as decimal separator and Swedish thousand separators.
 * Negative numbers are displayed in red.
 */
export function svSE_preserveRawNumberFormatter(cell) {
    let value = cell.getValue();

    if (value === null || value === undefined || value === "") return "-";

    // Determine if value is negative
    let isNegative = false;

    // If value is a number
    if (typeof value === "number") {
        isNegative = value < 0;
        // Format with Swedish locale (all decimals)
        value = Math.abs(value).toLocaleString("sv-SE", { useGrouping: true, maximumFractionDigits: 20 });
    } else {
        // If value is a string, check if it starts with minus
        isNegative = /^-/.test(value.trim());
        // Remove spaces and commas (thousand separators)
        let raw = value.replace(/[\s,]/g, '');
        // Split on dot or comma
        let [intPart, decPart] = raw.split(/[.,]/);
        // Add thousand separator
        intPart = intPart.replace(/^-/,'').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        value = (decPart !== undefined ? intPart + "," + decPart : intPart);
    }

    // Wrap negative numbers in a span with red color
    return svSE_redIfNegative((isNegative ? "-" : "") + value, isNegative);
}

/**
 * Swedish Tabulator Symbol Formatters
 * Utökning till CellFormatters.js med symboler och indikatorer
 */

/**
 * svSE_checkMarkFormatter
 * Visar ✓ för true/truthy värden, annars tom cell
 */
export function svSE_checkMarkFormatter(cell) {
    const value = cell.getValue();
    return value ? "✓" : "";
}

/**
 * svSE_crossMarkFormatter
 * Visar ✗ för true/truthy värden, annars tom cell
 */
export function svSE_crossMarkFormatter(cell) {
    const value = cell.getValue();
    return value ? "✗" : "";
}

/**
 * svSE_plusMinusFormatter
 * Visar + för positiva värden, - för negativa, 0 för noll
 */
export function svSE_plusMinusFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num > 0) return "+";
    if (num < 0) return "-";
    return "0";
}

/**
 * svSE_thumbsFormatter
 * Visar 👍 för true/positiva värden, 👎 för false/negativa
 */
export function svSE_thumbsFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";
    
    // Boolean check
    if (typeof value === "boolean") {
        return value ? "👍" : "👎";
    }
    
    // Number check
    const num = parseFloat(value);
    if (!isNaN(num)) {
        return num >= 0 ? "👍" : "👎";
    }
    
    // String check for ja/nej, yes/no, sant/falskt
    const str = value.toString().toLowerCase();
    if (["ja", "yes", "sant", "true", "1"].includes(str)) return "👍";
    if (["nej", "no", "falskt", "false", "0"].includes(str)) return "👎";
    
    return value;
}

/**
 * svSE_statusDotFormatter
 * Visar färgade prickar baserat på status
 * Grön för positiv/aktiv, röd för negativ/inaktiv, gul för neutral/väntande
 */
export function svSE_statusDotFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";
    
    const str = value.toString().toLowerCase();
    
    // Svenska statusord
    if (["aktiv", "godkänd", "klar", "ja", "sant", "ok"].includes(str)) {
        return '<span style="color: #22c55e; font-size: 20px;">●</span>';
    }
    if (["inaktiv", "avvisad", "fel", "nej", "falskt", "error"].includes(str)) {
        return '<span style="color: #ef4444; font-size: 20px;">●</span>';
    }
    if (["väntande", "pågående", "under granskning", "pending"].includes(str)) {
        return '<span style="color: #f59e0b; font-size: 20px;">●</span>';
    }
    
    // Numeriska värden
    const num = parseFloat(value);
    if (!isNaN(num)) {
        if (num > 0) return '<span style="color: #22c55e; font-size: 20px;">●</span>';
        if (num < 0) return '<span style="color: #ef4444; font-size: 20px;">●</span>';
        return '<span style="color: #6b7280; font-size: 20px;">●</span>';
    }
    
    return value;
}

/**
 * svSE_priorityFormatter
 * Visar prioritet med pilar: ↑↑↑ (hög), ↑↑ (medium-hög), ↑ (medium), ↓ (låg)
 */
export function svSE_priorityFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";
    
    const str = value.toString().toLowerCase();
    
    if (["kritisk", "mycket hög", "5"].includes(str)) {
        return '<span style="color: #dc2626;">↑↑↑</span>';
    }
    if (["hög", "4"].includes(str)) {
        return '<span style="color: #ea580c;">↑↑</span>';
    }
    if (["medium", "normal", "3"].includes(str)) {
        return '<span style="color: #ca8a04;">↑</span>';
    }
    if (["låg", "2"].includes(str)) {
        return '<span style="color: #16a34a;">↓</span>';
    }
    if (["mycket låg", "1"].includes(str)) {
        return '<span style="color: #059669;">↓↓</span>';
    }
    
    return value;
}

/**
 * svSE_yesNoFormatter
 * Konverterar boolean/string till svenska Ja/Nej
 */
export function svSE_yesNoFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "-";
    
    if (typeof value === "boolean") {
        return value ? "Ja" : "Nej";
    }
    
    const str = value.toString().toLowerCase();
    if (["true", "1", "ja", "yes", "sant"].includes(str)) return "Ja";
    if (["false", "0", "nej", "no", "falskt"].includes(str)) return "Nej";
    
    return value;
}

/**
 * svSE_trafficLightFormatter
 * Trafikljus-formatter: 🔴 🟡 🟢
 */
export function svSE_trafficLightFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";
    
    const str = value.toString().toLowerCase();
    
    if (["röd", "stopp", "fel", "dåligt", "red", "stop", "bad"].includes(str)) return "🔴";
    if (["gul", "gult", "varning", "väntande", "yellow", "warning", "pending"].includes(str)) return "🟡";
    if (["grön", "grönt", "ok", "bra", "klar", "green", "good", "ready"].includes(str)) return "🟢";
    
    // Numeriska värden (0-2 skala)
    const num = parseFloat(value);
    if (!isNaN(num)) {
        if (num <= 0.33) return "🔴";
        if (num <= 0.66) return "🟡";
        if (num <= 1) return "🟢";
    }
    
    return value;
}

/**
 * svSE_starRatingFormatter
 * Visar stjärnbetyg baserat på numeriskt värde (1-5)
 */
export function svSE_starRatingFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    const rating = Math.max(0, Math.min(5, Math.round(num)));
    const fullStars = "★".repeat(rating);
    const emptyStars = "☆".repeat(5 - rating);
    
    return `<span style="color: #fbbf24;">${fullStars}</span><span style="color: #d1d5db;">${emptyStars}</span>`;
}
/**
 * Enkla FontAwesome Ikon Formatters för Tabulator
 * Kräver FontAwesome 4.7.0+ 
 * <link rel="stylesheet" type="text/css" href="https://unpkg.com/font-awesome@4.7.0/css/font-awesome.min.css">
 * 
 * Användning: Sätt bara formatter på kolumnen, ingen logik - bara ikonen
 */

/**
 * Visar grön plus-ikon
 */
export function svSE_faPlusFormatter(cell) {
    return '<i class="fa fa-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd minus-ikon
 */
export function svSE_faMinusFormatter(cell) {
    return '<i class="fa fa-minus" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön plus-circle ikon
 */
export function svSE_faPlusCircleFormatter(cell) {
    return '<i class="fa fa-plus-circle" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar röd minus-circle ikon
 */
export function svSE_faMinusCircleFormatter(cell) {
    return '<i class="fa fa-minus-circle" style="color: #dc2626; font-size: 18px;"></i>';
}

/**
 * Visar grön plus-square ikon
 */
export function svSE_faPlusSquareFormatter(cell) {
    return '<i class="fa fa-plus-square" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar röd minus-square ikon
 */
export function svSE_faMinusSquareFormatter(cell) {
    return '<i class="fa fa-minus-square" style="color: #dc2626; font-size: 18px;"></i>';
}

/**
 * Visar grön cart-plus ikon
 */
export function svSE_faCartPlusFormatter(cell) {
    return '<i class="fa fa-cart-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd cart-arrow-down ikon
 */
export function svSE_faCartMinusFormatter(cell) {
    return '<i class="fa fa-cart-arrow-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön user-plus ikon
 */
export function svSE_faUserPlusFormatter(cell) {
    return '<i class="fa fa-user-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd user-minus ikon (user-times i FA4)
 */
export function svSE_faUserMinusFormatter(cell) {
    return '<i class="fa fa-user-times" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön arrow-up ikon
 */
export function svSE_faArrowUpFormatter(cell) {
    return '<i class="fa fa-arrow-up" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd arrow-down ikon
 */
export function svSE_faArrowDownFormatter(cell) {
    return '<i class="fa fa-arrow-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön thumbs-up ikon
 */
export function svSE_faThumbsUpFormatter(cell) {
    return '<i class="fa fa-thumbs-up" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd thumbs-down ikon
 */
export function svSE_faThumbsDownFormatter(cell) {
    return '<i class="fa fa-thumbs-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön check ikon
 */
export function svSE_faCheckFormatter(cell) {
    return '<i class="fa fa-check" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd times ikon
 */
export function svSE_faTimesFormatter(cell) {
    return '<i class="fa fa-times" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön toggle-on ikon
 */
export function svSE_faToggleOnFormatter(cell) {
    return '<i class="fa fa-toggle-on" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar grå toggle-off ikon
 */
export function svSE_faToggleOffFormatter(cell) {
    return '<i class="fa fa-toggle-off" style="color: #6b7280; font-size: 18px;"></i>';
}

/**
 * Visar neutral edit ikon
 */
export function svSE_faEditFormatter(cell) {
    return '<i class="fa fa-edit" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar neutral trash ikon
 */
export function svSE_faTrashFormatter(cell) {
    return '<i class="fa fa-trash" style="color: #dc2626; font-size: 16px;"></i>';
}
/**
 * Enkla FontAwesome Ikon Formatters för Tabulator
 * Kräver FontAwesome 4.7.0+ 
 * <link rel="stylesheet" type="text/css" href="https://unpkg.com/font-awesome@4.7.0/css/font-awesome.min.css">
 * 
 * Användning: Sätt bara formatter på kolumnen, ingen logik - bara ikonen
 */

/**
 * Visar grön plus-ikon
 */
export function svSE_faPlusFormatter(cell) {
    return '<i class="fa fa-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd minus-ikon
 */
export function svSE_faMinusFormatter(cell) {
    return '<i class="fa fa-minus" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön plus-circle ikon
 */
export function svSE_faPlusCircleFormatter(cell) {
    return '<i class="fa fa-plus-circle" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar röd minus-circle ikon
 */
export function svSE_faMinusCircleFormatter(cell) {
    return '<i class="fa fa-minus-circle" style="color: #dc2626; font-size: 18px;"></i>';
}

/**
 * Visar grön plus-square ikon
 */
export function svSE_faPlusSquareFormatter(cell) {
    return '<i class="fa fa-plus-square" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar röd minus-square ikon
 */
export function svSE_faMinusSquareFormatter(cell) {
    return '<i class="fa fa-minus-square" style="color: #dc2626; font-size: 18px;"></i>';
}

/**
 * Visar grön cart-plus ikon
 */
export function svSE_faCartPlusFormatter(cell) {
    return '<i class="fa fa-cart-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd cart-arrow-down ikon
 */
export function svSE_faCartMinusFormatter(cell) {
    return '<i class="fa fa-cart-arrow-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön user-plus ikon
 */
export function svSE_faUserPlusFormatter(cell) {
    return '<i class="fa fa-user-plus" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd user-minus ikon (user-times i FA4)
 */
export function svSE_faUserMinusFormatter(cell) {
    return '<i class="fa fa-user-times" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön arrow-up ikon
 */
export function svSE_faArrowUpFormatter(cell) {
    return '<i class="fa fa-arrow-up" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd arrow-down ikon
 */
export function svSE_faArrowDownFormatter(cell) {
    return '<i class="fa fa-arrow-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön thumbs-up ikon
 */
export function svSE_faThumbsUpFormatter(cell) {
    return '<i class="fa fa-thumbs-up" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd thumbs-down ikon
 */
export function svSE_faThumbsDownFormatter(cell) {
    return '<i class="fa fa-thumbs-down" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön check ikon
 */
export function svSE_faCheckFormatter(cell) {
    return '<i class="fa fa-check" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd times ikon
 */
export function svSE_faTimesFormatter(cell) {
    return '<i class="fa fa-times" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grön toggle-on ikon
 */
export function svSE_faToggleOnFormatter(cell) {
    return '<i class="fa fa-toggle-on" style="color: #16a34a; font-size: 18px;"></i>';
}

/**
 * Visar grå toggle-off ikon
 */
export function svSE_faToggleOffFormatter(cell) {
    return '<i class="fa fa-toggle-off" style="color: #6b7280; font-size: 18px;"></i>';
}

/**
 * Visar neutral edit ikon
 */
export function svSE_faEditFormatter(cell) {
    return '<i class="fa fa-edit" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar röd papperkorg ikon
 */
export function svSE_faTrashFormatter(cell) {
    return '<i class="fa fa-trash" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar röd papperkorg-o ikon (outline)
 */
export function svSE_faTrashOFormatter(cell) {
    return '<i class="fa fa-trash-o" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar blå info-circle ikon
 */
export function svSE_faInfoFormatter(cell) {
    return '<i class="fa fa-info-circle" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar grön download ikon
 */
export function svSE_faDownloadFormatter(cell) {
    return '<i class="fa fa-download" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar blå upload ikon
 */
export function svSE_faUploadFormatter(cell) {
    return '<i class="fa fa-upload" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar grå copy ikon
 */
export function svSE_faCopyFormatter(cell) {
    return '<i class="fa fa-copy" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar orange warning ikon
 */
export function svSE_faWarningFormatter(cell) {
    return '<i class="fa fa-warning" style="color: #f59e0b; font-size: 16px;"></i>';
}

/**
 * Visar röd ban ikon (förbjuden)
 */
export function svSE_faBanFormatter(cell) {
    return '<i class="fa fa-ban" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar blå external-link ikon
 */
export function svSE_faLinkFormatter(cell) {
    return '<i class="fa fa-external-link" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar grön save ikon
 */
export function svSE_faSaveFormatter(cell) {
    return '<i class="fa fa-save" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar grå undo ikon
 */
export function svSE_faUndoFormatter(cell) {
    return '<i class="fa fa-undo" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grå redo ikon
 */
export function svSE_faRedoFormatter(cell) {
    return '<i class="fa fa-redo" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grå refresh ikon
 */
export function svSE_faRefreshFormatter(cell) {
    return '<i class="fa fa-refresh" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar blå search ikon
 */
export function svSE_faSearchFormatter(cell) {
    return '<i class="fa fa-search" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar grå filter ikon
 */
export function svSE_faFilterFormatter(cell) {
    return '<i class="fa fa-filter" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grå sort-up ikon
 */
export function svSE_faSortUpFormatter(cell) {
    return '<i class="fa fa-sort-up" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grå sort-down ikon
 */
export function svSE_faSortDownFormatter(cell) {
    return '<i class="fa fa-sort-down" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grå cog ikon (inställningar)
 */
export function svSE_faCogFormatter(cell) {
    return '<i class="fa fa-cog" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar blå eye ikon (visa)
 */
export function svSE_faEyeFormatter(cell) {
    return '<i class="fa fa-eye" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * Visar grå eye-slash ikon (dölj)
 */
export function svSE_faEyeSlashFormatter(cell) {
    return '<i class="fa fa-eye-slash" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar gul star ikon (fylld)
 */
export function svSE_faStarFormatter(cell) {
    return '<i class="fa fa-star" style="color: #fbbf24; font-size: 16px;"></i>';
}

/**
 * Visar grå star-o ikon (tom)
 */
export function svSE_faStarOFormatter(cell) {
    return '<i class="fa fa-star-o" style="color: #d1d5db; font-size: 16px;"></i>';
}

/**
 * Visar röd heart ikon
 */
export function svSE_faHeartFormatter(cell) {
    return '<i class="fa fa-heart" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar grå heart-o ikon
 */
export function svSE_faHeartOFormatter(cell) {
    return '<i class="fa fa-heart-o" style="color: #6b7280; font-size: 16px;"></i>';
}

/**
 * Visar grön check-circle ikon
 */
export function svSE_faCheckCircleFormatter(cell) {
    return '<i class="fa fa-check-circle" style="color: #16a34a; font-size: 16px;"></i>';
}

/**
 * Visar röd times-circle ikon
 */
export function svSE_faTimesCircleFormatter(cell) {
    return '<i class="fa fa-times-circle" style="color: #dc2626; font-size: 16px;"></i>';
}

/**
 * Visar orange exclamation-triangle ikon
 */
export function svSE_faExclamationFormatter(cell) {
    return '<i class="fa fa-exclamation-triangle" style="color: #f59e0b; font-size: 16px;"></i>';
}

/**
 * Visar blå question-circle ikon
 */
export function svSE_faQuestionFormatter(cell) {
    return '<i class="fa fa-question-circle" style="color: #3b82f6; font-size: 16px;"></i>';
}

/**
 * svSE_checkCrossToggleFormatter
 * Visar klickbara ikoner som växlar mellan check/cross
 * Används tillsammans med svSE_checkCrossToggleClick för komplett funktionalitet
 */
export function svSE_checkCrossToggleFormatter(cell) {
    const value = cell.getValue();
    const isSelected = Boolean(value);
    
    return isSelected 
        ? "<i class='fa fa-check text-success'></i>" 
        : "<i class='fa fa-times text-muted'></i>";
}

/**
 * svSE_checkCrossToggleClick
 * Cellklick-hanterare för toggle-funktionalitet
 * Används tillsammans med svSE_checkCrossToggleFormatter
 * 
 * @param {Function} callback - Callback-funktion att köra efter toggle (t.ex. updateFilter)
 */
export function svSE_checkCrossToggleClick(callback = null) {
    return function(e, cell) {
        const currentValue = cell.getValue();
        cell.setValue(!Boolean(currentValue));
        
        // Kör callback om den finns
        if (callback && typeof callback === 'function') {
            callback();
        }
        
        e.stopPropagation();
    };
}

/**
 * svSE_createCheckCrossToggleColumn
 * Hjälpfunktion för att skapa en komplett toggle-kolumn
 * 
 * @param {string} title - Kolumnens titel
 * @param {string} field - Fältnamn
 * @param {Function} onToggle - Callback-funktion som körs vid toggle
 * @returns {Object} Komplett kolumn-konfiguration
 */
export function svSE_createCheckCrossToggleColumn(title, field, onToggle = null) {
    return {
        title: title,
        field: field,
        formatter: svSE_checkCrossToggleFormatter,
        headerSort: false,
        headerVertical: false,
        cellClick: svSE_checkCrossToggleClick(onToggle),
        width: 80, // Lämplig bredd för ikoner
        hozAlign: "center"
    };
}
