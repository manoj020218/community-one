import { Home, Building2, Layers3, LayoutGrid, Users, Car, Cat, Shield, UserCog, Puzzle, Bell, ClipboardList, FolderOpen, BarChart3, Cpu, UserCheck, Banknote, Settings, FileText, KeyRound, Link2, Megaphone, Footprints } from 'lucide-react';
import { MCR_ROUTE_PERMISSIONS } from '../../modules/mcr/mcr.permissions';
import { SAMA_ROUTE_PERMISSIONS } from '../../modules/sama/sama.permissions';
import { LEASE_ROUTE_PERMISSIONS } from '../../modules/lease/lease.permissions';
import { ACCESS_CONTROL_ROUTE_PERMISSIONS } from '../../modules/access-control/access-control.permissions';
import { PATROL_ROUTE_PERMISSIONS } from '../../modules/guardPatrol/guardPatrol.permissions';

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
  // Set when this whole group represents one toggleable platform Module (Module Registry
  // code) — lets the sidebar show its on/off state and the Module Registry page reuse the
  // same letter for the matching card, instead of the two screens drifting apart.
  moduleCode?: string;
  // Injected below, in top-to-bottom definition order — a stable A/B/C.. label per group so
  // an admin can point at "C. Visitor Management" in the sidebar and find the same "C." on
  // the Module Registry card.
  letter?: string;
};

// Payments/Receipts (legacy) are intentionally omitted from navigation — MCR is the
// current source of truth for maintenance billing. Their routes/backend stay live
// since report.service.ts still reads from them.
const RAW_NAV_GROUPS: NavGroup[] = [
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
    label: 'Visitor Management',
    color: { text: 'text-amber-600', dot: 'bg-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeDot: 'bg-amber-500' },
    moduleCode: 'VISITOR',
    items: [
      { to: '/visitor', icon: UserCheck, label: 'Visitor Management', roles: [], permissions: ['visitor.request.create', 'visitor.request.respond_own_flat', 'visitor.report.view', 'visitor.request.view_society'], moduleCode: 'VISITOR' },
    ],
  },
  {
    id: 'mcr',
    label: 'Maintenance & Receipts',
    color: { text: 'text-emerald-600', dot: 'bg-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeDot: 'bg-emerald-500' },
    moduleCode: 'MCR',
    items: [
      { to: '/mcr', icon: Banknote, label: 'Maintenance & Receipts', roles: [], permissions: [...MCR_ROUTE_PERMISSIONS], moduleCode: 'MCR' },
    ],
  },
  {
    id: 'guard-patrol',
    label: 'Guard Patrolling',
    color: { text: 'text-cyan-600', dot: 'bg-cyan-500', activeBg: 'bg-cyan-50', activeText: 'text-cyan-700', activeDot: 'bg-cyan-500' },
    moduleCode: 'GUARD_PATROL',
    items: [
      { to: '/guard-patrol', icon: Footprints, label: 'Guard Patrolling', roles: [], permissions: [...PATROL_ROUTE_PERMISSIONS], moduleCode: 'GUARD_PATROL' },
    ],
  },
  {
    id: 'sama',
    label: 'Staff, Attendance & Access',
    color: { text: 'text-violet-600', dot: 'bg-violet-500', activeBg: 'bg-violet-50', activeText: 'text-violet-700', activeDot: 'bg-violet-500' },
    moduleCode: 'SAMA',
    items: [
      { to: '/sama', icon: UserCog, label: 'Staff, Attendance & Access', roles: [], permissions: [...SAMA_ROUTE_PERMISSIONS], moduleCode: 'SAMA' },
    ],
  },
  {
    id: 'lease',
    label: 'Rent & Lease',
    color: { text: 'text-orange-600', dot: 'bg-orange-500', activeBg: 'bg-orange-50', activeText: 'text-orange-700', activeDot: 'bg-orange-500' },
    moduleCode: 'LEASE',
    items: [
      { to: '/lease', icon: FileText, label: 'Rent & Lease', roles: [], permissions: [...LEASE_ROUTE_PERMISSIONS], moduleCode: 'LEASE' },
    ],
  },
  {
    id: 'access-control',
    label: 'Member Access Control',
    color: { text: 'text-rose-600', dot: 'bg-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-700', activeDot: 'bg-rose-500' },
    moduleCode: 'ACCESS_CONTROL',
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

// A/B/C.. assigned by fixed top-to-bottom position in the list above, not by what the
// current user happens to see — so the same letter always means the same group for every
// admin, and the Module Registry page (via moduleLetterMap below) can reuse it verbatim.
export const navGroups: NavGroup[] = RAW_NAV_GROUPS.map((group, i) => ({ ...group, letter: String.fromCharCode(65 + i) }));

// moduleCode -> letter, for the Module Registry page to prefix its cards with the same
// letter shown in the sidebar for that module. Modules with no sidebar presence (still
// COMING_SOON) are simply absent here and render unlettered.
export const moduleLetterMap: Record<string, string> = navGroups.reduce((acc, g) => {
  if (g.moduleCode) acc[g.moduleCode] = g.letter!;
  return acc;
}, {} as Record<string, string>);
