import { beforeEach, describe, expect, it } from 'vitest';
import { getMockDb, resetMockDb, createSeedDb, normalizeMockDb } from '@/mocks/db';
import { mutateResource } from '@/mocks/service';

// Golden catalogue from the final standalone HTML, lines 487 and 567.
const free = [
  ['Первый заход', 'title', 'Титул'],
  ['Линия роста', 'card', 'Карточка результата'],
  ['После заката', 'theme', 'Тема интерфейса'],
  ['Жёлтый акцент', 'accessory', 'Аксессуар агента'],
  ['Исследователь', 'title', 'Титул'],
  ['Выход на арену', 'animation', 'Анимация'],
  ['Золотой час', 'cover', 'Обложка профиля'],
  ['Стратег', 'title', 'Титул'],
  ['Новый уровень', 'skin', 'Облик агента'],
  ['Сезон 01', 'badge', 'Памятный значок'],
];
const premium = [
  ['Неоновый контур', 'badge', 'Рамка профиля'],
  ['Биржевой пульс', 'card', 'Карточка результата'],
  ['Полночь', 'theme', 'Тема интерфейса'],
  ['Золотая серия', 'accessory', 'Аксессуар агента'],
  ['Архитектор стратегии', 'title', 'Титул'],
  ['Эффект присутствия', 'animation', 'Анимация'],
  ['Горизонт', 'cover', 'Обложка профиля'],
  ['Свой почерк', 'title', 'Титул'],
  ['Агент: Black Edition', 'skin', 'Облик агента'],
  ['Созвездие · Сезон 01', 'badge', 'Коллекционный значок'],
];

beforeEach(() => resetMockDb());
describe('неизменяемые названия и типы наград исходного прототипа', () => {
  it('сохраняет все 20 названий, семантических типов и подписей', () => {
    const rewards = getMockDb().season.rewards;
    for (const [premiumFlag, expected] of [
      [false, free],
      [true, premium],
    ] as const) {
      expect(
        rewards
          .filter((r) => r.premium === premiumFlag)
          .map((r) => [r.name, r.kind, (r as typeof r & { kindLabel: string }).kindLabel]),
      ).toEqual(expected);
    }
  });
  it('миграция исправляет старую ошибку типов, сохраняя получение наград и финансовые данные', () => {
    const db = createSeedDb();
    const neon = db.season.rewards.find((r) => r.id === 'premium-1')!;
    neon.kind = 'title';
    neon.kindLabel = 'Титул';
    neon.claimed = true;
    db.season.rewards.find((r) => r.id === 'free-7')!.kind = 'card';
    const me = db.users.find((u) => u.id === 'me')!;
    me.title = 'Неоновый контур';
    const finance = structuredClone({
      cash: db.cash,
      positions: db.positions,
      netContributions: db.netContributions,
      performanceUnits: db.performanceUnits,
    });
    normalizeMockDb(db);
    expect(neon.claimed).toBe(true);
    expect(db.season.rewards.find((r) => r.id === 'premium-1')).toMatchObject({
      kind: 'badge',
      kindLabel: 'Рамка профиля',
      claimed: true,
    });
    expect(db.season.rewards.find((r) => r.id === 'free-7')!.kind).toBe('cover');
    expect(me.title).toBe('');
    expect({
      cash: db.cash,
      positions: db.positions,
      netContributions: db.netContributions,
      performanceUnits: db.performanceUnits,
    }).toEqual(finance);
    me.title = 'Первый заход';
    normalizeMockDb(db);
    expect(me.title).toBe('Первый заход');
  });

  it('получение премиальной рамки не превращает её в доступный титул', () => {
    mutateResource('subscribePlan', { planId: 'plus' });
    mutateResource('claimReward', { rewardId: 'premium-1' });
    expect(() => mutateResource('updateProfile', { title: 'Неоновый контур' })).toThrow(
      'Титул ещё не получен',
    );
    expect(getMockDb().users.find((u) => u.id === 'me')!.title).toBe('');
  });
});
