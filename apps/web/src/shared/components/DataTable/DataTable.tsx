import React, { useRef } from 'react';
import {
  Button,
  EmptyState,
  Pagination,
  SearchField,
  Spinner,
  Table,
} from '@heroui/react';
import { useFitPageSize } from '../../hooks/use-fit-page-size';

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  isRowHeader?: boolean;
}

export interface DataTablePreset {
  id: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T extends object> {
  ariaLabel: string;
  columns: DataTableColumn<T>[];
  items: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Left side of the toolbar (e.g. page title). Sits on the same row as search. */
  leading?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onSearchClear?: () => void;
  searchPlaceholder?: string;
  presets?: DataTablePreset[];
  toolbarEnd?: React.ReactNode;
  pagination?: DataTablePagination;
  onRowAction?: (key: string) => void;
  /**
   * Fill parent height: table body scrolls, footer stays visible.
   * When set with `onPageSizeChange`, reports how many rows fit.
   */
  fillHeight?: boolean;
  estimatedRowHeight?: number;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

function pageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current]);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= totalPages) {
      pages.add(i);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

export function DataTable<T extends object>({
  ariaLabel,
  columns,
  items,
  getRowId,
  isLoading = false,
  emptyMessage = 'Nenhum resultado encontrado',
  leading,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  searchPlaceholder = 'Pesquisar…',
  presets,
  toolbarEnd,
  pagination,
  onRowAction,
  fillHeight = false,
  estimatedRowHeight = 44,
  onPageSizeChange,
  className,
}: DataTableProps<T>) {
  const bodyViewportRef = useRef<HTMLDivElement>(null);
  const fitPageSize = useFitPageSize(bodyViewportRef, {
    rowHeight: estimatedRowHeight,
    min: 5,
    max: 100,
  });

  const prevFitRef = useRef(0);
  React.useEffect(() => {
    if (!fillHeight || !onPageSizeChange) {
      return;
    }
    if (prevFitRef.current === fitPageSize) {
      return;
    }
    prevFitRef.current = fitPageSize;
    onPageSizeChange(fitPageSize);
  }, [fillHeight, fitPageSize, onPageSizeChange]);

  const showSearch = onSearchChange !== undefined;
  const showToolbar =
    leading !== undefined ||
    showSearch ||
    (presets !== undefined && presets.length > 0) ||
    toolbarEnd;

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;
  const pages = pagination ? pageNumbers(pagination.page, totalPages) : [];
  const rangeStart = pagination
    ? pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1
    : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : 0;

  return (
    <div
      className={[
        'flex min-h-0 flex-col gap-3',
        fillHeight ? 'h-full' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showToolbar ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          {leading ? (
            <div className="min-w-0 shrink grow basis-40">{leading}</div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto">
            {showSearch ? (
              <SearchField
                aria-label={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
                onClear={onSearchClear}
                className="w-full min-w-48 max-w-xs sm:w-64"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={searchPlaceholder} />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            ) : null}
            {presets && presets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant={preset.active ? 'primary' : 'secondary'}
                    onPress={preset.onPress}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            ) : null}
            {toolbarEnd ? (
              <div className="flex shrink-0 items-center gap-2">{toolbarEnd}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Table
        className={
          fillHeight
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : undefined
        }
      >
        <Table.ScrollContainer
          ref={bodyViewportRef}
          className={
            fillHeight ? 'min-h-0 flex-1 overflow-auto' : undefined
          }
        >
          <Table.Content
            aria-label={ariaLabel}
            className="min-w-160"
            {...(onRowAction
              ? {
                  onRowAction: (key: React.Key) => {
                    onRowAction(String(key));
                  },
                }
              : {})}
          >
            <Table.Header>
              {columns.map((column) => (
                <Table.Column
                  key={column.id}
                  isRowHeader={column.isRowHeader}
                  id={column.id}
                >
                  {column.header}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body
              items={items}
              renderEmptyState={() => (
                <EmptyState className="flex h-40 w-full flex-col items-center justify-center gap-3 text-center">
                  {isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="text-sm text-muted">{emptyMessage}</span>
                  )}
                </EmptyState>
              )}
            >
              {(row) => (
                <Table.Row
                  id={getRowId(row)}
                  className={onRowAction ? 'cursor-pointer' : undefined}
                >
                  {columns.map((column) => (
                    <Table.Cell key={column.id}>{column.cell(row)}</Table.Cell>
                  ))}
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {pagination ? (
          <Table.Footer className="flex shrink-0 flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Pagination size="sm" className="w-full sm:w-auto">
              <Pagination.Summary>
                {pagination.total === 0
                  ? '0 resultados'
                  : `${rangeStart}–${rangeEnd} de ${pagination.total}`}
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={pagination.page <= 1 || isLoading}
                    onPress={() =>
                      pagination.onPageChange(Math.max(1, pagination.page - 1))
                    }
                  >
                    <Pagination.PreviousIcon />
                    Anterior
                  </Pagination.Previous>
                </Pagination.Item>
                {pages.map((pageNum, index) => {
                  const prev = pages[index - 1];
                  const showEllipsis =
                    prev !== undefined && pageNum - prev > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis ? (
                        <Pagination.Item>
                          <span className="px-1 text-muted">…</span>
                        </Pagination.Item>
                      ) : null}
                      <Pagination.Item>
                        <Pagination.Link
                          isActive={pageNum === pagination.page}
                          onPress={() => pagination.onPageChange(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Link>
                      </Pagination.Item>
                    </React.Fragment>
                  );
                })}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={pagination.page >= totalPages || isLoading}
                    onPress={() =>
                      pagination.onPageChange(
                        Math.min(totalPages, pagination.page + 1),
                      )
                    }
                  >
                    Próxima
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </Table.Footer>
        ) : null}
      </Table>
    </div>
  );
}
