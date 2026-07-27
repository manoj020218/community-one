import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SamaPage } from '../src/modules/sama/SamaPage';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useSocietyStore } from '../src/store/societyStore';

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}>{ui}</QueryClientProvider></MemoryRouter>);
}

function setUser(permissions: string[]) {
  useAuthStore.setState({
    user: { _id: 'u1', name: 'SAMA User', email: 'sama@test.com', mobile: '9000000000', roleCode: 'TEST_ROLE', permissions } as any,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: true,
  });
}

describe('SamaPage', () => {
  beforeEach(() => {
    useSocietyStore.setState({ currentSociety: { _id: 'soc-1' } as any });
    vi.restoreAllMocks();
  });

  it('shows the module-disabled state when SAMA is not enabled', async () => {
    setUser(['module.read', 'sama.view_society']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'SAMA', name: 'Staff, Attendance & Access', isEnabled: false }] } } as any);
    renderWithClient(<SamaPage />);
    expect(await screen.findByText('Module not enabled')).toBeInTheDocument();
  });

  it('shows the enabled shell when SAMA is enabled', async () => {
    setUser(['module.read', 'sama.view_society']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'SAMA', name: 'Staff, Attendance & Access', isEnabled: true }] } } as any);
    renderWithClient(<SamaPage />);
    expect(await screen.findByText('Staff, Attendance & Access')).toBeInTheDocument();
  });

  it('shows a permission state when the user lacks SAMA permissions', async () => {
    setUser(['module.read']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'SAMA', name: 'Staff, Attendance & Access', isEnabled: true }] } } as any);
    renderWithClient(<SamaPage />);
    expect(await screen.findByText('SAMA access unavailable')).toBeInTheDocument();
  });

  it('only shows admin tabs to a user with sama.configure and sama.manage_service_pool', async () => {
    setUser(['module.read', 'sama.configure', 'sama.manage_service_pool']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'SAMA', name: 'Staff, Attendance & Access', isEnabled: true }] } } as any);
    renderWithClient(<SamaPage />);
    await screen.findByText('Staff, Attendance & Access');
    expect(screen.getByText('Bridge & Sync')).toBeInTheDocument();
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.queryByText('My Household')).not.toBeInTheDocument();
  });

  it('only shows the resident tab to a user with sama.view_self', async () => {
    setUser(['module.read', 'sama.view_self']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'SAMA', name: 'Staff, Attendance & Access', isEnabled: true }] } } as any);
    renderWithClient(<SamaPage />);
    await screen.findByText('Staff, Attendance & Access');
    expect(screen.getByText('My Household')).toBeInTheDocument();
    expect(screen.queryByText('Bridge & Sync')).not.toBeInTheDocument();
    expect(screen.queryByText('Providers')).not.toBeInTheDocument();
  });
});
