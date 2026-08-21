import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { useSocietyStore } from './societyStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // currentSociety (the "society switcher" selection) is a SEPARATE persisted store, keyed
      // by browser/device rather than by user. Without clearing it here, a new login on the
      // same device inherits whatever society the PREVIOUS session had selected — silently
      // scoping every society-scoped API call to someone else's society.
      setAuth: (user, accessToken, refreshToken) => {
        useSocietyStore.getState().clearSociety();
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      logout: () => {
        useSocietyStore.getState().clearSociety();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'jenix-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
