import { beforeEach, describe, expect, it } from 'vitest';
import type { Comparison, SavedObservation } from '@/shared/api/contracts';
import { useSessionStore } from '@/entities/session/model/store';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { getResource, mutateResource, portfolio } from '@/mocks/service';

beforeEach(() => resetMockDb());

describe('сохранённое наблюдение и пользовательский сброс', () => {
  it('сохраняет снимок сравнения, а pause/resume не запускает сделки и переживает чтение API', () => {
    const comparison = mutateResource('compare', {
      agentA: 'max',
      agentB: 'lev',
      task: 'Сохранить капитал',
      budget: '50000',
    }) as Comparison;
    const before = portfolio();
    mutateResource('saveIdea', { text: 'Проверить позднее', comparisonId: comparison.id });
    const saved = getResource('observation', new URLSearchParams()) as SavedObservation;
    const snapshot = structuredClone(saved);
    comparison.task = 'Изменён исходный объект';
    expect(
      (getResource('observation', new URLSearchParams()) as SavedObservation).comparison.task,
    ).toBe(snapshot.comparison.task);
    mutateResource('setObservationPaused', { paused: true });
    expect((getResource('observation', new URLSearchParams()) as SavedObservation).paused).toBe(
      true,
    );
    mutateResource('setObservationPaused', { paused: false });
    expect((getResource('observation', new URLSearchParams()) as SavedObservation).paused).toBe(
      false,
    );
    expect(portfolio()).toEqual(before);
  });

  it('сбрасывает только mock-базу и собственные настройки, сохраняя посторонние ключи', () => {
    const initial = structuredClone(getMockDb().config);
    localStorage.setItem('unrelated-user-data', 'keep-me');
    mutateResource('saveConfig', { goal: 'Изменённая цель', budget: '45000' });
    useSessionStore.getState().setTheme('dark');
    expect(mutateResource('resetDemo', {})).toEqual({ reset: true });
    useSessionStore.getState().resetClientSettings();
    expect(getMockDb().config).toEqual(initial);
    expect(useSessionStore.getState().theme).toBe('light');
    expect(useSessionStore.getState().onboardingDraft).toBeNull();
    expect(localStorage.getItem('unrelated-user-data')).toBe('keep-me');
  });
});
