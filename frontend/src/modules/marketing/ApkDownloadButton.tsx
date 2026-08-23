import { Download } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ApkDownloadButtonProps {
  compact?: boolean;
  className?: string;
}

/**
 * Glass-effect CTA with a looping shine sweep + soft glow — most visitors are on
 * mobile, so this needs to catch the eye without a screenshot/comparison to read.
 */
export function ApkDownloadButton({ compact = false, className }: ApkDownloadButtonProps) {
  return (
    <a
      href="/downloads/jenix-community.apk"
      download
      className={cn(
        'group relative inline-flex items-center gap-3 rounded-2xl overflow-hidden',
        'border border-white/25 bg-white/10 backdrop-blur-md',
        'hover:bg-white/15 hover:border-white/40 transition-colors animate-glow-pulse',
        compact ? 'px-3.5 py-2' : 'px-5 py-3.5',
        className
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] animate-shine" />
      <span
        className={cn(
          'relative z-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center',
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}
      >
        <Download className={compact ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'} />
      </span>
      <span className="relative z-10 text-left">
        <span className={cn('block font-semibold text-white', compact ? 'text-xs' : 'text-sm')}>Download App (APK)</span>
        <span className={cn('block text-white/60', compact ? 'text-[10px]' : 'text-xs')}>Direct install &middot; no Play Store needed</span>
      </span>
    </a>
  );
}
