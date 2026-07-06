import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Society } from '../types';

interface SocietyState {
  currentSociety: Society | null;
  setCurrentSociety: (society: Society | null) => void;
  clearSociety: () => void;
}

export const useSocietyStore = create<SocietyState>()(
  persist(
    (set) => ({
      currentSociety: null,
      setCurrentSociety: (society) => set({ currentSociety: society }),
      clearSociety: () => set({ currentSociety: null }),
    }),
    { name: 'jenix-society' }
  )
);
