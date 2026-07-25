import { useState } from 'react';
import { Loader2, Upload, Camera } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { VisitorGate, VisitorSettings } from './types';

interface VisitorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  societyId: string;
  flatNo: string;
  gates: VisitorGate[];
  settings: VisitorSettings;
  onSubmit: (payload: { flatId: string; gateId: string; visitorName: string; visitorMobile?: string; purpose?: string; vehicleNumber?: string; visitorPhotoFileId?: string }) => Promise<void>;
  flatId: string;
}

export function VisitorRequestModal(props: VisitorRequestModalProps) {
  const [gateId, setGateId] = useState(props.gates[0]?._id || '');
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [purpose, setPurpose] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return undefined;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('societyId', props.societyId);
      formData.append('moduleCode', 'VISITOR');
      formData.append('accessLevel', 'PRIVATE');
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data._id as string;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const visitorPhotoFileId = await uploadMutation.mutateAsync();
      await props.onSubmit({
        flatId: props.flatId,
        gateId: gateId || props.gates[0]?._id,
        visitorName,
        visitorMobile: visitorMobile || undefined,
        purpose: purpose || undefined,
        vehicleNumber: vehicleNumber || undefined,
        visitorPhotoFileId,
      });
    },
    onSuccess: () => {
      setVisitorName('');
      setVisitorMobile('');
      setPurpose('');
      setVehicleNumber('');
      setFile(null);
      props.onClose();
    },
  });

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Visitor Request · ${props.flatNo}`} size="lg">
      <div className="space-y-4">
        {props.gates.length > 1 && (
          <div>
            <label className="label">Gate</label>
            <select value={gateId} onChange={(event) => setGateId(event.target.value)} className="input">
              {props.gates.map((gate) => <option key={gate._id} value={gate._id}>{gate.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <VoiceInputField label="Visitor Name" value={visitorName} onChange={setVisitorName} placeholder="Enter visitor name" required />
          <VoiceInputField label="Mobile Number" value={visitorMobile} onChange={setVisitorMobile} placeholder="Enter mobile number" type="tel" required={props.settings.requireVisitorMobile} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <VoiceInputField label="Purpose" value={purpose} onChange={setPurpose} placeholder="Purpose of visit" required={props.settings.requirePurpose} />
          <div>
            <label className="label">Vehicle Number (optional)</label>
            <input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" className="input" />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Visitor Photo</p>
              <p className="text-xs text-slate-500">Camera-first on mobile, image upload fallback everywhere.</p>
            </div>
            <label className="btn-secondary cursor-pointer text-sm">
              <Upload className="h-4 w-4" />
              <span>{file ? 'Change Photo' : 'Add Photo'}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
          </div>
          {file && <p className="mt-3 text-xs text-emerald-700">{file.name}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn-primary flex-1 justify-center gap-2">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{submitMutation.isPending ? 'Sending Request...' : 'Send Visitor Request'}</span>
          </button>
          <button onClick={props.onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
