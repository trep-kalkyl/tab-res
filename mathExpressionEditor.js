/**
 * mathExpressionEditor.js
 * 
 * Generic math expression editor for Tabulator.js
 * 
 * Usage:
 *   import { mathExpressionEditor } from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@main/mathExpressionEditor.js"
 *   ...
 *   { editor: mathExpressionEditor }
 */

/**
 * Secure Math Parser (supports both , and . as decimal separator)
 * - Only allows numbers and basic math operators (+, -, *, /, .)
 * - Returns NaN for invalid input
 */
function safeCalculate(expression) {
    // Replace commas with dots for decimal support
    expression = expression.replace(/,/g, ".");

    // Allow only numbers and basic math operations
    if (!/^[0-9+\-*/().\s.]+$/.test(expression)) {
        return NaN; // Invalid input
    }

    try {
        // Use Function constructor to evaluate safely
        let result = new Function("return " + expression)();
        return isFinite(result) ? result : NaN;
    } catch (e) {
        return NaN;
    }
}

/**
 * mathExpressionEditor
 * Tabulator editor that allows math expressions (e.g. "10+5", "50*2", "100/4")
 * - Supports both comma and dot as decimal separator
 * - Only allows numbers and basic operators (+, -, *, /, .)
 * - The result is always saved with a dot (e.g. "15.5")
 * - Invalid expressions are not saved
 * 
 * Usage:
 *   { editor: mathExpressionEditor }
 */
export function mathExpressionEditor(cell, onRendered, success, cancel) {
    var input = document.createElement("input");

    input.setAttribute("type", "text");
    input.style.width = "100%";
    input.value = cell.getValue() || "";

    onRendered(() => {
        input.focus();
        input.select();
    });

    function processValue() {
        var newValue = input.value.trim();
        var result = safeCalculate(newValue);

        if (!isNaN(result)) {
            success(result); // Save computed value
        } else {
            cancel(); // Cancel on invalid input
        }
    }

    input.addEventListener("blur", processValue);
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            processValue();
        } else if (e.key === "Escape") {
            cancel();
        }
    });

    return input;
}
