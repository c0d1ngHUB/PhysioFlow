import { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface TableHeadProps {
  children: ReactNode;
}

export function TableHead({ children }: TableHeadProps) {
  return (
    <thead className="bg-medical-50 border-b border-medical-200">
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody className="divide-y divide-medical-100">
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
}

export function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-medical-50/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function TableCell({ children, align = 'left', className = '' }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={`py-4 px-4 whitespace-nowrap ${alignClasses[align]} ${className}`}>
      {children}
    </td>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function TableHeader({ children, align = 'left', className = '' }: TableHeaderProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th className={`py-3 px-4 font-semibold text-xs uppercase tracking-wide text-medical-500 ${alignClasses[align]} ${className}`}>
      {children}
    </th>
  );
}
