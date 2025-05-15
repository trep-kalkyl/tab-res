/**
 * mathExpressionEditor.js
 *
 * Generic math expression editor for Tabulator.js
 * - Users can enter math expressions (e.g. "10+5", "50*2", "100/4")
 * - Supports both comma (,) and dot (.) as decimal separator
 * - Only allows numbers and basic math operators (+, -, *, /, .)
 * - The computed result is always saved with a dot (e.g., "15.5")
 * - Invalid expressions will not be saved
 * - Includes up/down buttons (spinners) for increment/decrement, similar to native number editor
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
    expression = expression.replace(/,/g, ".");
    if (!/^[0-9+\-*/().\s.]+$/.test(expression)) return NaN;
    try {
        let result = new Function("return " + expression)();
        return isFinite(result) ? result : NaN;
    } catch (e) {
        return NaN;
    }
}

/**
 * mathExpressionEditor
 * Tabulator editor that allows math expressions with custom up/down buttons.
 * - Supports both comma and dot as decimal separator
 * - Only allows numbers and basic operators (+, -, *, /, .)
 * - The result is always saved with a dot (e.g., "15.5")
 * - Invalid expressions are not saved
 * - Includes up/down buttons (spinners)
 *
 * Usage:
 *   { editor: mathExpressionEditor }
 */
export function mathExpressionEditor(cell, onRendered, success, cancel) {
    // Container for input and buttons
    var container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.width = "100%";

    // Input field
    var input = document.createElement("input");
    input.setAttribute("type", "text");
    input.style.flex = "1";
    input.style.minWidth = "0"; // Prevent overflow
    input.value = cell.getValue() || "";

    // Up button
    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.innerHTML = "▲";
    upBtn.style.width = "2em";
    upBtn.style.padding = "0";
    upBtn.style.marginLeft = "2px";
    upBtn.title = "Increase value";

    // Down button
    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.innerHTML = "▼";
    downBtn.style.width = "2em";
    downBtn.style.padding = "0";
    downBtn.style.marginLeft = "2px";
    downBtn.title = "Decrease value";

    // Math calculation (see above)
    function processValue() {
        var newValue = input.value.trim();
        var result = safeCalculate(newValue);
        if (!isNaN(result)) {
            success(result);
        } else {
            cancel();
        }
    }

    // Up/Down button logic
    upBtn.addEventListener("click", function() {
        let current = safeCalculate(input.value.trim());
        if (isNaN(current)) current = 0;
        input.value = (current + 1).toString().replace(".", ",");
        input.focus();
        input.select();
    });

    downBtn.addEventListener("click", function() {
        let current = safeCalculate(input.value.trim());
        if (isNaN(current)) current = 0;
        input.value = (current - 1).toString().replace(".", ",");
        input.focus();
        input.select();
    });

    input.addEventListener("blur", processValue);
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") processValue();
        else if (e.key === "Escape") cancel();
    });

    // Layout
    container.appendChild(input);
    container.appendChild(upBtn);
    container.appendChild(downBtn);

    onRendered(() => {
        input.focus();
        input.select();
    });

    return container;
}
