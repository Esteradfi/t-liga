import { beforeEach, describe, expect, it } from 'vitest';
import type { AgentOnboardingDraft, ExitPreview } from '@/shared/api/contracts';
import { useSessionStore } from '@/entities/session/model/store';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { mutateResource, portfolio } from '@/mocks/service';

beforeEach(() => {
  resetMockDb();
  useSessionStore.setState({ onboardingDraft: null });
});

describe('сохранённый черновик знакомства', () => {
  it('восстанавливает шаг, ограничения и отложенный статус, не применяя их к счёту', async () => {
    const before = structuredClone(getMockDb().config);
    const draft: AgentOnboardingDraft = {
      agentId: 'lev',
      step: 7,
      deferred: false,
      goal: 'Накопить на квартиру',
      priority: 'Меньше колебаний',
      horizon: 'Больше 3 лет',
      budget: '45000',
      mode: 'confirm',
      leverage: false,
      short: false,
      derivatives: false,
      maxPositionPercent: '10',
      maxLeverage: '2',
      costLimit: '500',
      instruments: ['shares', 'bonds'],
      communication: 'business',
    };
    useSessionStore.getState().setOnboardingDraft(draft);
    useSessionStore.getState().deferOnboarding();
    expect(getMockDb().config).toEqual(before);
    const persisted = localStorage.getItem('tliga-client-settings-v1')!;
    useSessionStore.setState({ onboardingDraft: null }, false);
    // Keep the real persisted payload while discarding the in-memory session.
    localStorage.setItem('tliga-client-settings-v1', persisted);
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().onboardingDraft).toEqual({ ...draft, deferred: true });
    useSessionStore.getState().resumeOnboarding();
    expect(useSessionStore.getState().onboardingDraft).toEqual(draft);
    expect(getMockDb().config).toEqual(before);
  });
});

describe('общий координатор сквада', () => {
  it('личное согласие не заменяет командное; исполнение единственное и не касается личного счёта', () => {
    const s = getMockDb().squads[0],
      personal = portfolio(),
      initialCash = s.cash;
    mutateResource('squadMessage', { squadId: s.id, text: '@Макс, проверь состав' });
    const d = s.decisions[0];
    expect(d.plan!.actions.length).toBe(1);
    expect(s.cash).toBe(initialCash);
    mutateResource('approveSquadDecision', { squadId: s.id, decisionId: d.id });
    expect(() =>
      mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id }),
    ).toThrow('Нужно согласие');
    mutateResource('simulateSquadApproval', { squadId: s.id, decisionId: d.id });
    mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id });
    expect(s.virtualOrders).toHaveLength(1);
    expect(Number(s.cash)).toBeLessThan(Number(initialCash));
    expect(d.execution!.status).toBe('executed_demo');
    const snapshot = structuredClone(s);
    mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id });
    expect(s).toEqual(snapshot);
    expect(portfolio()).toEqual(personal);
  });

  it('проверка расходов атомарна: отклонённое исполнение не расходует общий капитал', () => {
    const s = getMockDb().squads[0];
    s.costLimit = '0';
    mutateResource('squadMessage', { squadId: s.id, text: '@Лев, обсудим план' });
    const d = s.decisions[0];
    mutateResource('simulateSquadApproval', { squadId: s.id, decisionId: d.id });
    const snapshot = {
      cash: s.cash,
      value: s.value,
      positions: structuredClone(s.positions),
      orders: structuredClone(s.virtualOrders),
    };
    expect(() =>
      mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id }),
    ).toThrow('Расходы превышают');
    expect({
      cash: s.cash,
      value: s.value,
      positions: s.positions,
      orders: s.virtualOrders,
    }).toEqual(snapshot);
  });

  it('автономность требует явно сохранённого мандата всех владельцев', () => {
    const s = getMockDb().squads[0];
    s.mode = 'autonomous';
    s.ownerConsents = ['me'];
    mutateResource('squadMessage', { squadId: s.id, text: '@Макс, план' });
    expect(s.virtualOrders).toHaveLength(0);
    mutateResource('simulateSquadMandate', { squadId: s.id });
    mutateResource('squadMessage', { squadId: s.id, text: '@Макс, новая идея' });
    expect(s.virtualOrders).toHaveLength(1);
    expect(s.decisions[0].status).toBe('executed');
  });

  it('торговля общего портфеля делает прежний расчёт выхода недействительным', () => {
    const s = getMockDb().squads[0];
    const exit = mutateResource('exitPreview', { squadId: s.id }) as ExitPreview;
    mutateResource('squadMessage', { squadId: s.id, text: '@Макс, план' });
    const d = s.decisions[0];
    mutateResource('simulateSquadApproval', { squadId: s.id, decisionId: d.id });
    mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id });
    expect(() => mutateResource('confirmExit', { previewId: exit.id })).toThrow('Пересчитай выход');
    expect(s.members.some((m) => m.userId === 'me')).toBe(true);
  });

  it('новый участник не получает чужую прибыль и делает прежний план устаревшим', () => {
    const s = getMockDb().squads[0],
      value = s.value;
    mutateResource('squadMessage', { squadId: s.id, text: '@Макс, план' });
    const d = s.decisions[0];
    mutateResource('inviteDemoMember', { squadId: s.id, name: 'Саша', agentId: 'chill' });
    expect(s.members.at(-1)).toMatchObject({ contribution: '0.00', value: '0.00', units: '0' });
    expect(s.value).toBe(value);
    expect(() =>
      mutateResource('executeSquadDecision', { squadId: s.id, decisionId: d.id }),
    ).toThrow('Правила изменились');
    expect(() =>
      mutateResource('inviteDemoMember', { squadId: s.id, name: 'Пятый', agentId: 'max' }),
    ).toThrow('четыре участника');
  });
});
