import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Lease } from '../../types';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE_GATEWAY', 'ADJUSTMENT', 'WAIVER'];

interface LeasePaymentModalProps {
  lease: Lease | null;
  societyId: string;
  onClose: () => void;
}

export function LeasePaymentModal({ lease, societyId, onClose }: LeasePaymentModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('UPI');
  const [period, setPeriod] = useState(new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }));

  // Pre-fill with the lease's rent amount whenever the modal opens for a (new) lease,
  // so an admin who never touches the field still submits the right amount, not 0.
  useEffect(() => {
    if (lease) setAmount(String(lease.rentAmount));
  }, [lease]);

  const mutation = useMutation({
    mutationFn: () => api.post('/payments', {
      societyId, flatId: lease?.flatId?._id || lease?.flatId, memberId: lease?.residentId?._id || lease?.residentId,
      amount: Number(amount), paymentPurpose: `Rent - ${period}`, moduleCode: 'LEASE',
      paymentMode: mode, paymentStatus: 'RECEIVED',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-payments'] });
      queryClient.invalidateQueries({ queryKey: ['lease-summary'] });
      toast.success('Rent payment recorded!');
      setAmount('');
      onClose();
    },
  });

  if (!lease) return null;

  return (
    <Modal isOpen={!!lease} onClose={onClose} title="Record Rent Payment">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
          Tenant: <strong>{lease.residentId?.name || 'N/A'}</strong> · Flat: <strong>{lease.flatId?.flatNo || 'N/A'}</strong>
        </div>
        <div>
          <label className="label">Billing Period</label>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} className="input" placeholder="e.g. August 2026" />
        </div>
        <div>
          <label className="label">Amount (₹) <span className="text-red-500">*</span></label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" min={0} />
        </div>
        <div>
          <label className="label">Payment Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="input">
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
