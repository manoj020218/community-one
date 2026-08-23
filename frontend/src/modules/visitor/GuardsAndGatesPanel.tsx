import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, Plus, Pencil, Ban, ShieldAlert, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { User, Tower } from '../../types';
import { AdminGate, GuardAssignment } from './types';
import { withSocietyQuery } from './visitorApi';

interface GuardsAndGatesPanelProps {
  societyId: string;
}

const ENTRY_TYPES: AdminGate['entryType'][] = ['ENTRY', 'EXIT', 'BOTH', 'SERVICE'];
const BLANK_GATE = { name: '', code: '', entryType: 'BOTH' as AdminGate['entryType'], towerIds: [] as string[] };
const BLANK_ASSIGNMENT = { gateIds: [] as string[], shiftStart: '', shiftEnd: '', validFrom: '', validUntil: '' };

export function GuardsAndGatesPanel({ societyId }: GuardsAndGatesPanelProps) {
  const queryClient = useQueryClient();

  const [showGateModal, setShowGateModal] = useState(false);
  const [gateForm, setGateForm] = useState(BLANK_GATE);
  const [editGateId, setEditGateId] = useState<string | null>(null);
  const [disableGateTarget, setDisableGateTarget] = useState<AdminGate | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignGuard, setAssignGuard] = useState<User | null>(null);
  const [assignForm, setAssignForm] = useState(BLANK_ASSIGNMENT);
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null);

  const { data: towers } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: gates } = useQuery({
    queryKey: ['visitor-gates', societyId],
    queryFn: () => extractData<AdminGate[]>(api.get(withSocietyQuery(`/gates/society/${societyId}`, societyId))),
    enabled: !!societyId,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list', societyId],
    queryFn: () => extractData<User[]>(api.get(`/users/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: assignments } = useQuery({
    queryKey: ['guard-assignments', societyId],
    queryFn: () => extractData<GuardAssignment[]>(api.get(withSocietyQuery('/guard-assignments/society/' + societyId, societyId))),
    enabled: !!societyId,
  });

  const guards = (users || []).filter((u) => u.roleCode === 'SECURITY_GUARD');
  const gateById = new Map((gates || []).map((g) => [g._id, g]));
  const assignmentsByGuard = new Map<string, GuardAssignment[]>();
  (assignments || []).forEach((a) => {
    const uid = typeof a.userId === 'string' ? a.userId : a.userId._id;
    assignmentsByGuard.set(uid, [...(assignmentsByGuard.get(uid) || []), a]);
  });

  const invalidateGates = () => queryClient.invalidateQueries({ queryKey: ['visitor-gates'] });
  const invalidateAssignments = () => queryClient.invalidateQueries({ queryKey: ['guard-assignments'] });

  const openAddGate = () => { setEditGateId(null); setGateForm(BLANK_GATE); setShowGateModal(true); };
  const openEditGate = (g: AdminGate) => {
    setEditGateId(g._id);
    setGateForm({ name: g.name, code: g.code, entryType: g.entryType, towerIds: g.towerIds.map((t) => t._id) });
    setShowGateModal(true);
  };

  const saveGateMutation = useMutation({
    mutationFn: () => {
      const payload = { societyId, name: gateForm.name, code: gateForm.code || undefined, entryType: gateForm.entryType, towerIds: gateForm.towerIds };
      return editGateId ? api.patch(`/gates/${editGateId}`, payload) : api.post('/gates', payload);
    },
    onSuccess: () => { invalidateGates(); setShowGateModal(false); toast.success(editGateId ? 'Gate updated' : 'Gate created'); },
  });

  const disableGateMutation = useMutation({
    mutationFn: () => api.patch(`/gates/${disableGateTarget!._id}/disable`, { societyId }),
    onSuccess: () => { invalidateGates(); invalidateAssignments(); setDisableGateTarget(null); toast.success('Gate disabled'); },
  });

  const toggleTower = (towerId: string) => {
    setGateForm((f) => ({ ...f, towerIds: f.towerIds.includes(towerId) ? f.towerIds.filter((t) => t !== towerId) : [...f.towerIds, towerId] }));
  };

  const openAssign = (guard: User) => {
    setAssignGuard(guard);
    const existing = (assignmentsByGuard.get(guard._id) || [])[0];
    if (existing) {
      setEditAssignmentId(existing._id);
      setAssignForm({
        gateIds: existing.gateIds.map((g) => g._id),
        shiftStart: existing.shiftStart || '',
        shiftEnd: existing.shiftEnd || '',
        validFrom: existing.validFrom?.slice(0, 10) || '',
        validUntil: existing.validUntil?.slice(0, 10) || '',
      });
    } else {
      setEditAssignmentId(null);
      setAssignForm(BLANK_ASSIGNMENT);
    }
    setShowAssignModal(true);
  };

  const toggleAssignGate = (gateId: string) => {
    setAssignForm((f) => ({ ...f, gateIds: f.gateIds.includes(gateId) ? f.gateIds.filter((g) => g !== gateId) : [...f.gateIds, gateId] }));
  };

  const saveAssignmentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        societyId,
        userId: assignGuard!._id,
        gateIds: assignForm.gateIds,
        shiftStart: assignForm.shiftStart || undefined,
        shiftEnd: assignForm.shiftEnd || undefined,
        validFrom: assignForm.validFrom || undefined,
        validUntil: assignForm.validUntil || undefined,
      };
      return editAssignmentId ? api.patch(`/guard-assignments/${editAssignmentId}`, payload) : api.post('/guard-assignments', payload);
    },
    onSuccess: () => { invalidateAssignments(); setShowAssignModal(false); toast.success('Guard assignment saved'); },
  });

  return (
    <div className="card p-5 space-y-6">
      {/* Gates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><DoorOpen className="w-4 h-4 text-slate-400" /> Gates</p>
          <button onClick={openAddGate} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
            <Plus className="w-3.5 h-3.5" /> Add Gate
          </button>
        </div>
        {!gates?.length ? (
          <p className="text-sm text-slate-400">No gates set up yet — add one to start assigning guards.</p>
        ) : (
          <div className="space-y-2">
            {gates.map((g) => (
              <div key={g._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{g.name}</span>
                    <span className="badge badge-gray text-[10px]">{g.code}</span>
                    <span className="badge badge-blue text-[10px]">{g.entryType}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {g.towerIds.length ? g.towerIds.map((t) => t.name).join(', ') : 'No blocks linked'}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEditGate(g)} title="Edit" className="p-1.5 rounded-lg text-slate-500 hover:bg-primary-50 hover:text-primary-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDisableGateTarget(g)} title="Disable" className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Ban className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guard roster */}
      <div>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><UserCog className="w-4 h-4 text-slate-400" /> Guard Roster</p>
        {!guards.length ? (
          <p className="text-sm text-slate-400">No security guard accounts yet — create one from Users to see them here.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {guards.map((guard) => {
              const guardAssignments = assignmentsByGuard.get(guard._id) || [];
              const allGateIds = [...new Set(guardAssignments.flatMap((a) => a.gateIds.map((g) => g._id)))];
              return (
                <div key={guard._id} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{guard.name}</p>
                      <p className="text-xs text-slate-500 truncate">{guard.mobile}</p>
                    </div>
                    <button onClick={() => openAssign(guard)} className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                      {allGateIds.length ? 'Edit' : 'Assign Gates'}
                    </button>
                  </div>
                  {!allGateIds.length ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" /> Not assigned to any gate — won't see any visitors
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allGateIds.map((gid) => {
                        const gate = gateById.get(gid);
                        if (!gate) return null;
                        return (
                          <span key={gid} className="badge badge-blue text-[11px]" title={gate.towerIds.map((t) => t.name).join(', ') || 'No blocks linked'}>
                            {gate.name}{gate.towerIds.length ? ` (${gate.towerIds.map((t) => t.name).join(', ')})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Gate Modal */}
      <Modal isOpen={showGateModal} onClose={() => setShowGateModal(false)} title={editGateId ? 'Edit Gate' : 'Add Gate'}>
        <div className="space-y-4">
          <div><label className="label">Gate Name <span className="text-red-500">*</span></label>
            <input value={gateForm.name} onChange={(e) => setGateForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Main Gate" /></div>
          <div><label className="label">Code <span className="text-slate-400 font-normal">(optional — auto-generated if left blank)</span></label>
            <input value={gateForm.code} onChange={(e) => setGateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="input" placeholder="MAIN" /></div>
          <div><label className="label">Entry Type</label>
            <select value={gateForm.entryType} onChange={(e) => setGateForm((f) => ({ ...f, entryType: e.target.value as AdminGate['entryType'] }))} className="input">
              {ENTRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div>
            <label className="label">Blocks / Towers covered by this gate</label>
            <div className="border border-slate-100 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
              {(towers || []).map((t) => (
                <label key={t._id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={gateForm.towerIds.includes(t._id)} onChange={() => toggleTower(t._id)} className="w-4 h-4 text-primary-600 rounded" />
                  {t.name}
                </label>
              ))}
              {!towers?.length && <p className="text-xs text-slate-400 px-2 py-1">No blocks set up yet.</p>}
            </div>
            <p className="mt-1 text-xs text-slate-400">A gate can cover one block, or several if it serves multiple blocks.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveGateMutation.mutate()} disabled={saveGateMutation.isPending || !gateForm.name} className="btn-primary flex-1">
              {saveGateMutation.isPending ? 'Saving...' : editGateId ? 'Save Changes' : 'Create Gate'}
            </button>
            <button onClick={() => setShowGateModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!disableGateTarget}
        title={`Disable ${disableGateTarget?.name}?`}
        message="Guards currently assigned only to this gate will stop seeing any visitor requests until reassigned."
        confirmLabel="Disable Gate"
        isPending={disableGateMutation.isPending}
        onConfirm={() => disableGateMutation.mutate()}
        onCancel={() => setDisableGateTarget(null)}
      />

      {/* Assign Guard Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Gates — ${assignGuard?.name || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Gates <span className="text-red-500">*</span></label>
            <div className="border border-slate-100 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
              {(gates || []).map((g) => (
                <label key={g._id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={assignForm.gateIds.includes(g._id)} onChange={() => toggleAssignGate(g._id)} className="w-4 h-4 text-primary-600 rounded" />
                  <span>{g.name} <span className="text-xs text-slate-400">{g.towerIds.length ? `— ${g.towerIds.map((t) => t.name).join(', ')}` : ''}</span></span>
                </label>
              ))}
              {!gates?.length && <p className="text-xs text-slate-400 px-2 py-1">No gates set up yet — add one above first.</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Shift Start <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="time" value={assignForm.shiftStart} onChange={(e) => setAssignForm((f) => ({ ...f, shiftStart: e.target.value }))} className="input" /></div>
            <div><label className="label">Shift End <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="time" value={assignForm.shiftEnd} onChange={(e) => setAssignForm((f) => ({ ...f, shiftEnd: e.target.value }))} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Valid From <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="date" value={assignForm.validFrom} onChange={(e) => setAssignForm((f) => ({ ...f, validFrom: e.target.value }))} className="input" /></div>
            <div><label className="label">Valid Until <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="date" value={assignForm.validUntil} onChange={(e) => setAssignForm((f) => ({ ...f, validUntil: e.target.value }))} className="input" /></div>
          </div>
          <p className="text-xs text-slate-400">Leave shift/validity blank for an always-on, no-expiry assignment.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveAssignmentMutation.mutate()} disabled={saveAssignmentMutation.isPending || !assignForm.gateIds.length} className="btn-primary flex-1">
              {saveAssignmentMutation.isPending ? 'Saving...' : 'Save Assignment'}
            </button>
            <button onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
