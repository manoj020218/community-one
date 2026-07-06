import { cn } from '../../utils/cn';

interface SkeletonProps { className?: string; }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <Skeleton className="h-8 w-48" />
      </div>
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>{Array.from({ length: cols }).map((_, i) => <th key={i} className="table-header"><Skeleton className="h-4 w-24" /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="table-row">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="table-cell"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
