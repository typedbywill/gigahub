import { downloadBlob } from './download-file';
import { exportCsv } from './formats/csv';
import { exportExcel } from './formats/excel';
import { exportJson } from './formats/json';
import { exportPdf } from './formats/pdf';
import type {
  TableExportFormat,
  TableExportInput,
  TableExportResult,
} from './types';

const exporters: Record<
  TableExportFormat,
  <T>(input: TableExportInput<T>) => TableExportResult
> = {
  json: exportJson,
  csv: exportCsv,
  excel: exportExcel,
  pdf: exportPdf,
};

export function buildTableExport<T>(
  format: TableExportFormat,
  input: TableExportInput<T>,
): TableExportResult {
  if (input.columns.length === 0) {
    throw new Error('Nenhuma coluna configurada para exportação.');
  }
  return exporters[format](input);
}

export function downloadTableExport<T>(
  format: TableExportFormat,
  input: TableExportInput<T>,
): TableExportResult {
  const result = buildTableExport(format, input);
  downloadBlob(result.blob, result.filename);
  return result;
}
