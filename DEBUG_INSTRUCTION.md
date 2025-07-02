# Instruction for DEBUG Functionality for Tabulator Project.

## Purpose
The purpose of debug functionality is to provide a consistent and controlled way to log input, output, and key intermediate results from functions. This makes troubleshooting and verifying logic in code split into external files much easier.

## Scope
- Debug functionality should exist in all external helper/utils files where logic may need to be inspected during development or debugging.
- Debugging must be turned off in production/public environments and must be easy to toggle on/off at the top of each file.

## Implementation

### 1. Central DEBUG Flag
Declare a constant at the very top of each file:
```js
const DEBUG = false; // Set to true while debugging
```

### 2. Output Structure
- Always use clear labels for logs: `[FUNCTION][IN]`, `[FUNCTION][OUT]`, `[FUNCTION][ERROR]`, etc.
- Output must always be in English.
- Only log relevant and readable key values (e.g. ids, counts, summaries, and errors).
- Avoid logging entire large objects – prefer selected fields or summaries.

**Example:**
```js
if (DEBUG) console.log("[updateItemTotals][IN]", { itm_id: item?.itm_id });
...
if (DEBUG) console.log("[updateItemTotals][OUT]", { itm_id: item?.itm_id, mat_total: item.itm_material_user_price_total });
```

### 3. When to Log
- At the start of a function (`[IN]`) and at the end (`[OUT]`).
- On errors or special events (`[ERROR]`, `[WARN]`, `[INFO]`).
- At significant internal steps if relevant for troubleshooting.

### 4. Selective Logging (optional)
If you have many helpers in one file, you can use additional flags, e.g. `const DEBUG_MOVE = true;`.
Optionally, you can build a small utility function for logging if you want more control.

### 5. Disabling Logging
All logging should be easily disabled by setting `DEBUG = false` at the top of the file. 
No logs should remain active in production.

### 6. Output Format
- Logs should be machine-readable when possible (always log as objects, not just plain text).
- Always include the function name and context as the first part of each log.
- All log output must be in English.

**Example:**
```js
console.log("[moveItemToPart][IN]", { itemId, newPartId });
console.log("[moveItemToPart][OUT]", { movedItem: item.itm_id, from: oldPart?.prt_id, to: newPart.prt_id });
console.log("[moveItemToPart][ERROR]", { reason: "item not found", itemId });
```

## Summary
- DEBUG flag at the top
- Clear, structured output with function name and IN/OUT tags
- All log messages and output in English
- Log only relevant key values
- Easy on/off toggle
- No logs in production

---
**Tip:** Copy this instruction to every new utils/helper file or link to it!
