export type TableExportFormat = 'json' | 'csv' | 'excel' | 'pdf';

export type TableExportCellValue = string | number | boolean | null | undefined;

export interface TableExportColumn<T> {
  id: string;
  label: string;
  value: (row: T) => TableExportCellValue;
}

export interface TableExportInput<T> {
  filename: string;
  columns: TableExportColumn<T>[];
  rows: T[];
  /** Shown as document title in PDF. Defaults to `filename`. */
  title?: string;
}

export interface TableExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export const TABLE_EXPORT_FORMATS: readonly {
  id: TableExportFormat;
  label: string;
  description: string;
}[] = [
  { id: 'json', label: 'JSON', description: 'Dados estruturados (.json)' },
  { id: 'excel', label: 'Excel', description: 'Planilha compatível com Excel (.xls)' },
  { id: 'csv', label: 'CSV', description: 'Valores separados por vírgula (.csv)' },
  { id: 'pdf', label: 'PDF', description: 'Documento para impressão (.pdf)' },
] as const;
