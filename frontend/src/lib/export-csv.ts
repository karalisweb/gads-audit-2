/**
 * Utility per esportare dati in formato CSV
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

/**
 * Genera un file CSV e lo scarica
 */
export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[],
) {
  if (data.length === 0) return;

  const separator = ';'; // Excel-friendly per locale italiano
  const BOM = '\uFEFF'; // UTF-8 BOM per Excel

  // Header
  const headerRow = columns.map((col) => escapeCell(col.header)).join(separator);

  // Data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.accessor(row);
        if (value === null || value === undefined) return '';
        return escapeCell(String(value));
      })
      .join(separator),
  );

  const csvContent = BOM + [headerRow, ...dataRows].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape per celle CSV (gestisce virgolette e separatori)
 */
function escapeCell(value: string): string {
  if (value.includes('"') || value.includes(';') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formatta micros in valuta (es. 1500000 -> "1.50")
 */
export function microsToDecimal(micros: string | number | null | undefined): string {
  if (!micros) return '0.00';
  const num = typeof micros === 'string' ? parseFloat(micros) : micros;
  return (num / 1_000_000).toFixed(2);
}

/**
 * Formatta percentuale (es. "0.0534" -> "5.34%")
 */
export function formatPercent(value: string | number | null | undefined): string {
  if (!value) return '0.00%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(2)}%`;
}
