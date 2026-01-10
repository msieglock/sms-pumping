import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (user: User, organization: Organization, token: string) => void;
  logout: () => void;
  updateOrganization: (org: Partial<Organization>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,

      login: (user, organization, token) =>
        set({
          user,
          organization,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
        }),

      updateOrganization: (org) =>
        set((state) => ({
          organization: state.organization
            ? { ...state.organization, ...org }
            : null,
        })),
    }),
    {
      name: 'smsguard-auth',
    }
  )
);
