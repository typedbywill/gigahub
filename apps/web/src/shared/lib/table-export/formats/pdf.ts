import { withExtension } from '../download-file';
import { buildMatrix } from '../matrix';
import type { TableExportInput, TableExportResult } from '../types';

/** Literal PDF string with WinAnsi escapes for Latin-1 (pt-BR accents). */
function pdfString(value: string): string {
  let out = '(';
  for (const char of value) {
    if (char === '\\' || char === '(' || char === ')') {
      out += `\\${char}`;
      continue;
    }
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      out += char;
    } else if (code <= 255) {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    } else {
      out += '?';
    }
  }
  return `${out})`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1))}...`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Minimal multi-page PDF table exporter (Helvetica, no external deps).
 */
export function exportPdf<T>(input: TableExportInput<T>): TableExportResult {
  const { headers, matrix } = buildMatrix(input.columns, input.rows);
  const title = input.title ?? input.filename;
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const colCount = Math.max(headers.length, 1);
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / colCount;
  const fontSize = 9;
  const titleSize = 12;
  const rowHeight = 16;
  const headerHeight = 18;
  const maxChars = Math.max(8, Math.floor(colWidth / 5.2));

  const rowsPerPage = Math.max(
    1,
    Math.floor((pageHeight - margin * 2 - 28 - headerHeight) / rowHeight),
  );

  const pageChunks: string[][][] =
    matrix.length === 0
      ? [[]]
      : Array.from({ length: Math.ceil(matrix.length / rowsPerPage) }, (_, index) =>
          matrix.slice(index * rowsPerPage, (index + 1) * rowsPerPage),
        );

  const contentStreams = pageChunks.map((pageRows) => {
    const lines: string[] = ['BT'];
    let y = pageHeight - margin;

    lines.push(`/F1 ${titleSize} Tf`);
    lines.push(`1 0 0 1 ${margin} ${y - titleSize} Tm`);
    lines.push(`${pdfString(truncate(title, 80))} Tj`);
    y -= titleSize + 14;

    lines.push(`/F1 ${fontSize} Tf`);
    let x = margin;
    for (const header of headers) {
      lines.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
      lines.push(`${pdfString(truncate(header, maxChars))} Tj`);
      x += colWidth;
    }
    y -= headerHeight;

    for (const row of pageRows) {
      x = margin;
      for (const cell of row) {
        lines.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
        lines.push(`${pdfString(truncate(cell, maxChars))} Tj`);
        x += colWidth;
      }
      y -= rowHeight;
    }

    lines.push('ET');
    return lines.join('\n');
  });

  const fontObjectId = 3 + contentStreams.length * 2;
  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjectIds = contentStreams.map((_, index) => 3 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${contentStreams.length} >>`,
  );

  for (let i = 0; i < contentStreams.length; i += 1) {
    const pageObjectId = 3 + i * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = contentStreams[i] ?? '';
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjectId} 0 R /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> >>`,
    );
    objects.push(
      `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }

  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const mimeType = 'application/pdf';
  return {
    blob: new Blob([pdf], { type: mimeType }),
    filename: withExtension(input.filename, 'pdf'),
    mimeType,
  };
}
