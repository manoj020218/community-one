import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { McrPage } from '../src/modules/mcr/McrPage';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useSocietyStore } from '../src/store/societyStore';

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}>{ui}</QueryClientProvider></MemoryRouter>);
}

function setUser(permissions: string[]) {
  useAuthStore.setState({
    user: { _id: 'u1', name: 'MCR User', email: 'mcr@test.com', mobile: '9000000000', roleCode: 'TEST_ROLE', permissions } as any,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: true,
  });
}

describe('McrPage', () => {
  beforeEach(() => {
    useSocietyStore.setState({ currentSociety: { _id: 'soc-1' } as any });
    vi.restoreAllMocks();
  });

  it('shows the module-disabled state when MCR is not enabled', async () => {
    setUser(['module.read', 'mcr.view_all']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'MCR', name: 'Maintenance & Receipts', isEnabled: false }] } } as any);
    renderWithClient(<McrPage />);
    expect(await screen.findByText('Module not enabled')).toBeInTheDocument();
  });

  it('shows the enabled shell when MCR is enabled', async () => {
    setUser(['module.read', 'mcr.view_all']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'MCR', name: 'Maintenance & Receipts', isEnabled: true }] } } as any);
    renderWithClient(<McrPage />);
    expect(await screen.findByText('Maintenance & Receipts')).toBeInTheDocument();
  });

  it('shows a permission state when the user lacks MCR permissions', async () => {
    setUser(['module.read']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'MCR', name: 'Maintenance & Receipts', isEnabled: true }] } } as any);
    renderWithClient(<McrPage />);
    expect(await screen.findByText('MCR access unavailable')).toBeInTheDocument();
  });

  it('only shows admin-configuration tabs to a user with mcr.configure', async () => {
    setUser(['module.read', 'mcr.configure']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'MCR', name: 'Maintenance & Receipts', isEnabled: true }] } } as any);
    renderWithClient(<McrPage />);
    await screen.findByText('Maintenance & Receipts');
    expect(screen.getByText('Charge Heads')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('My Maintenance')).not.toBeInTheDocument();
  });

  it('only shows the resident tab to a user with mcr.view_self', async () => {
    setUser(['module.read', 'mcr.view_self']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [{ code: 'MCR', name: 'Maintenance & Receipts', isEnabled: true }] } } as any);
    renderWithClient(<McrPage />);
    await screen.findByText('Maintenance & Receipts');
    expect(screen.getByText('My Maintenance')).toBeInTheDocument();
    expect(screen.queryByText('Charge Heads')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});
