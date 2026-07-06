import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, ChevronLeft, Layers3, LayoutGrid, Users, Puzzle, Cpu, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const STEPS = [
  { id: 1, title: 'Society Details', icon: CheckCircle2, desc: 'Verify basic information' },
  { id: 2, title: 'Towers & Blocks', icon: Layers3, desc: 'Set up building structure' },
  { id: 3, title: 'Flats Setup', icon: LayoutGrid, desc: 'Generate flat numbers' },
  { id: 4, title: 'Admin Users', icon: Users, desc: 'Create society admins' },
  { id: 5, title: 'Modules', icon: Puzzle, desc: 'Enable required modules' },
  { id: 6, title: 'Devices', icon: Cpu, desc: 'Map IoT devices (optional)' },
  { id: 7, title: 'Review', icon: Eye, desc: 'Final review and finish' },
];

export function OnboardingWizard() {
  const { id: societyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [towerConfig, setTowerConfig] = useState({ count: 1, prefix: 'Tower', floors: 10, flatsPerFloor: 4 });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const labels = ['A','B','C','D','E','F','G','H'];
      for (let i = 0; i < towerConfig.count; i++) {
        const label = labels[i];
        const towerRes = await api.post('/towers', { societyId, name: `${towerConfig.prefix} ${label}`, numberOfFloors: towerConfig.floors });
        const tower = towerRes.data.data;
        await api.post('/floors/generate', { societyId, towerId: tower._id, count: towerConfig.floors });
        const floorsRes = await api.get(`/floors/tower/${tower._id}`);
        for (const floor of floorsRes.data.data) {
          await api.post('/flats/generate', { societyId, towerId: tower._id, floorId: floor._id, floorNumber: floor.floorNumber, towerCode: label, flatsPerFloor: towerConfig.flatsPerFloor });
        }
      }
    },
    onSuccess: () => toast.success('Structure generated!'),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/societies/${societyId}`, { status: 'ACTIVE', onboardingComplete: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['societies'] });
      toast.success('Onboarding complete! Society is now active.');
      navigate('/societies');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Society Onboarding" subtitle="Set up your society step by step" />

      {/* Steps Progress */}
      <div className="card p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setCurrentStep(step.id)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all', currentStep === step.id ? 'bg-primary-600 text-white' : currentStep > step.id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500')}>
                {currentStep > step.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">{step.id}</span>}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="card p-6 min-h-[300px]">
        {currentStep === 1 && (
          <div>
            <h3 className="section-title mb-2">Society Details Verified</h3>
            <p className="text-slate-500 text-sm mb-4">Your society basic details have been saved. Review and proceed.</p>
            <div className="p-4 bg-emerald-50 rounded-xl flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Society information is complete</span>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="section-title">Configure Towers & Blocks</h3>
            <p className="text-slate-500 text-sm">Generate the building structure automatically</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Number of Towers</label>
                <input type="number" min={1} max={12} value={towerConfig.count} onChange={(e) => setTowerConfig((t) => ({ ...t, count: +e.target.value }))} className="input" /></div>
              <div><label className="label">Tower Prefix</label>
                <input type="text" value={towerConfig.prefix} onChange={(e) => setTowerConfig((t) => ({ ...t, prefix: e.target.value }))} className="input" /></div>
              <div><label className="label">Floors per Tower</label>
                <input type="number" min={1} max={50} value={towerConfig.floors} onChange={(e) => setTowerConfig((t) => ({ ...t, floors: +e.target.value }))} className="input" /></div>
              <div><label className="label">Flats per Floor</label>
                <input type="number" min={1} max={20} value={towerConfig.flatsPerFloor} onChange={(e) => setTowerConfig((t) => ({ ...t, flatsPerFloor: +e.target.value }))} className="input" /></div>
            </div>
            <div className="p-4 bg-primary-50 rounded-xl text-sm text-primary-700">
              This will generate {towerConfig.count} tower(s) × {towerConfig.floors} floors × {towerConfig.flatsPerFloor} flats = <strong>{towerConfig.count * towerConfig.floors * towerConfig.flatsPerFloor} flats total</strong>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h3 className="section-title mb-2">Generate Flats</h3>
            <p className="text-slate-500 text-sm mb-4">Flats will be auto-generated based on your tower configuration (e.g., A-101, A-102...)</p>
            <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary">
              {generateMutation.isPending ? 'Generating...' : 'Generate Structure Now'}
            </button>
            {generateMutation.isSuccess && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Structure generated successfully!
              </div>
            )}
          </div>
        )}

        {currentStep >= 4 && currentStep <= 6 && (
          <div>
            <h3 className="section-title mb-2">{STEPS[currentStep - 1].title}</h3>
            <p className="text-slate-500 text-sm">This can be configured after onboarding from the respective management pages.</p>
            <div className="mt-4 p-4 bg-blue-50 rounded-xl text-blue-700 text-sm">Proceed to next step — you can always come back to configure this later.</div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="section-title">Review & Complete</h3>
            <p className="text-slate-500 text-sm">Your society is ready to go live. Click finish to activate it.</p>
            <div className="space-y-2">
              {STEPS.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">{s.title}</span>
                  <span className="badge badge-green ml-auto">Done</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button disabled={currentStep <= 1} onClick={() => setCurrentStep((s) => s - 1)} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {currentStep < 7 ? (
          <button onClick={() => setCurrentStep((s) => s + 1)} className="btn-primary flex items-center gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="btn-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {completeMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
          </button>
        )}
      </div>
    </div>
  );
}
