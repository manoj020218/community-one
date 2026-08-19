import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Megaphone, Download } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { cn } from '../../utils/cn';

interface AppBanner {
  _id: string;
  title?: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  bannerType: 'UPDATE' | 'ANNOUNCEMENT' | 'OTHER';
}

const DISMISSED_KEY = 'jenix-dismissed-banners';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Backend-controlled banner — no script/HTML execution by design (see banner.model.ts).
 * Shows above page content for every logged-in role. First use case: telling users a new
 * APK version is available, since the app isn't on Play Store and can't auto-update.
 */
export function BannerBar() {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const { data: banners = [] } = useQuery({
    queryKey: ['banners-active'],
    queryFn: () => extractData<AppBanner[]>(api.get('/banners/active')),
    staleTime: 5 * 60 * 1000,
  });

  const visible = banners.filter((b) => !dismissed.includes(b._id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-2 mb-4">
      {visible.map((banner) => (
        <div
          key={banner._id}
          className={cn(
            'flex items-center gap-3 rounded-2xl p-4 border',
            banner.bannerType === 'UPDATE' ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'
          )}
        >
          {banner.imageUrl ? (
            <img src={banner.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', banner.bannerType === 'UPDATE' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600')}>
              {banner.bannerType === 'UPDATE' ? <Download className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {banner.title && <p className="text-sm font-semibold text-slate-800">{banner.title}</p>}
            <p className="text-sm text-slate-600">{banner.message}</p>
          </div>
          {banner.linkUrl && (
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs px-3 py-2 flex-shrink-0 whitespace-nowrap"
            >
              {banner.linkLabel || 'View'}
            </a>
          )}
          <button onClick={() => dismiss(banner._id)} className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
