import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { VisitorSettings } from './types';
import { withSocietyQuery } from './visitorApi';

interface VisitorSettingsPanelProps {
  societyId: string;
}

/**
 * Shared visitor-module settings form — rendered both inline on the Admin
 * Visitor Monitoring view and as the "Visitor (VMS)" tab on the unified
 * Settings page, so the two never drift out of sync.
 */
export function VisitorSettingsPanel({ societyId }: VisitorSettingsPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = ['visitor-settings-panel', societyId];

  const { data: settings } = useQuery({
    queryKey,
    queryFn: () => extractData<VisitorSettings>(api.get(withSocietyQuery('/visitor/settings', societyId))),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<VisitorSettings>) => api.patch('/visitor/settings', { ...payload, societyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (!settings) return null;

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between text-sm text-slate-600">
        <span>Require photo</span>
        <input type="checkbox" checked={settings.requireVisitorPhoto} onChange={(event) => saveMutation.mutate({ requireVisitorPhoto: event.target.checked })} />
      </label>
      <label className="flex items-center justify-between text-sm text-slate-600">
        <span>Require purpose</span>
        <input type="checkbox" checked={settings.requirePurpose} onChange={(event) => saveMutation.mutate({ requirePurpose: event.target.checked })} />
      </label>
      <label className="flex items-center justify-between text-sm text-slate-600">
        <span>Guard cancellation</span>
        <input type="checkbox" checked={settings.allowGuardCancellation} onChange={(event) => saveMutation.mutate({ allowGuardCancellation: event.target.checked })} />
      </label>
      <label className="block text-sm text-slate-600">
        <span className="mb-2 block">Who confirms visitor exit?</span>
        <select
          value={settings.exitConfirmationMode}
          onChange={(event) => saveMutation.mutate({ exitConfirmationMode: event.target.value as VisitorSettings['exitConfirmationMode'] })}
          className="input"
        >
          <option value="AUTO">Auto (no manual exit step)</option>
          <option value="GUARD">Guard marks exit</option>
          <option value="RESIDENT">Household marks exit</option>
        </select>
      </label>
      <label className="flex items-center justify-between text-sm text-slate-600">
        <span>Auto-expire pending requests</span>
        <input type="checkbox" checked={settings.autoExpiryEnabled} onChange={(event) => saveMutation.mutate({ autoExpiryEnabled: event.target.checked })} />
      </label>
      <label className="block text-sm text-slate-600">
        <span className="mb-2 block">Approval expiry (minutes)</span>
        <input type="number" defaultValue={settings.defaultApprovalExpiryMinutes} className="input" onBlur={(event) => saveMutation.mutate({ defaultApprovalExpiryMinutes: Number(event.target.value) })} />
      </label>
    </div>
  );
}
