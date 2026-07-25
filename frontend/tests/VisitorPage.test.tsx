import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { VisitorPage } from '../src/modules/visitor/VisitorPage';
import { useAuthStore } from '../src/store/authStore';
import { useSocietyStore } from '../src/store/societyStore';
import { api } from '../src/services/api';

vi.mock('../src/modules/visitor/GuardVisitorView', () => ({ GuardVisitorView: () => <div>Guard View</div> }));
vi.mock('../src/modules/visitor/ResidentVisitorView', () => ({ ResidentVisitorView: () => <div>Resident View</div> }));
vi.mock('../src/modules/visitor/AdminVisitorView', () => ({ AdminVisitorView: () => <div>Admin View</div> }));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function setUser(permissions: string[]) {
  useAuthStore.setState({
    user: { _id: 'u1', name: 'Test', email: 't@test.com', mobile: '9000000000', roleCode: 'TEST_ROLE', permissions } as any,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: true,
  });
}

describe('VisitorPage role routing', () => {
  beforeEach(() => {
    useSocietyStore.setState({ currentSociety: { _id: 'soc-1' } as any });
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { activeContext: {}, permissions: [], enabledModules: ['VISITOR'], featureFlags: {} } },
    } as any);
  });

  it('renders the guard view for a user with visitor.request.create', async () => {
    setUser(['visitor.request.create']);
    renderWithClient(<VisitorPage />);
    expect(await screen.findByText('Guard View')).toBeInTheDocument();
  });

  it('renders the resident view for a user with visitor.request.respond_own_flat', async () => {
    setUser(['visitor.request.respond_own_flat']);
    renderWithClient(<VisitorPage />);
    expect(await screen.findByText('Resident View')).toBeInTheDocument();
  });

  it('renders the admin view for a user with visitor.report.view', async () => {
    setUser(['visitor.report.view']);
    renderWithClient(<VisitorPage />);
    expect(await screen.findByText('Admin View')).toBeInTheDocument();
  });

  it('shows a permission-denied state for a user with no visitor permissions', async () => {
    setUser([]);
    renderWithClient(<VisitorPage />);
    expect(await screen.findByText('Visitor access unavailable')).toBeInTheDocument();
  });
});
