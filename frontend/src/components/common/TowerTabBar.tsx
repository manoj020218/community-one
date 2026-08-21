import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Tower } from '../../types';

interface TowerTabBarProps {
  towers: Tower[];
  selected: string;
  onSelect: (towerId: string) => void;
  allLabel: string;
}

// Segmented tower/block filter — up to 3 shown as tabs, the rest collapse into an overflow
// menu (still showing the selected tower's name on the trigger if it's in the overflow) so
// this doesn't blow out horizontally for a society with many towers.
export function TowerTabBar({ towers, selected, onSelect, allLabel }: TowerTabBarProps) {
  const [showMenu, setShowMenu] = useState(false);
  if (towers.length < 2) return null;
  const visible = towers.slice(0, 3);
  const overflow = towers.slice(3);
  const selectedOverflow = overflow.find((t) => t._id === selected);
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onSelect('')} className={tabClass(selected === '')}>{allLabel}</button>
      {visible.map((t) => <button key={t._id} onClick={() => onSelect(t._id)} className={tabClass(selected === t._id)}>{t.name}</button>)}
      {overflow.length > 0 && (
        <div className="relative">
          <button onClick={() => setShowMenu((s) => !s)} className={tabClass(!!selectedOverflow)}>
            {selectedOverflow ? selectedOverflow.name : <MoreHorizontal className="w-4 h-4" />}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute z-20 mt-1 bg-white shadow-lg rounded-xl border border-slate-100 p-1 min-w-[160px] max-h-64 overflow-y-auto">
                {overflow.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => { onSelect(t._id); setShowMenu(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-slate-50 ${selected === t._id ? 'text-primary-600 font-medium' : 'text-slate-700'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
