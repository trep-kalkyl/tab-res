// Prisformatterare (redan finns)
export function SV_SE_priceFormatter(cell) {
    const value = cell.getValue();
    return value !== null && value !== undefined
        ? value.toLocaleString("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2 }).replace("SEK", "kr")
        : "-";
}

// Datumformatterare (YYYY-MM-DD -> DD/MM/YYYY)
export function SV_SE_dateFormatter(cell) {
    const value = cell.getValue();
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date)) return value; // Returnera original om det inte är ett datum
    return date.toLocaleDateString("sv-SE");
}

// Procentformatterare (t.ex. 0.25 -> 25 %)
export function SV_SE_percentFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    return (value * 100).toFixed(1).replace(".", ",") + " %";
}

// Tusentalsavgränsare (t.ex. 10000 -> 10 000)
export function SV_SE_thousandSeparatorFormatter(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined) return "-";
    return value.toLocaleString("sv-SE");
}

// Svenskt telefonnummer (t.ex. 0701234567 -> 070-123 45 67)
export function SV_SE_phoneFormatter(cell) {
    const value = cell.getValue();
    if (!value) return "-";
    // Enkel formattering, funkar för 10-siffriga svenska mobilnummer
    return value.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1-$2 $3 $4");
}
