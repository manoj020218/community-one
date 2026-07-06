import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'indigo' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  trend?: { value: number; label: string };
  className?: string;
}

const colorMap = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function StatCard({ title, value, icon: Icon, color = 'indigo', trend, className }: StatCardProps) {
  return (
    <div className={cn('card p-5 hover:shadow-card-hover transition-all duration-200', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && (
            <p className={cn('text-xs font-medium mt-1', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', colorMap[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
