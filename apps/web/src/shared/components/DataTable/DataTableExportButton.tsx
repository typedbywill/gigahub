import React, { useState } from 'react';
import { Button, Dropdown, Label } from '@heroui/react';
import {
  LuDownload,
  LuFile,
  LuFileJson,
  LuFileSpreadsheet,
  LuFileText,
} from 'react-icons/lu';
import {
  downloadTableExport,
  TABLE_EXPORT_FORMATS,
  type TableExportColumn,
  type TableExportFormat,
} from '../../lib/table-export';
import { toast } from '../../ui/toast';

const FORMAT_ICONS: Record<TableExportFormat, React.ReactNode> = {
  json: <LuFileJson className="size-4 shrink-0 text-muted" />,
  excel: <LuFileSpreadsheet className="size-4 shrink-0 text-muted" />,
  csv: <LuFileText className="size-4 shrink-0 text-muted" />,
  pdf: <LuFile className="size-4 shrink-0 text-muted" />,
};

export interface DataTableExportConfig<T> {
  filename: string;
  columns: TableExportColumn<T>[];
  title?: string;
  /**
   * Rows to export. Defaults to the table's current `items`.
   * Pass a function to export a broader dataset (e.g. all pages).
   */
  getRows?: () => T[] | Promise<T[]>;
  disabled?: boolean;
}

export function DataTableExportButton<T>({
  config,
  items,
}: {
  config: DataTableExportConfig<T>;
  items: T[];
}) {
  const [pending, setPending] = useState(false);

  const handleExport = async (format: TableExportFormat) => {
    if (pending || config.disabled) {
      return;
    }
    setPending(true);
    try {
      const rows = config.getRows ? await config.getRows() : items;
      downloadTableExport(format, {
        filename: config.filename,
        columns: config.columns,
        rows,
        title: config.title,
      });
      toast.success('Download iniciado');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Não foi possível exportar os dados.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Baixar dados da tabela"
        isPending={pending}
        isDisabled={config.disabled || pending}
      >
        <LuDownload className="size-4" />
      </Button>
      <Dropdown.Popover placement="top end">
        <Dropdown.Menu
          aria-label="Formato de download"
          onAction={(key) => {
            void handleExport(String(key) as TableExportFormat);
          }}
        >
          {TABLE_EXPORT_FORMATS.map((format) => (
            <Dropdown.Item
              key={format.id}
              id={format.id}
              textValue={format.label}
            >
              {FORMAT_ICONS[format.id]}
              <Label>{format.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
