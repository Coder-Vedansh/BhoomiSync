import React from 'react';
import { TableSkeleton } from './Skeleton';

export interface Column<T> {
  header: React.ReactNode;
  accessor?: keyof T | ((item: T, index: number) => React.ReactNode);
  className?: string;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  selectedRowKey?: string | number;
  isRowSelected?: (item: T, index: number) => boolean;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedRowKey,
  isRowSelected,
  emptyMessage = 'No records found',
  loading = false,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`data-table-container ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width }} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton rows={5} columns={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-500 italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              const isSelected = isRowSelected
                ? isRowSelected(item, rowIdx)
                : selectedRowKey !== undefined && selectedRowKey === rowKey;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(item)}
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'selected' : ''}`}
                >
                  {columns.map((col, colIdx) => {
                    const content =
                      typeof col.accessor === 'function'
                        ? col.accessor(item, rowIdx)
                        : col.accessor
                        ? (item[col.accessor] as React.ReactNode)
                        : null;
                    return (
                      <td key={colIdx} className={col.className}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
