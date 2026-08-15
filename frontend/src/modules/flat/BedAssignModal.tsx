import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserCheck } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Resident } from '../../types';
import toast from 'react-hot-toast';

interface BedAssignModalProps {
  bedId: string | null;
  bedNumber?: string;
  flatId: string;
  onClose: () => void;
}

export function BedAssignModal({ bedId, bedNumber, flatId, onClose }: BedAssignModalProps) {
  const queryClient = useQueryClient();
  const [residentId, setResidentId] = useState('');

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents', 'flat', flatId],
    queryFn: () => extractData<Resident[]>(api.get(`/residents/flat/${flatId}`)),
    enabled: !!bedId,
  });

  const assignMutation = useMutation({
    mutationFn: () => api.post(`/beds/${bedId}/assign`, { residentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', 'flat', flatId] });
      toast.success('Bed assigned!');
      setResidentId('');
      onClose();
    },
  });

  return (
    <Modal isOpen={!!bedId} onClose={onClose} title={`Assign Bed ${bedNumber || ''}`}>
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading residents...</p>
        ) : residents.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No residents found in this room yet. Add a resident to this room first.</p>
        ) : (
          <div>
            <label className="label">Resident</label>
            <select value={residentId} onChange={(e) => setResidentId(e.target.value)} className="input">
              <option value="">Select resident...</option>
              {residents.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || !residentId}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {assignMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</> : <><UserCheck className="w-4 h-4" /> Assign</>}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
