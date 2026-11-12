import type { ReactNode } from 'react';
import { LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Отображать ли пагинацию (значения управляются снаружи). */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

/** Универсальная таблица: колонки с кастомным рендером, пагинация, прогресс загрузки. */
export function DataTable<T>({ columns, rows, rowKey, loading = false, pagination }: DataTableProps<T>) {
  const cellValue = (row: T, column: DataTableColumn<T>): ReactNode => {
    if (column.render) return column.render(row);
    const raw = (row as unknown as Record<string, unknown>)[column.id];
    return raw === null || raw === undefined || raw === '' ? '—' : String(raw);
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      {loading && <LinearProgress />}
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align ?? 'left'} width={column.width}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} hover>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align ?? 'left'}>
                  {cellValue(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Данных нет
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={Math.max(0, pagination.page - 1)}
          rowsPerPage={pagination.pageSize}
          onPageChange={(_event, newPage) => pagination.onPageChange(newPage + 1)}
          onRowsPerPageChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        />
      )}
    </TableContainer>
  );
}
