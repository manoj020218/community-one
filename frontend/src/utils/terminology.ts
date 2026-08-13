import { useSocietyStore } from '../store/societyStore';

export interface Terminology {
  org: string; orgPlural: string;
  building: string; buildingPlural: string;
  unit: string; unitPlural: string;
  person: string; personPlural: string;
  setupGroupLabel: string;
  brandSubtitle: string;
}

const COMMUNITY_TERMS: Terminology = {
  org: 'Society', orgPlural: 'Societies',
  building: 'Tower', buildingPlural: 'Towers & Blocks',
  unit: 'Flat', unitPlural: 'Flats & Apartments',
  person: 'Resident', personPlural: 'Residents',
  setupGroupLabel: 'Society Setup',
  brandSubtitle: 'Society One',
};

const HOSTEL_TERMS: Terminology = {
  org: 'Hostel', orgPlural: 'Hostels',
  building: 'Block', buildingPlural: 'Blocks & Floors',
  unit: 'Room', unitPlural: 'Rooms',
  person: 'Student', personPlural: 'Students',
  setupGroupLabel: 'Hostel Setup',
  brandSubtitle: 'Hostel Manager',
};

export function terminologyFor(vertical?: string | null): Terminology {
  return vertical === 'HOSTEL' ? HOSTEL_TERMS : COMMUNITY_TERMS;
}

/** Runtime terminology for the current society's vertical — Tier 1 theming (labels only, same app/build/backend). */
export function useTerminology(): Terminology {
  const { currentSociety } = useSocietyStore();
  return terminologyFor(currentSociety?.vertical);
}
