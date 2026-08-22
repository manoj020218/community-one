import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Building2, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { TowerTabBar } from '../../components/common/TowerTabBar';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower } from '../../types';
import { formatPaise } from './mcr.types';

interface OpeningBalanceWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpeningBalanceWizard({ isOpen, onClose }: OpeningBalanceWizardProps) {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState('');
  const [openingBank, setOpeningBank] = useState('');
  const [towerFilter, setTowerFilter] = useState('');
  const [dues, setDues] = useState<Record<string, string>>({});

  const { data: towers } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId && isOpen,
  });

  const { data: flats } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=500`)),
    enabled: !!societyId && isOpen && step === 2,
  });

  const invalidateFundData = () => {
    queryClient.invalidateQueries({ queryKey: ['mcr-opening-balance'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-fund-balance'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-demands'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-summary'] });
  };

  const saveOpeningMutation = useMutation({
    mutationFn: () => api.patch('/mcr/opening-balance', {
      societyId,
      asOfDate,
      openingCashPaise: Math.round(Number(openingCash || 0) * 100),
      openingBankPaise: Math.round(Number(openingBank || 0) * 100),
    }),
    onSuccess: () => { invalidateFundData(); toast.success('Opening balance saved'); setStep(2); },
  });

  const bulkDuesMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(dues)
        .map(([flatId, value]) => ({ flatId, amountPaise: Math.round(Number(value || 0) * 100) }))
        .filter((e) => e.amountPaise > 0);
      return api.post('/mcr/opening-balance/bulk-dues', { societyId, asOfDate, entries });
    },
    onSuccess: (res: any) => {
      invalidateFundData();
      const { createdCount, skippedCount } = res.data?.data || {};
      toast.success(`${createdCount ?? 0} opening due(s) created${skippedCount ? `, ${skippedCount} already existed` : ''}`);
      handleClose();
    },
  });

  const handleClose = () => {
    setStep(1);
    setAsOfDate(new Date().toISOString().slice(0, 10));
    setOpeningCash('');
    setOpeningBank('');
    setDues({});
    setTowerFilter('');
    onClose();
  };

  const filteredFlats = (flats?.items || []).filter((f: any) => !towerFilter || f.towerId?._id === towerFilter);
  const totalDuesEntered = Object.values(dues).reduce((sum, v) => sum + (Number(v) || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Set Up Opening Balance" size="lg">
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            One-time setup for a society that's already been running before this platform — enter the cash/bank balance you
            actually hold as of a cutover date. This never needs to be repeated; you can always edit it later.
          </p>
          <div><label className="label">As of Date <span className="text-red-500">*</span></label>
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Opening Cash in Hand (₹)</label>
              <input type="number" min={0} value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} className="input" placeholder="0" /></div>
            <div><label className="label">Opening Bank Balance (₹)</label>
              <input type="number" min={0} value={openingBank} onChange={(e) => setOpeningBank(e.target.value)} className="input" placeholder="0" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveOpeningMutation.mutate()} disabled={saveOpeningMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saveOpeningMutation.isPending ? 'Saving...' : <>Save & Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button onClick={handleClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
            <Check className="w-4 h-4 flex-shrink-0" /> Opening balance saved (₹{openingCash || 0} cash, ₹{openingBank || 0} bank).
          </div>
          <p className="text-xs text-slate-500">
            <strong>Optional:</strong> add pending maintenance dues owed from before this platform was adopted — one lump amount
            per flat is enough, not a month-by-month history. Leave a flat's box empty or 0 to skip it. You can always come back
            and add more flats later; entering a flat twice won't double-charge it.
          </p>

          <TowerTabBar towers={towers || []} selected={towerFilter} onSelect={setTowerFilter} allLabel="All Blocks" />

          <div className="border border-slate-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50"><tr>
                <th className="table-header text-left">Flat</th>
                {(towers?.length || 0) > 1 && <th className="table-header text-left">Block</th>}
                <th className="table-header text-left">Pending Due (₹)</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredFlats.map((f: any) => (
                  <tr key={f._id}>
                    <td className="table-cell text-slate-700">{f.flatNo}</td>
                    {(towers?.length || 0) > 1 && <td className="table-cell text-xs text-slate-500">{f.towerId?.name || '—'}</td>}
                    <td className="table-cell">
                      <input
                        type="number" min={0} placeholder="0"
                        value={dues[f._id] || ''}
                        onChange={(e) => setDues((d) => ({ ...d, [f._id]: e.target.value }))}
                        className="input py-1 w-32"
                      />
                    </td>
                  </tr>
                ))}
                {!filteredFlats.length && (
                  <tr><td colSpan={3} className="table-cell text-center text-slate-400 py-6">No flats found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">Total entered: <strong>{formatPaise(totalDuesEntered * 100)}</strong></p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => bulkDuesMutation.mutate()}
              disabled={bulkDuesMutation.isPending || totalDuesEntered <= 0}
              className="btn-primary flex-1"
            >
              {bulkDuesMutation.isPending ? 'Creating...' : 'Save & Publish Pending Dues'}
            </button>
            <button onClick={handleClose} className="btn-secondary">Skip / Finish</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface OpeningBalanceEmptyStateProps {
  onSetup: () => void;
}

export function OpeningBalanceEmptyState({ onSetup }: OpeningBalanceEmptyStateProps) {
  return (
    <div className="card p-8 text-center">
      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Wallet className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">Set up your opening balance</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
        Start tracking fund balance and expenses — enter what cash/bank you currently hold, and optionally
        bring in any pending maintenance dues from before this platform.
      </p>
      <button onClick={onSetup} className="btn-primary inline-flex items-center gap-2">
        <Building2 className="w-4 h-4" /> Set Up Opening Balance
      </button>
    </div>
  );
}
