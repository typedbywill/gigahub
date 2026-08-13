import type { TableExportCellValue, TableExportColumn } from './types';

export function cellToString(value: TableExportCellValue): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

export function buildMatrix<T>(
  columns: TableExportColumn<T>[],
  rows: T[],
): { headers: string[]; matrix: string[][] } {
  const headers = columns.map((column) => column.label);
  const matrix = rows.map((row) =>
    columns.map((column) => cellToString(column.value(row))),
  );
  return { headers, matrix };
}
