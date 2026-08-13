import { withExtension } from '../download-file';
import { buildMatrix } from '../matrix';
import type { TableExportInput, TableExportResult } from '../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * SpreadsheetML (.xls) — opens natively in Excel / LibreOffice without deps.
 */
export function exportExcel<T>(input: TableExportInput<T>): TableExportResult {
  const { headers, matrix } = buildMatrix(input.columns, input.rows);
  const sheetName = escapeXml((input.title ?? input.filename).slice(0, 31) || 'Dados');

  const headerRow = `<Row>${headers
    .map(
      (header) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
    )
    .join('')}</Row>`;

  const dataRows = matrix
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const numeric = cell !== '' && /^-?\d+(\.\d+)?$/.test(cell);
            const type = numeric ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
          })
          .join('')}</Row>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const mimeType = 'application/vnd.ms-excel;charset=utf-8';
  return {
    blob: new Blob([xml], { type: mimeType }),
    filename: withExtension(input.filename, 'xls'),
    mimeType,
  };
}
