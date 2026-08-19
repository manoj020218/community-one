import { Home, Building2, Layers3, LayoutGrid, Users, Car, Cat, Shield, UserCog, Puzzle, Bell, ClipboardList, FolderOpen, BarChart3, Cpu, UserCheck, Banknote, Settings, FileText, KeyRound, Link2, Megaphone } from 'lucide-react';
import { MCR_ROUTE_PERMISSIONS } from '../../modules/mcr/mcr.permissions';
import { SAMA_ROUTE_PERMISSIONS } from '../../modules/sama/sama.permissions';
import { LEASE_ROUTE_PERMISSIONS } from '../../modules/lease/lease.permissions';
import { ACCESS_CONTROL_ROUTE_PERMISSIONS } from '../../modules/access-control/access-control.permissions';

export type NavItem = {
  to: string;
  icon: any;
  label: string;
  roles: string[];
  permissions?: string[];
  moduleCode?: string;
};

type GroupColor = {
  text: string;
  dot: string;
  activeBg: string;
  activeText: string;
  activeDot: string;
};

export type NavGroup = {
  id: string;
  label: string;
  color: GroupColor;
  items: NavItem[];
};

// Payments/Receipts (legacy) are intentionally omitted from navigation — MCR is the
// current source of truth for maintenance billing. Their routes/backend stay live
// since report.service.ts still reads from them.
export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    color: { text: 'text-primary-600', dot: 'bg-primary-500', activeBg: 'bg-primary-50', activeText: 'text-primary-700', activeDot: 'bg-primary-500' },
    items: [
      { to: '/dashboard', icon: Home, label: 'Dashboard', roles: [] },
    ],
  },
  {
    id: 'society',
    label: 'Society Setup',
    color: { text: 'text-sky-600', dot: 'bg-sky-500', activeBg: 'bg-sky-50', activeText: 'text-sky-700', activeDot: 'bg-sky-500' },
    items: [
      { to: '/societies', icon: Building2, label: 'Societies', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'] },
      { to: '/towers', icon: Layers3, label: 'Towers & Blocks', roles: [] },
      { to: '/floors', icon: LayoutGrid, label: 'Floors', roles: [] },
      { to: '/flats', icon: LayoutGrid, label: 'Flats', roles: [] },
      { to: '/residents', icon: Users, label: 'Residents', roles: [] },
      { to: '/vehicles', icon: Car, label: 'Vehicles', roles: [] },
      { to: '/pets', icon: Cat, label: 'Pets', roles: [] },
    ],
  },
  {
    id: 'access',
    label: 'Access & Security',
    color: { text: 'text-amber-600', dot: 'bg-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeDot: 'bg-amber-500' },
    items: [
      { to: '/visitor', icon: UserCheck, label: 'Visitor Desk', roles: [], permissions: ['visitor.request.create', 'visitor.request.respond_own_flat', 'visitor.report.view', 'visitor.request.view_society'] },
    ],
  },
  {
    id: 'mcr',
    label: 'Maintenance & Receipts',
    color: { text: 'text-emerald-600', dot: 'bg-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeDot: 'bg-emerald-500' },
    items: [
      { to: '/mcr', icon: Banknote, label: 'Maintenance & Receipts', roles: [], permissions: [...MCR_ROUTE_PERMISSIONS], moduleCode: 'MCR' },
    ],
  },
  {
    id: 'sama',
    label: 'Staff, Attendance & Access',
    color: { text: 'text-violet-600', dot: 'bg-violet-500', activeBg: 'bg-violet-50', activeText: 'text-violet-700', activeDot: 'bg-violet-500' },
    items: [
      { to: '/sama', icon: UserCog, label: 'Staff, Attendance & Access', roles: [], permissions: [...SAMA_ROUTE_PERMISSIONS], moduleCode: 'SAMA' },
    ],
  },
  {
    id: 'lease',
    label: 'Rent & Lease',
    color: { text: 'text-orange-600', dot: 'bg-orange-500', activeBg: 'bg-orange-50', activeText: 'text-orange-700', activeDot: 'bg-orange-500' },
    items: [
      { to: '/lease', icon: FileText, label: 'Rent & Lease', roles: [], permissions: [...LEASE_ROUTE_PERMISSIONS], moduleCode: 'LEASE' },
    ],
  },
  {
    id: 'access-control',
    label: 'Member Access Control',
    color: { text: 'text-rose-600', dot: 'bg-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-700', activeDot: 'bg-rose-500' },
    items: [
      { to: '/access', icon: KeyRound, label: 'Member Access Control', roles: [], permissions: [...ACCESS_CONTROL_ROUTE_PERMISSIONS], moduleCode: 'ACCESS_CONTROL' },
    ],
  },
  {
    id: 'people',
    label: 'People & Roles',
    color: { text: 'text-fuchsia-600', dot: 'bg-fuchsia-500', activeBg: 'bg-fuchsia-50', activeText: 'text-fuchsia-700', activeDot: 'bg-fuchsia-500' },
    items: [
      { to: '/roles', icon: Shield, label: 'Roles & Permissions', roles: ['JENIX_SUPER_ADMIN', 'SOCIETY_ADMIN'] },
      { to: '/users', icon: UserCog, label: 'Users', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'ACCOUNTANT', 'FACILITY_MANAGER'] },
      { to: '/parent-links', icon: Link2, label: 'Parent Links', roles: [], permissions: ['parent.ward_link.manage'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    color: { text: 'text-slate-500', dot: 'bg-slate-400', activeBg: 'bg-slate-100', activeText: 'text-slate-800', activeDot: 'bg-slate-500' },
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', roles: [] },
      { to: '/modules', icon: Puzzle, label: 'Modules', roles: [] },
      { to: '/notifications', icon: Bell, label: 'Notifications', roles: [] },
      { to: '/audit', icon: ClipboardList, label: 'Audit Logs', roles: [] },
      { to: '/files', icon: FolderOpen, label: 'Files', roles: [] },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: [] },
      { to: '/devices', icon: Cpu, label: 'Devices', roles: [] },
      { to: '/banners', icon: Megaphone, label: 'App Banners', roles: ['JENIX_SUPER_ADMIN'], permissions: ['banner.manage'] },
    ],
  },
];
