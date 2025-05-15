// Formatter function for prices
export function priceFormatter(cell) {
    // Get the value from the cell
    const value = cell.getValue();

    // Format as currency (two decimal places) and add " kr"
    return value ? value.toFixed(2) + " kr" : "-";
}
