import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Flat, Resident } from '../../types';
import toast from 'react-hot-toast';

interface LeaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  societyId: string;
  createdBy: string;
}

const emptyForm = {
  flatId: '', residentId: '', newTenantName: '', newTenantMobile: '',
  rentAmount: '', depositAmount: '', billingDay: 5,
  startDate: new Date().toISOString().slice(0, 10), endDate: '',
  noticePeriodDays: 30, remarks: '',
};

export function LeaseFormModal({ isOpen, onClose, societyId, createdBy }: LeaseFormModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [addingTenant, setAddingTenant] = useState(false);
  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: flats = [] } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)).then((d) => d.items),
    enabled: isOpen && !!societyId,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-flat', form.flatId],
    queryFn: () => extractData<Resident[]>(api.get(`/residents/flat/${form.flatId}`)),
    enabled: isOpen && !!form.flatId,
  });

  const tenants = residents.filter((r) => r.memberType === 'TENANT');

  const createLease = useMutation({
    mutationFn: async (residentId: string) => api.post('/leases', {
      societyId, flatId: form.flatId, residentId,
      rentAmount: Number(form.rentAmount), depositAmount: Number(form.depositAmount) || 0,
      billingDay: Number(form.billingDay), startDate: form.startDate, endDate: form.endDate,
      noticePeriodDays: Number(form.noticePeriodDays), remarks: form.remarks,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-summary'] });
      toast.success('Lease created!');
      setForm(emptyForm);
      setAddingTenant(false);
      onClose();
    },
  });

  const addTenantThenLease = useMutation({
    mutationFn: async () => {
      const tenant = await extractData<Resident>(api.post('/residents', {
        societyId, flatId: form.flatId, name: form.newTenantName, mobile: form.newTenantMobile,
        memberType: 'TENANT', createdBy,
      }));
      return createLease.mutateAsync(tenant._id);
    },
  });

  const submitting = createLease.isPending || addTenantThenLease.isPending;
  const canSubmit = !!form.flatId && !!form.rentAmount && !!form.endDate &&
    (addingTenant ? !!form.newTenantName && !!form.newTenantMobile : !!form.residentId);

  const handleSubmit = () => {
    if (addingTenant) addTenantThenLease.mutate();
    else createLease.mutate(form.residentId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Lease" size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Flat / Room <span className="text-red-500">*</span></label>
          <select value={form.flatId} onChange={(e) => { set('flatId')(e.target.value); set('residentId')(''); }} className="input">
            <option value="">Select flat...</option>
            {flats.map((f: Flat) => <option key={f._id} value={f._id}>{(f.towerId as any)?.name ? `${(f.towerId as any).name} - ${f.flatNo}` : f.flatNo}</option>)}
          </select>
        </div>

        {form.flatId && !addingTenant && (
          <div>
            <label className="label">Tenant <span className="text-red-500">*</span></label>
            <select value={form.residentId} onChange={(e) => set('residentId')(e.target.value)} className="input">
              <option value="">Select existing tenant...</option>
              {tenants.map((t) => <option key={t._id} value={t._id}>{t.name} — {t.mobile}</option>)}
            </select>
            <button type="button" onClick={() => setAddingTenant(true)} className="text-xs text-primary-600 hover:underline mt-1">+ Add new tenant</button>
          </div>
        )}

        {form.flatId && addingTenant && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tenant Name <span className="text-red-500">*</span></label>
              <input value={form.newTenantName} onChange={(e) => set('newTenantName')(e.target.value)} className="input" placeholder="Full name" />
            </div>
            <div>
              <label className="label">Mobile <span className="text-red-500">*</span></label>
              <input value={form.newTenantMobile} onChange={(e) => set('newTenantMobile')(e.target.value)} className="input" placeholder="10-digit mobile" />
            </div>
            <button type="button" onClick={() => setAddingTenant(false)} className="text-xs text-slate-500 hover:underline col-span-2 text-left">Use existing tenant instead</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly Rent (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={form.rentAmount} onChange={(e) => set('rentAmount')(e.target.value)} className="input" min={0} />
          </div>
          <div>
            <label className="label">Security Deposit (₹)</label>
            <input type="number" value={form.depositAmount} onChange={(e) => set('depositAmount')(e.target.value)} className="input" min={0} />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => set('startDate')(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">End Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.endDate} onChange={(e) => set('endDate')(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Rent Due Day of Month</label>
            <input type="number" value={form.billingDay} onChange={(e) => set('billingDay')(e.target.value)} className="input" min={1} max={28} />
          </div>
          <div>
            <label className="label">Notice Period (days)</label>
            <input type="number" value={form.noticePeriodDays} onChange={(e) => set('noticePeriodDays')(e.target.value)} className="input" min={0} />
          </div>
        </div>

        <div>
          <label className="label">Remarks</label>
          <textarea value={form.remarks} onChange={(e) => set('remarks')(e.target.value)} className="input resize-none" rows={2} placeholder="Optional notes about this tenancy..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="btn-primary flex-1">
            {submitting ? 'Creating...' : 'Create Lease'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
