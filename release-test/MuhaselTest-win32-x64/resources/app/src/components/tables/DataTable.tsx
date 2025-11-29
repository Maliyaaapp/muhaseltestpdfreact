import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  onRowClick?: (item: T) => void;
}

/**
 * DataTable component with fixed dimensions and consistent styling
 * 
 * @param data - Array of data items
 * @param columns - Table column definitions
 * @param emptyMessage - Message to display when there's no data
 * @param isLoading - Whether the table is in loading state
 * @param className - Additional CSS classes
 * @param onRowClick - Handler for row click events
 */
function DataTable<T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = 'لا توجد بيانات للعرض',
  isLoading = false,
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={`table-container max-h-full overflow-x-auto overflow-y-auto ${className}`}>
      <table className="data-table w-auto min-w-full">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index} 
                style={{ width: column.width || 'auto' }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8">
                <div className="flex justify-center">
                  <div className="loader"></div>
                </div>
                <div className="mt-2 text-gray-600">جاري تحميل البيانات...</div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex}>
                    {typeof column.accessor === 'function'
                      ? column.accessor(item)
                      : item[column.accessor] !== undefined
                        ? String(item[column.accessor])
                        : ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;