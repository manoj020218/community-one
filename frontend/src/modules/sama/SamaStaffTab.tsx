import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Briefcase, CheckCircle2, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import {
  LIFECYCLE_STATUS_BADGE, PaginatedResult, SAMA_ACCESS_STATUSES, SAMA_EMPLOYER_TYPES, SAMA_ENGAGEMENT_TYPES, SAMA_PAYMENT_RESPONSIBILITIES,
  SAMA_STAFF_TYPES, SAMA_VERIFICATION_STATUSES, StaffCategory, StaffProfile,
} from './sama.types';

const BLANK_STAFF = { firstName: '', lastName: '', displayName: '', mobile: '', email: '', staffType: 'SOCIETY_EMPLOYEE' as string, primaryCategory: '' };
const BLANK_ENGAGEMENT = {
  staffProfileId: '', engagementType: 'SOCIETY_PAYROLL' as string, employerType: 'SOCIETY' as string,
  employerFlatId: '', employerResidentId: '', jobTitle: '', startDate: new Date().toISOString().slice(0, 10), paymentResponsibility: 'SOCIETY' as string,
};

const accessBadge: Record<string, string> = { ACTIVE: 'badge-green', SUSPENDED: 'badge-yellow', BLOCKED: 'badge-red' };

export function SamaStaffTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState(BLANK_STAFF);
  const [engagementStaffId, setEngagementStaffId] = useState<string | null>(null);
  const [engagementForm, setEngagementForm] = useState(BLANK_ENGAGEMENT);
  const [reasonPrompt, setReasonPrompt] = useState<{ staffId: string; action: 'suspend' | 'terminate' } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sama-staff', societyId],
    queryFn: () => extractData<PaginatedResult<StaffProfile>>(api.get('/sama/staff-profiles', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: categories } = useQuery({
    queryKey: ['sama-categories', societyId],
    queryFn: () => extractData<PaginatedResult<StaffCategory>>(api.get('/sama/staff-categories', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const eligibleCategories = (categories?.items || []).filter((c) => c.isActive && (c.staffTypes as string[]).includes(staffForm.staffType));

  const { data: flats } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)),
    enabled: !!societyId && !!engagementStaffId && engagementForm.employerType === 'HOUSEHOLD',
  });

  const { data: residents } = useQuery({
    queryKey: ['residents-list', societyId],
    queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?limit=200`)),
    enabled: !!societyId && !!engagementStaffId && engagementForm.employerType === 'HOUSEHOLD',
  });

  const createStaffMutation = useMutation({
    mutationFn: () => api.post('/sama/staff-profiles', { societyId, ...staffForm }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-staff'] });
      setShowStaffModal(false);
      setStaffForm(BLANK_STAFF);
      toast.success('Staff profile created!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { staffId: string; field: 'accessStatus' | 'verificationStatus'; value: string }) =>
      api.patch(`/sama/staff-profiles/${vars.staffId}`, { societyId, [vars.field]: vars.value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-staff'] }); toast.success('Staff updated'); },
  });

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ['sama-staff'] });

  const approveMutation = useMutation({
    mutationFn: (staffId: string) => api.post(`/sama/staff-profiles/${staffId}/approve`, { societyId }),
    onSuccess: () => { invalidateStaff(); toast.success('Staff approved'); },
  });

  const reinstateMutation = useMutation({
    mutationFn: (staffId: string) => api.post(`/sama/staff-profiles/${staffId}/reinstate`, { societyId }),
    onSuccess: () => { invalidateStaff(); toast.success('Staff reinstated'); },
  });

  const reasonMutation = useMutation({
    mutationFn: () => {
      if (!reasonPrompt) throw new Error('No staff selected');
      return api.post(`/sama/staff-profiles/${reasonPrompt.staffId}/${reasonPrompt.action}`, { societyId, reason });
    },
    onSuccess: () => { invalidateStaff(); setReasonPrompt(null); setReason(''); toast.success('Staff updated'); },
  });

  const createEngagementMutation = useMutation({
    mutationFn: () => api.post('/sama/engagements', {
      societyId,
      staffProfileId: engagementStaffId,
      engagementType: engagementForm.engagementType,
      employerType: engagementForm.employerType,
      employerFlatId: engagementForm.employerType === 'HOUSEHOLD' ? engagementForm.employerFlatId : undefined,
      employerResidentId: engagementForm.employerType === 'HOUSEHOLD' ? engagementForm.employerResidentId : undefined,
      jobTitle: engagementForm.jobTitle || undefined,
      startDate: engagementForm.startDate,
      paymentResponsibility: engagementForm.paymentResponsibility,
    }),
    onSuccess: () => {
      setEngagementStaffId(null);
      setEngagementForm(BLANK_ENGAGEMENT);
      toast.success('Engagement created!');
    },
  });

  const setStaff = (k: keyof typeof BLANK_STAFF) => (v: string) => setStaffForm((f) => ({ ...f, [k]: v }));
  const setEngagement = (k: keyof typeof BLANK_ENGAGEMENT) => (v: string) => setEngagementForm((f) => ({ ...f, [k]: v }));

  const flatResidents = residents?.items?.filter((r: any) => r.flatId === engagementForm.employerFlatId || r.flatId?._id === engagementForm.employerFlatId) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowStaffModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.items?.length ? (
        <EmptyState icon={Users} title="No staff registered" description="Register guards, gardeners, household help and other staff to track access and engagements."
          action={<button onClick={() => setShowStaffModal(true)} className="btn-primary">Add Staff</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Code</th>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Type</th>
              <th className="table-header text-left">Mobile</th>
              <th className="table-header text-left">Access</th>
              <th className="table-header text-left">Verification</th>
              <th className="table-header text-left">Lifecycle</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.items.map((staff) => (
                <tr key={staff._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{staff.staffCode}</td>
                  <td className="table-cell font-medium text-slate-800">{staff.displayName}</td>
                  <td className="table-cell text-xs text-slate-500">{staff.staffType.replace(/_/g, ' ')}</td>
                  <td className="table-cell text-xs text-slate-600">{staff.mobile}</td>
                  <td className="table-cell">
                    <select value={staff.accessStatus} onChange={(e) => updateStatusMutation.mutate({ staffId: staff._id, field: 'accessStatus', value: e.target.value })} className={cn('badge border-0 text-xs', accessBadge[staff.accessStatus])}>
                      {SAMA_ACCESS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="table-cell">
                    <select value={staff.verificationStatus} onChange={(e) => updateStatusMutation.mutate({ staffId: staff._id, field: 'verificationStatus', value: e.target.value })} className="input py-1 text-xs w-auto">
                      {SAMA_VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="table-cell"><span className={cn('badge', LIFECYCLE_STATUS_BADGE[staff.lifecycleStatus])}>{staff.lifecycleStatus}</span></td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setEngagementStaffId(staff._id)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium">
                        <Briefcase className="w-3.5 h-3.5" /> Engage
                      </button>
                      {staff.verificationStatus === 'PENDING' && (
                        <button onClick={() => approveMutation.mutate(staff._id)} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs font-medium" title="Approve">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {staff.lifecycleStatus === 'ACTIVE' && (
                        <button onClick={() => setReasonPrompt({ staffId: staff._id, action: 'suspend' })} className="text-amber-600 hover:text-amber-700" title="Suspend">
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}
                      {staff.lifecycleStatus === 'SUSPENDED' && (
                        <button onClick={() => reinstateMutation.mutate(staff._id)} className="text-emerald-600 hover:text-emerald-700" title="Reinstate">
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                      {staff.lifecycleStatus !== 'TERMINATED' && (
                        <button onClick={() => setReasonPrompt({ staffId: staff._id, action: 'terminate' })} className="text-red-600 hover:text-red-700" title="Terminate">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} title="Add Staff">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name <span className="text-red-500">*</span></label>
              <input value={staffForm.firstName} onChange={(e) => setStaff('firstName')(e.target.value)} className="input" /></div>
            <div><label className="label">Last Name</label>
              <input value={staffForm.lastName} onChange={(e) => setStaff('lastName')(e.target.value)} className="input" /></div>
          </div>
          <div><label className="label">Display Name <span className="text-red-500">*</span></label>
            <input value={staffForm.displayName} onChange={(e) => setStaff('displayName')(e.target.value)} className="input" placeholder="Ramesh (Guard)" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Mobile <span className="text-red-500">*</span></label>
              <input value={staffForm.mobile} onChange={(e) => setStaff('mobile')(e.target.value)} className="input" /></div>
            <div><label className="label">Email</label>
              <input type="email" value={staffForm.email} onChange={(e) => setStaff('email')(e.target.value)} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Staff Type</label>
              <select
                value={staffForm.staffType}
                onChange={(e) => setStaffForm((f) => ({ ...f, staffType: e.target.value, primaryCategory: '' }))}
                className="input"
              >
                {SAMA_STAFF_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="label">Primary Category</label>
              <select value={staffForm.primaryCategory} onChange={(e) => setStaff('primaryCategory')(e.target.value)} className="input" disabled={!eligibleCategories.length}>
                <option value="">{eligibleCategories.length ? 'Select category...' : 'No categories for this staff type'}</option>
                {eligibleCategories.map((c) => <option key={c._id} value={c.code}>{c.name}</option>)}
              </select>
              {!eligibleCategories.length && (
                <p className="text-xs text-slate-500 mt-1">
                  Add a category for {staffForm.staffType.replace(/_/g, ' ').toLowerCase()} under the Categories tab, or leave blank.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createStaffMutation.mutate()} disabled={createStaffMutation.isPending || !staffForm.firstName || !staffForm.displayName || !staffForm.mobile} className="btn-primary flex-1">
              {createStaffMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowStaffModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!engagementStaffId} onClose={() => setEngagementStaffId(null)} title="Add Engagement">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Engagement Type</label>
              <select value={engagementForm.engagementType} onChange={(e) => setEngagement('engagementType')(e.target.value)} className="input">
                {SAMA_ENGAGEMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="label">Employer Type</label>
              <select value={engagementForm.employerType} onChange={(e) => setEngagement('employerType')(e.target.value)} className="input">
                {SAMA_EMPLOYER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select></div>
          </div>
          {engagementForm.employerType === 'HOUSEHOLD' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Flat <span className="text-red-500">*</span></label>
                <select value={engagementForm.employerFlatId} onChange={(e) => { setEngagement('employerFlatId')(e.target.value); setEngagement('employerResidentId')(''); }} className="input">
                  <option value="">Select flat...</option>
                  {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.flatNo}</option>)}
                </select></div>
              <div><label className="label">Resident <span className="text-red-500">*</span></label>
                <select value={engagementForm.employerResidentId} onChange={(e) => setEngagement('employerResidentId')(e.target.value)} className="input" disabled={!engagementForm.employerFlatId}>
                  <option value="">Select resident...</option>
                  {flatResidents.map((r: any) => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Job Title</label>
              <input value={engagementForm.jobTitle} onChange={(e) => setEngagement('jobTitle')(e.target.value)} className="input" /></div>
            <div><label className="label">Start Date</label>
              <input type="date" value={engagementForm.startDate} onChange={(e) => setEngagement('startDate')(e.target.value)} className="input" /></div>
          </div>
          <div><label className="label">Payment Responsibility</label>
            <select value={engagementForm.paymentResponsibility} onChange={(e) => setEngagement('paymentResponsibility')(e.target.value)} className="input">
              {SAMA_PAYMENT_RESPONSIBILITIES.map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => createEngagementMutation.mutate()}
              disabled={createEngagementMutation.isPending || (engagementForm.employerType === 'HOUSEHOLD' && (!engagementForm.employerFlatId || !engagementForm.employerResidentId))}
              className="btn-primary flex-1"
            >
              {createEngagementMutation.isPending ? 'Creating...' : 'Create Engagement'}
            </button>
            <button onClick={() => setEngagementStaffId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!reasonPrompt} onClose={() => { setReasonPrompt(null); setReason(''); }} title={reasonPrompt?.action === 'suspend' ? 'Suspend Staff' : 'Terminate Staff'}>
        <div className="space-y-4">
          <div><label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none" rows={3} placeholder="Required" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => reasonMutation.mutate()} disabled={reasonMutation.isPending || !reason.trim()} className="btn-danger flex-1">
              {reasonMutation.isPending ? 'Submitting...' : 'Confirm'}
            </button>
            <button onClick={() => { setReasonPrompt(null); setReason(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
