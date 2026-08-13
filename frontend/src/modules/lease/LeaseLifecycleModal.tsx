import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Lease } from '../../types';
import toast from 'react-hot-toast';

interface LeaseLifecycleModalProps {
  lease: Lease | null;
  mode: 'renew' | 'terminate' | null;
  onClose: () => void;
}

export function LeaseLifecycleModal({ lease, mode, onClose }: LeaseLifecycleModalProps) {
  const queryClient = useQueryClient();
  const [newEndDate, setNewEndDate] = useState('');
  const [newRentAmount, setNewRentAmount] = useState('');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [depositRefundAmount, setDepositRefundAmount] = useState('');

  const mutation = useMutation({
    mutationFn: () => mode === 'renew'
      ? api.post(`/leases/${lease?._id}/renew`, { newEndDate, newRentAmount: newRentAmount ? Number(newRentAmount) : undefined })
      : api.post(`/leases/${lease?._id}/terminate`, { terminationDate, reason, depositRefundAmount: depositRefundAmount ? Number(depositRefundAmount) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-summary'] });
      toast.success(mode === 'renew' ? 'Lease renewed!' : 'Lease terminated!');
      onClose();
    },
  });

  if (!lease || !mode) return null;

  return (
    <Modal isOpen={!!lease && !!mode} onClose={onClose} title={mode === 'renew' ? 'Renew Lease' : 'Terminate Lease'}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
          Tenant: <strong>{lease.residentId?.name || 'N/A'}</strong> · Flat: <strong>{lease.flatId?.flatNo || 'N/A'}</strong>
        </div>

        {mode === 'renew' ? (
          <>
            <div>
              <label className="label">New End Date <span className="text-red-500">*</span></label>
              <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">New Monthly Rent (₹) <span className="text-slate-400 font-normal">(optional — leave blank to keep current)</span></label>
              <input type="number" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} className="input" min={0} placeholder={String(lease.rentAmount)} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label">Termination / Move-out Date</label>
              <input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="e.g. Tenant relocating" />
            </div>
            <div>
              <label className="label">Deposit Refund Amount (₹)</label>
              <input type="number" value={depositRefundAmount} onChange={(e) => setDepositRefundAmount(e.target.value)} className="input" min={0} placeholder={String(lease.depositAmount)} />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || (mode === 'renew' && !newEndDate)} className="btn-primary flex-1">
            {mutation.isPending ? 'Saving...' : mode === 'renew' ? 'Renew Lease' : 'Confirm Termination'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
