

// Loading Skeleton Card - Medical Style
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-medical-200 p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-medical-100 rounded-xl skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-medical-200 rounded skeleton w-20" />
          <div className="h-5 bg-medical-200 rounded skeleton w-32" />
        </div>
        <div className="w-10 h-10 bg-medical-100 rounded-lg skeleton flex-shrink-0" />
      </div>
    </div>
  );
}

// Stats Card Skeleton
export function SkeletonStatsCard() {
  return (
    <div className="bg-white rounded-xl border border-medical-200 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-medical-200 rounded skeleton w-24" />
          <div className="h-8 bg-medical-200 rounded skeleton w-16" />
          <div className="h-3 bg-medical-200 rounded skeleton w-20" />
        </div>
        <div className="w-12 h-12 bg-medical-100 rounded-xl skeleton flex-shrink-0" />
      </div>
    </div>
  );
}

// Table Skeleton
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl border border-medical-200 overflow-hidden">
      <div className="bg-medical-50 border-b border-medical-200 p-3">
        <div className="h-4 bg-medical-200 rounded skeleton w-32" />
      </div>
      <div className="divide-y divide-medical-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-4 bg-medical-200 rounded skeleton flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Large Card Skeleton (for Dashboard) - Medical Style
export function SkeletonCardLarge() {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 bg-medical-200 rounded skeleton w-40" />
          <div className="h-3 bg-medical-200 rounded skeleton w-56" />
        </div>
        <div className="w-10 h-10 bg-medical-100 rounded-xl skeleton" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-medical-50 rounded-xl skeleton" />
        ))}
      </div>
    </div>
  );
}

// Skeleton Row for Tables
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-medical-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-medical-200 rounded skeleton w-full" style={{ maxWidth: i === 0 ? '150px' : '100px' }} />
        </td>
      ))}
    </tr>
  );
}

// Full Page Loading State
export function PageLoader({ message = 'Laden...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-12 h-12 border-3 border-medical-200 border-t-primary rounded-full animate-spin" />
      <p className="text-medical-500 text-sm">{message}</p>
    </div>
  );
}
