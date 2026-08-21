import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Car, Cat, Layers3, CreditCard, Bell, Puzzle, ArrowRight, Plus, AlertCircle, UserCheck, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { WhatsAppStatus } from '../settings/communicationTypes';

export function SocietyAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId;
  const queryClient = useQueryClient();
  const [showWaModal, setShowWaModal] = useState(false);

  const { data: flatStats } = useQuery({
    queryKey: ['flat-stats', societyId],
    queryFn: () => societyId ? extractData(api.get(`/flats/society/${societyId}/stats`)) : null,
    enabled: !!societyId,
  });

  const { data: residents } = useQuery({
    queryKey: ['residents', societyId, 'count'],
    queryFn: () => societyId ? extractData<any>(api.get(`/residents/society/${societyId}?limit=1`)) : null,
    enabled: !!societyId,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', societyId, 'count'],
    queryFn: () => societyId ? extractData<any>(api.get(`/vehicles/society/${societyId}?limit=1`)) : null,
    enabled: !!societyId,
  });

  const { data: modules } = useQuery({
    queryKey: ['modules', societyId],
    queryFn: () => societyId ? extractData<any[]>(api.get(`/modules/society/${societyId}`)) : [],
    enabled: !!societyId,
  });

  // The WhatsApp session (used for reminders/receipts) tends to get logged out on its own —
  // surfaced here so a disconnect is noticed on the dashboard instead of silently breaking
  // outbound messages, with a one-click way to reconnect right from this card.
  const { data: waStatus } = useQuery({
    queryKey: ['whatsapp-status', societyId],
    queryFn: () => extractData<WhatsAppStatus>(api.get('/communication/whatsapp/status', { params: { societyId } })),
    enabled: !!societyId,
    refetchInterval: (query) => (query.state.data?.status === 'CONNECTING' ? 3000 : 60000),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post('/communication/whatsapp/connect', { societyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  });

  if (!societyId) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">No Society Assigned</h2>
        <p className="text-slate-500 text-sm mb-4">You haven't been assigned to a society yet. Contact your Jenix Super Admin.</p>
      </div>
    );
  }

  const totalFlats = Object.values(flatStats || {}).reduce((a: any, b: any) => a + b, 0) as number;
  const enabledModules = modules?.filter((m: any) => m.isEnabled) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 overflow-hidden">
        <div className="relative">
          <p className="text-emerald-200 text-sm font-medium mb-1">{currentSociety?.name || 'Society Admin'}</p>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-emerald-100 text-sm">Manage your society from one place</p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => navigate('/residents')} className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-colors">
              <Plus className="w-4 h-4" /> Add Resident
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Flats" value={totalFlats} icon={Layers3} color="indigo" />
        <StatCard title="Residents" value={residents?.total || 0} icon={Users} color="green" />
        <StatCard title="Vehicles" value={vehicles?.total || 0} icon={Car} color="amber" />
        <StatCard title="Active Modules" value={enabledModules.length} icon={Puzzle} color="purple" />
        <button
          onClick={() => waStatus?.status !== 'CONNECTED' && setShowWaModal(true)}
          className={cn(
            'card p-5 text-left transition-all duration-200',
            waStatus?.status === 'CONNECTED' ? 'cursor-default' : 'hover:shadow-card-hover cursor-pointer'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">WhatsApp</p>
              <p className={cn('text-lg font-bold mt-1', waStatus?.status === 'CONNECTED' ? 'text-emerald-600' : 'text-red-600')}>
                {waStatus?.status === 'CONNECTED' ? 'Connected' : waStatus?.status === 'CONNECTING' ? 'Connecting…' : 'Disconnected'}
              </p>
              {waStatus?.status !== 'CONNECTED' && <p className="text-xs text-primary-600 font-medium mt-1">Tap to reconnect</p>}
            </div>
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', waStatus?.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>
        </button>
      </div>

      {/* Modules Grid */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="section-title">Enabled Modules</h3>
          <button onClick={() => navigate('/modules')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules?.filter((m: any) => m.isEnabled).map((m: any) => (
            <div key={m.code} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-100">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-primary-700 text-center leading-tight">{m.name}</span>
            </div>
          ))}
          {enabledModules.length === 0 && (
            <div className="col-span-full text-center text-slate-500 text-sm py-4">No modules enabled yet</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Residents', to: '/residents', color: 'text-emerald-600 bg-emerald-50' },
          { icon: Car, label: 'Vehicles', to: '/vehicles', color: 'text-amber-600 bg-amber-50' },
          { icon: Cat, label: 'Pets', to: '/pets', color: 'text-pink-600 bg-pink-50' },
          { icon: UserCheck, label: 'Visitors', to: '/visitor', color: 'text-cyan-600 bg-cyan-50' },
          { icon: CreditCard, label: 'Payments', to: '/payments', color: 'text-blue-600 bg-blue-50' },
          { icon: Bell, label: 'Notifications', to: '/notifications', color: 'text-purple-600 bg-purple-50' },
          { icon: Building2, label: 'Devices', to: '/devices', color: 'text-slate-600 bg-slate-50' },
        ].map((a) => (
          <button key={a.to} onClick={() => navigate(a.to)}
            className="card p-5 flex flex-col items-center gap-3 hover:shadow-card-hover hover:border-primary-200 transition-all border border-transparent">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.color}`}>
              <a.icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>

      <Modal isOpen={showWaModal} onClose={() => setShowWaModal(false)} title="Reconnect WhatsApp">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The linked number's WhatsApp session has disconnected — this usually happens on its own after a while.
            Reconnect the same way you'd link WhatsApp Web: scan the QR with that phone's WhatsApp app.
          </p>

          {waStatus?.status === 'CONNECTING' && waStatus.qrDataUrl && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <img src={waStatus.qrDataUrl} alt="WhatsApp QR code" className="w-48 h-48" />
              <p className="text-xs text-slate-500 text-center">Open WhatsApp on the phone you want to link → Settings → Linked Devices → Link a Device, then scan this code.</p>
            </div>
          )}

          {(!waStatus || waStatus.status === 'DISCONNECTED') && (
            <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="btn-primary w-full">
              {connectMutation.isPending ? 'Starting…' : 'Connect WhatsApp'}
            </button>
          )}

          <button onClick={() => navigate('/settings')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Manage full communication settings <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </Modal>
    </div>
  );
}
