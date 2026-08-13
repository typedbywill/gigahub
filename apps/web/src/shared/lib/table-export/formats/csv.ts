import { withExtension } from '../download-file';
import { buildMatrix } from '../matrix';
import type { TableExportInput, TableExportResult } from '../types';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCsv<T>(input: TableExportInput<T>): TableExportResult {
  const { headers, matrix } = buildMatrix(input.columns, input.rows);
  const lines = [
    headers.map(escapeCsv).join(','),
    ...matrix.map((row) => row.map(escapeCsv).join(',')),
  ];
  // BOM helps Excel open UTF-8 correctly
  const content = `\uFEFF${lines.join('\r\n')}`;
  const mimeType = 'text/csv;charset=utf-8';
  return {
    blob: new Blob([content], { type: mimeType }),
    filename: withExtension(input.filename, 'csv'),
    mimeType,
  };
}
