import { withExtension } from '../download-file';
import type { TableExportInput, TableExportResult } from '../types';

export function exportJson<T>(input: TableExportInput<T>): TableExportResult {
  const payload = input.rows.map((row) => {
    const record: Record<string, string | number | boolean | null> = {};
    for (const column of input.columns) {
      const value = column.value(row);
      record[column.id] = value === undefined ? null : value;
    }
    return record;
  });

  const mimeType = 'application/json;charset=utf-8';
  return {
    blob: new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: mimeType }),
    filename: withExtension(input.filename, 'json'),
    mimeType,
  };
}
