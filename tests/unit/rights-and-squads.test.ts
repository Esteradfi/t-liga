import { beforeEach, describe, expect, it } from 'vitest';
import type { ContributionRequest, ExitPreview } from '@/shared/api/contracts';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { getResource, mutateResource, portfolio } from '@/mocks/service';

const query = (name: string, params: Record<string, string> = {}) =>
  getResource(name, new URLSearchParams(params));

describe('границы прав и общего капитала', () => {
  beforeEach(() => resetMockDb());

  it('пополнение повышает капитал, но не выдаёт взнос за прибыль или доходность', () => {
    const before = portfolio();
    mutateResource('fundPortfolio', { amount: '10000.00' });
    const after = portfolio();
    expect(Number(after.value) - Number(before.value)).toBe(10000);
    expect(Number(after.cash) - Number(before.cash)).toBe(10000);
    expect(after.profit).toBe(before.profit);
    expect(after.returnPercent).toBe(before.returnPercent);
    const profile = query('profile', { id: 'me' }) as { user: { returnPercent: string } };
    expect(profile.user.returnPercent).toBe(after.returnPercent);
  });

  it('демо-подписка не расширяет торговые права и не списывает деньги', () => {
    const config = structuredClone(getMockDb().config),
      cash = getMockDb().cash;
    mutateResource('subscribePlan', { planId: 'squad' });
    expect(getMockDb().config).toEqual(config);
    expect(getMockDb().cash).toBe(cash);
  });

  it('новый частный сквад не попадает в сезонный командный рейтинг', () => {
    const created = mutateResource('createSquad', { name: 'Частный клуб' }) as {
      id: string;
      ranked: boolean;
    };
    expect(created.ranked).toBe(false);
    const ranked = query('leaderboard', { scope: 'squads' }) as { id: string }[];
    expect(ranked.some((s) => s.id === created.id)).toBe(false);
    expect(ranked.some((s) => s.id === 'alpha')).toBe(true);
  });

  it('приватные данные редактируются сервером до передачи клиенту', () => {
    expect(query('profile', { id: 'u2' })).toMatchObject({ holdings: null, trades: null });
    expect(() => query('profile', { id: 'u4' })).toThrow('Профиль закрыт');
  });

  it('сервер не позволяет экипировать незаработанный титул или забрать закрытый уровень', () => {
    expect(() => mutateResource('updateProfile', { title: 'Исследователь' })).toThrow(
      'Титул ещё не получен',
    );
    expect(() => mutateResource('claimReward', { rewardId: 'free-5' })).toThrow(
      'Нужен следующий уровень',
    );
    mutateResource('updateProfile', { title: 'Первый заход' });
    expect(getMockDb().users.find((u) => u.id === 'me')!.title).toBe('Первый заход');
  });

  it('отклонённое редактирование профиля не меняет другие поля', () => {
    const before = structuredClone(getMockDb().users.find((u) => u.id === 'me'));
    expect(() =>
      mutateResource('updateProfile', {
        name: 'Новое имя',
        privacy: 'closed',
        title: 'Исследователь',
      }),
    ).toThrow('Титул ещё не получен');
    expect(getMockDb().users.find((u) => u.id === 'me')).toEqual(before);
  });

  it('заявка на взнос не меняет стоимость до одобрения, затем не перераспределяет прошлую прибыль', () => {
    const db = getMockDb(),
      squad = db.squads[0],
      personal = portfolio();
    const before = structuredClone(squad.members);
    const request = mutateResource('proposeContribution', {
      squadId: squad.id,
      amount: '10000.00',
    }) as ContributionRequest;
    expect(squad.value).toBe('231000.00');
    expect(squad.members).toEqual(before);
    mutateResource('approveContribution', { squadId: squad.id, requestId: request.id });
    expect(squad.value).toBe('241000.00');
    expect(squad.members.find((m) => m.userId === 'me')).toMatchObject({
      value: '65000.00',
      contribution: '60000.00',
      profit: '5000.00',
    });
    expect(squad.members.filter((m) => m.userId !== 'me').map((m) => m.value)).toEqual([
      '66000.00',
      '110000.00',
    ]);
    expect(portfolio()).toEqual(personal);
    const snapshot = structuredClone(squad);
    mutateResource('approveContribution', { squadId: squad.id, requestId: request.id });
    expect(squad).toEqual(snapshot);
  });

  it('предложение стратегии не меняет действующие правила до согласования и фиксации', () => {
    const squad = getMockDb().squads[0];
    const before = {
      goal: squad.goal,
      strategy: squad.strategy,
      mode: squad.mode,
      revision: squad.revision,
    };
    mutateResource('saveSquadStrategy', {
      squadId: squad.id,
      goal: 'Сохранить капитал',
      strategy: 'Долгосрочный осторожный подход',
      mode: 'autonomous',
    });
    const decision = squad.decisions[0];
    expect({
      goal: squad.goal,
      strategy: squad.strategy,
      mode: squad.mode,
      revision: squad.revision,
    }).toEqual(before);
    expect(() =>
      mutateResource('executeSquadDecision', { squadId: squad.id, decisionId: decision.id }),
    ).toThrow('Нужно согласие');
    mutateResource('approveSquadDecision', { squadId: squad.id, decisionId: decision.id });
    expect(squad.goal).toBe(before.goal);
    expect(() =>
      mutateResource('executeSquadDecision', { squadId: squad.id, decisionId: decision.id }),
    ).toThrow('Нужно согласие');
    mutateResource('simulateSquadApproval', { squadId: squad.id, decisionId: decision.id });
    mutateResource('executeSquadDecision', { squadId: squad.id, decisionId: decision.id });
    expect(squad.goal).toBe('Сохранить капитал');
    const snapshot = structuredClone(squad);
    mutateResource('executeSquadDecision', { squadId: squad.id, decisionId: decision.id });
    expect(squad).toEqual(snapshot);
  });

  it('выход пересчитывается после одобренного взноса и сохраняет личный кошелёк', () => {
    const squad = getMockDb().squads[0],
      personal = portfolio();
    const stale = mutateResource('exitPreview', { squadId: squad.id }) as ExitPreview;
    const request = mutateResource('proposeContribution', {
      squadId: squad.id,
      amount: '10000',
    }) as ContributionRequest;
    mutateResource('approveContribution', { squadId: squad.id, requestId: request.id });
    expect(() => mutateResource('confirmExit', { previewId: stale.id })).toThrow(
      'Пересчитай выход',
    );
    const fresh = mutateResource('exitPreview', { squadId: squad.id }) as ExitPreview;
    expect(fresh.value).toBe('65000.00');
    mutateResource('confirmExit', { previewId: fresh.id });
    const snapshot = structuredClone(getMockDb());
    mutateResource('confirmExit', { previewId: fresh.id });
    expect(getMockDb()).toEqual(snapshot);
    expect(squad.members.some((m) => m.userId === 'me')).toBe(false);
    expect(portfolio()).toEqual(personal);
  });
});
