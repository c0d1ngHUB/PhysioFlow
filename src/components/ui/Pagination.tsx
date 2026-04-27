interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({ page, limit, total, totalPages, onPageChange, onLimitChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    if (page - delta > 2) pages.push(1, '...');
    else pages.push(1);
    pages.push(...range);
    if (page + delta < totalPages - 1) pages.push('...', totalPages);
    else if (totalPages > 1) pages.push(totalPages);
    return [...new Set(pages)];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="text-sm text-medical-500">
        Zeige <span className="font-medium text-text-primary">{Math.min((page - 1) * limit + 1, total)}</span>–
        <span className="font-medium text-text-primary">{Math.min(page * limit, total)}</span> von{' '}
        <span className="font-medium text-text-primary">{total}</span> Einträgen
      </div>
      <div className="flex items-center gap-2">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-sm rounded-lg border border-medical-200 px-2 py-1.5 bg-white"
          >
            {[10, 20, 50, 100].map((l) => (
              <option key={l} value={l}>{l}/Seite</option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-medical-200 text-sm font-medium hover:bg-medical-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Zurück
        </button>
        <div className="flex gap-1">
          {getVisiblePages().map((p, i) => (
            <button
              key={i}
              onClick={() => typeof p === 'number' && onPageChange(p)}
              disabled={typeof p !== 'number'}
              className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-sm font-medium ${
                p === page
                  ? 'bg-primary text-white'
                  : typeof p === 'number'
                  ? 'border border-medical-200 hover:bg-medical-50'
                  : 'cursor-default text-medical-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-medical-200 text-sm font-medium hover:bg-medical-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}
