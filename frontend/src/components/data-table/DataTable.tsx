import {
  type ColumnDef,
  type Row,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  getSortedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Fragment, useState } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  // Pagination
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Sorting
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
  // Total
  total?: number;
  // Expandable rows
  renderSubRow?: (row: Row<TData>) => React.ReactNode;
  // Row selection
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageCount = 1,
  pageIndex = 0,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  total = 0,
  renderSubRow,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(
    sortBy ? [{ id: sortBy, desc: sortOrder === 'DESC' }] : [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(renderSubRow ? { getExpandedRowModel: getExpandedRowModel() } : {}),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    enableRowSelection: enableRowSelection ?? false,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
      ...(rowSelection !== undefined ? { rowSelection } : {}),
    },
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const newSelection = typeof updater === 'function'
            ? updater(rowSelection ?? {})
            : updater;
          onRowSelectionChange(newSelection);
        }
      : undefined,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      if (onSortChange && newSorting.length > 0) {
        onSortChange(newSorting[0].id, newSorting[0].desc ? 'DESC' : 'ASC');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className={canSort ? 'cursor-pointer select-none' : ''}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-xs text-muted-foreground">
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? ''}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={renderSubRow ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={renderSubRow ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('a, button')) return;
                      row.toggleExpanded();
                    } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderSubRow && row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        {renderSubRow(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nessun risultato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>
              {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, total)} di{' '}
              {total.toLocaleString()}
            </>
          ) : (
            'Nessun risultato'
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium hidden sm:block">Righe</p>
            <select
              className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(0)}
              disabled={pageIndex === 0}
            >
              {'«'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(pageIndex - 1)}
              disabled={pageIndex === 0}
            >
              {'‹'}
            </Button>
            <span className="text-sm px-2">
              {pageIndex + 1}/{pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              {'›'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              {'»'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
