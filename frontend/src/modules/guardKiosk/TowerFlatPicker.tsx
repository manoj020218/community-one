import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { cn } from '../../utils/cn';
import { withSocietyQuery } from '../visitor/visitorApi';
import { VisitorFlatTile } from '../visitor/types';
import { Tower, PaginatedResult } from '../../types';
import { KIOSK_STRINGS, KioskLang } from './kioskStrings';

interface TowerFlatPickerProps {
  societyId: string;
  lang: KioskLang;
  onFlatPhotoReady: (flat: VisitorFlatTile, photo: File) => void;
}

const FLATS_PAGE_SIZE = 30;

export function TowerFlatPicker({ societyId, lang, onFlatPhotoReady }: TowerFlatPickerProps) {
  const t = KIOSK_STRINGS[lang];
  const [towerId, setTowerId] = useState('');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFlatRef = useRef<VisitorFlatTile | null>(null);

  const { data: towers = [] } = useQuery({
    queryKey: ['kiosk-towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(withSocietyQuery('/visitor/towers', societyId))),
  });

  useEffect(() => {
    if (!towerId && towers[0]?._id) setTowerId(towers[0]._id);
  }, [towerId, towers]);

  const { data: flats } = useQuery({
    queryKey: ['kiosk-flats', societyId, towerId, search],
    queryFn: () => extractData<PaginatedResult<VisitorFlatTile>>(
      api.get(withSocietyQuery(`/visitor/towers/${towerId}/flats?limit=${FLATS_PAGE_SIZE}&search=${encodeURIComponent(search)}`, societyId))
    ),
    enabled: !!towerId,
  });

  // The camera must open synchronously inside the tap handler — browsers revoke the "user
  // gesture" that permits input[type=file].click() as soon as we return to the event loop,
  // so this can't be deferred into a child component that mounts after a state update.
  const handleTileTap = (flat: VisitorFlatTile) => {
    pendingFlatRef.current = flat;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const flat = pendingFlatRef.current;
    e.target.value = '';
    if (file && flat) onFlatPhotoReady(flat, file);
  };

  return (
    <div className="flex flex-col h-full">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          {towers.map((tower) => (
            <button
              key={tower._id}
              onClick={() => setTowerId(tower._id)}
              className={cn(
                'shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all backdrop-blur-xl border',
                towerId === tower._id
                  ? 'bg-white text-slate-900 border-white shadow-lg scale-105'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              )}
            >
              {tower.name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchFlat}
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!flats?.items?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60 gap-3">
            <Building2 className="w-12 h-12" />
            <p>{t.selectFlat}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {flats.items.map((flat) => (
              <button
                key={flat._id}
                onClick={() => handleTileTap(flat)}
                className="aspect-square rounded-3xl bg-white/15 border border-white/25 backdrop-blur-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg transition-all hover:bg-white/25 hover:scale-105 active:scale-95"
              >
                {flat.flatNo}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
