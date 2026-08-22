import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface SortableThProps {
  label: string;
  field: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export function SortableTh({ label, field, sortBy, sortDir, onSort }: SortableThProps) {
  const active = sortBy === field;
  return (
    <th className="table-header text-left">
      <button onClick={() => onSort(field)} className={`flex items-center gap-1 hover:text-slate-700 transition-colors ${active ? 'text-slate-700' : ''}`}>
        {label}
        {active ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </th>
  );
}
