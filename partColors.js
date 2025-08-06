// ======= PART COLOR MANAGEMENT MODULE =======

const partColors = [
  '#BBDEFB', // skarpare blå
  '#C8E6C9', // skarpare grön
  '#F8BBD9', // skarpare rosa
  '#FFF176', // skarpare gul
  '#E1BEE7', // skarpare lila
  '#FFCC80', // skarpare orange
  '#80CBC4', // skarpare cyan
  '#D7CCC8', // skarpare beige
  '#DCEDC8', // skarpare lime
  '#F48FB1'  // skarpare magenta
];

/**
 * Hämtar färg för en specifik part baserat på part-ID
 * @param {number} partId - ID för parten
 * @returns {string} - Hex-färgkod
 */
export const getPartColor = (partId) => {
  if (!partId) return 'transparent';
  return partColors[(partId - 1) % partColors.length];
};

/**
 * Justerar färgens ljushet
 * @param {string} hex - Hex-färgkod
 * @param {number} percent - Procent att justera (-100 till 100)
 * @returns {string} - Justerad hex-färgkod
 */
const adjustColorBrightness = (hex, percent) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

/**
 * Skapar CSS-stilar för alla färgklasser
 * Kallas en gång vid init för att skapa dynamiska stilar
 */
export const createColorStyles = () => {
  if (document.getElementById('part-color-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'part-color-styles';
  
  let css = '';
  partColors.forEach((color, index) => {
    css += `
      .part-color-${index} {
        background-color: ${color} !important;
      }
      .part-color-${index}:hover {
        background-color: ${adjustColorBrightness(color, -10)} !important;
      }
    `;
  });
  
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
};

/**
 * Applicerar färgklass på en tabellrad baserat på part-ID
 * @param {object} row - Tabulator row-objekt
 * @param {number} partId - ID för parten
 */
export const applyPartColorToRow = (row, partId) => {
  if (!partId) return;
  
  const colorIndex = (partId - 1) % partColors.length;
  row.getElement().classList.add(`part-color-${colorIndex}`);
};

/**
 * Tar bort alla färgklasser från en rad
 * @param {object} row - Tabulator row-objekt
 */
export const removePartColorsFromRow = (row) => {
  const rowElement = row.getElement();
  partColors.forEach((_, index) => {
    rowElement.classList.remove(`part-color-${index}`);
  });
};

/**
 * Uppdaterar färgklass på en rad när part ändras
 * @param {object} row - Tabulator row-objekt  
 * @param {number} newPartId - Nytt part-ID
 */
export const updateRowPartColor = (row, newPartId) => {
  removePartColorsFromRow(row);
  if (newPartId) {
    applyPartColorToRow(row, newPartId);
  }
};
