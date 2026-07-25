import { User } from '../types';

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}

export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
