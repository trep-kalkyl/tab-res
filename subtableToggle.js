// subtableToggle.js

// Exportera ett Set för att hålla state
export const openItemRows = new Set();

// Funktion för att toggla subtable och ikon
export function toggleSubtable(row, cell) {
  const itm_id = row.getData().itm_id;
  const holderEl = row.getElement().querySelector(".subtable-holder");
  const icon = cell.getElement().querySelector(".subtable-toggle");
  if (!holderEl) return;
  if (holderEl.style.display === "none" || holderEl.style.display === "") {
    holderEl.style.display = "block";
    openItemRows.add(itm_id);
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
    icon.title = "Dölj tasks";
  } else {
    holderEl.style.display = "none";
    openItemRows.delete(itm_id);
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
    icon.title = "Visa tasks";
  }
}

// Funktion som återställer state vid redraw/rowFormatter
export function restoreToggleState(row) {
  const itm_id = row.getData().itm_id;
  const holderEl = row.getElement().querySelector(".subtable-holder");
  if (holderEl) {
    holderEl.style.display = openItemRows.has(itm_id) ? "block" : "none";
  }
  const cell = row.getCell("toggleSubtable");
  if (cell) {
    const icon = cell.getElement().querySelector(".subtable-toggle");
    if (icon) {
      if (openItemRows.has(itm_id)) {
        icon.classList.remove("fa-chevron-down");
        icon.classList.add("fa-chevron-up");
        icon.title = "Dölj tasks";
      } else {
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
        icon.title = "Visa tasks";
      }
    }
  }
}
