// uiHelpers.js

/**
 * Skapar en footer med en knapp för Tabulator-tabeller.
 * @param {string} text - Knappens text
 * @param {function} onClick - Callback när knappen klickas
 * @returns {HTMLDivElement}
 */
export const createFooterButton = (text, onClick) => {
  const footer = document.createElement("div");
  footer.style.textAlign = "right";
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.onclick = onClick;
  footer.appendChild(btn);
  return footer;
};

/**
 * Renderar en item-rad med sub-tabell för tasks.
 * @param {Object} itemRow - Tabulator row object
 * @param {Object} dependencies - Objekt med beroenden: getTaskTableColumns, addTaskRow, createFooterButton
 */
export const renderItemRow = (itemRow, { getTaskTableColumns, addTaskRow, createFooterButton }) => {
  const itemData = itemRow.getData();
  if (!itemData.itm_tasks?.length) {
    renderEmptyTaskFooter(itemRow, addTaskRow);
    return;
  }

  let holderEl = itemRow.getElement().querySelector(".subtable-holder");
  if (!holderEl) {
    holderEl = document.createElement("div");
    holderEl.className = "subtable-holder";
    itemRow.getElement().appendChild(holderEl);

    const taskTableDiv = document.createElement("div");
    holderEl.appendChild(taskTableDiv);

    // Skapa sub-tabell för tasks
    const taskTable = new Tabulator(taskTableDiv, {
      index: "tsk_id",
      data: itemData.itm_tasks,
      layout: "fitDataFill",
      columns: getTaskTableColumns(),
      footerElement: createFooterButton("Lägg till Task", () => addTaskRow(itemData)),
    });

    itemRow._subTaskTable = taskTable;
  }
};

/**
 * Renderar en footer för items utan tasks.
 * @param {Object} itemRow - Tabulator row object
 * @param {function} addTaskRowCallback - Callback för att lägga till ny task
 */
export const renderEmptyTaskFooter = (itemRow, addTaskRowCallback) => {
  let holderEl = itemRow.getElement().querySelector(".subtable-holder");
  if (!holderEl) {
    holderEl = document.createElement("div");
    holderEl.className = "subtable-holder";
    itemRow.getElement().appendChild(holderEl);
    holderEl.appendChild(createFooterButton("Lägg till Task", () => addTaskRowCallback(itemRow.getData())));
  }
};
