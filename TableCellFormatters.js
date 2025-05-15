// SV_priceFormatter: Formats numbers as SEK with two decimals, e.g. "1 234,56 kr"
export function SV_priceFormatter(cell) {
  const value = cell.getValue();
  if (value == null || isNaN(value)) return "-";
  return value
    .toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    + " kr";
}

// SV_hourlyRateFormatter: Formats hourly rates, allows custom decimals (default 2)
export function SV_hourlyRateFormatter(cell, params = {}) {
  const value = cell.getValue();
  const decimals = params.decimals ?? 2;
  if (value == null || isNaN(value)) return "-";
  return value
    .toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    + " kr/tim";
}

// SV_timeDurationFormatter: Formats duration in hours (as "1,5 h") or hours:minutes (as "1:30 h")
export function SV_timeDurationFormatter(cell, params = {}) {
  const value = cell.getValue();
  if (value == null || isNaN(value)) return "-";
  // If value is a float (e.g. 1.5), show as "1,5 h"
  if (params.format === "decimal" || !params.format) {
    return value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " h";
  }
  // If value is minutes, convert to "h:mm"
  const totalMinutes = Math.round(Number(value) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")} h`;
}

// SV_dateFormatter: Formats ISO date string to "YYYY-MM-DD HH:mm"
export function SV_dateFormatter(cell) {
  const value = cell.getValue();
  if (!value) return "-";
  // Simple parsing, assumes input is "YYYY-MM-DD HH:mm"
  return value.replace("T", " ").substring(0, 16);
}

