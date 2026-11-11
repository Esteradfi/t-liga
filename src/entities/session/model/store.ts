import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentOnboardingDraft } from '@/shared/api/contracts';
interface SessionState {
  onboardingDraft: AgentOnboardingDraft | null;
  setOnboardingDraft: (draft: AgentOnboardingDraft | null) => void;
  patchOnboardingDraft: (patch: Partial<AgentOnboardingDraft>) => void;
  deferOnboarding: () => void;
  resumeOnboarding: () => void;
  clearOnboardingDraft: () => void;
  resetClientSettings: () => void;
  userId: string;
  theme: 'light' | 'dark';
  activeSquadId: string | null;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveSquadId: (id: string | null) => void;
}
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      onboardingDraft: null,
      setOnboardingDraft: (onboardingDraft) => set({ onboardingDraft }),
      patchOnboardingDraft: (patch) =>
        set((state) => ({
          onboardingDraft: state.onboardingDraft ? { ...state.onboardingDraft, ...patch } : null,
        })),
      deferOnboarding: () =>
        set((state) => ({
          onboardingDraft: state.onboardingDraft
            ? { ...state.onboardingDraft, deferred: true }
            : null,
        })),
      resumeOnboarding: () =>
        set((state) => ({
          onboardingDraft: state.onboardingDraft
            ? { ...state.onboardingDraft, deferred: false }
            : null,
        })),
      clearOnboardingDraft: () => set({ onboardingDraft: null }),
      resetClientSettings: () =>
        set({ userId: 'me', theme: 'light', activeSquadId: 'alpha', onboardingDraft: null }),
      userId: 'me',
      theme: 'light',
      activeSquadId: 'alpha',
      setTheme: (theme) => set({ theme }),
      setActiveSquadId: (activeSquadId) => set({ activeSquadId }),
    }),
    { name: 'tliga-client-settings-v1' },
  ),
);
