import { simpleFaker as faker } from '@faker-js/faker';
import type { MockDb, Instrument, Agent, User, Plan, Squad, Reward } from '@/shared/api/contracts';
import { Decimal, exact } from '@/shared/lib/money';
const KEY = 'tliga-mock-server-v1';
const freeRewardCatalog = [
  ['Первый заход', 'Титул', 'title'],
  ['Линия роста', 'Карточка результата', 'card'],
  ['После заката', 'Тема интерфейса', 'theme'],
  ['Жёлтый акцент', 'Аксессуар агента', 'accessory'],
  ['Исследователь', 'Титул', 'title'],
  ['Выход на арену', 'Анимация', 'animation'],
  ['Золотой час', 'Обложка профиля', 'cover'],
  ['Стратег', 'Титул', 'title'],
  ['Новый уровень', 'Облик агента', 'skin'],
  ['Сезон 01', 'Памятный значок', 'badge'],
] as const;
const premiumRewardCatalog = [
  ['Неоновый контур', 'Рамка профиля', 'badge'],
  ['Биржевой пульс', 'Карточка результата', 'card'],
  ['Полночь', 'Тема интерфейса', 'theme'],
  ['Золотая серия', 'Аксессуар агента', 'accessory'],
  ['Архитектор стратегии', 'Титул', 'title'],
  ['Эффект присутствия', 'Анимация', 'animation'],
  ['Горизонт', 'Обложка профиля', 'cover'],
  ['Свой почерк', 'Титул', 'title'],
  ['Агент: Black Edition', 'Облик агента', 'skin'],
  ['Созвездие · Сезон 01', 'Коллекционный значок', 'badge'],
] as const;
export function rewardCatalog(): Reward[] {
  return freeRewardCatalog.flatMap((free, i) =>
    [free, premiumRewardCatalog[i]].map(([name, kindLabel, kind], branch) => ({
      id: `${branch ? 'premium' : 'free'}-${i + 1}`,
      level: i + 1,
      name,
      kindLabel,
      kind,
      premium: branch === 1,
      claimed: branch === 0 && i === 0,
      available: i < 4,
    })),
  );
}

export const agents: Agent[] = [
  {
    id: 'max',
    name: 'Макс',
    style: 'Активный',
    description: 'Ликвидность, краткосрочные движения и условия выхода.',
    approach:
      'Проверяю движение цены, расходы и условия выхода. Без сигнала могу ничего не делать.',
    color: '#d8a954',
  },
  {
    id: 'lev',
    name: 'Лев',
    style: 'Вдумчивый',
    description: 'Качество активов и долгосрочная структура.',
    approach: 'Сначала цель, горизонт и диверсификация. Набираю позиции постепенно.',
    color: '#90a2bd',
  },
  {
    id: 'chill',
    name: 'Чилл',
    style: 'Спокойный',
    description: 'Целевые доли и умеренный оборот.',
    approach: 'Сопоставляю состав с планом. Если цель не изменилась, избегаю лишних сделок.',
    color: '#a6bea4',
  },
];
export const rankForPlace = (n: number) =>
  n <= 750
    ? 'Хищник рынка'
    : n <= 1500
      ? 'Титан Уолл-стрит'
      : n <= 3000
        ? 'Алмазный Кит'
        : n <= 5000
          ? 'Платиновая Акула'
          : n <= 8000
            ? 'Золотой Бык'
            : n <= 12000
              ? 'Серебряный Волк'
              : n <= 18000
                ? 'Бронзовый Лис'
                : 'Медный Хомяк';
export const plans: Plan[] = [
  {
    id: 'start',
    name: 'Старт',
    price: '0.00',
    unit: 'без подписки',
    chatLimit: 20,
    deepLimit: 0,
    selected: true,
    features: [
      '20 обычных обращений',
      'Предложения с подтверждением',
      'Арена, сквады и базовые награды',
    ],
  },
  {
    id: 'plus',
    name: 'Агент Плюс',
    price: '599.00',
    unit: 'в месяц за человека',
    chatLimit: 200,
    deepLimit: 20,
    selected: false,
    features: [
      '200 обычных + 20 глубоких разборов',
      'Событийный мониторинг и автономность',
      'Платная ветка Battle Pass',
    ],
  },
  {
    id: 'squad',
    name: 'Сквад',
    price: '1990.00',
    unit: 'в месяц за команду до 4 человек',
    chatLimit: 600,
    deepLimit: 60,
    selected: false,
    features: [
      'Общий пул 600 + 60 глубоких разборов',
      'До четырёх персональных стратегий',
      'Совет агентов и Battle Pass каждому',
    ],
  },
];
function history(price: number) {
  return Array.from({ length: 24 }, (_, i) => ({
    date: `${i + 1} окт`,
    value:
      Math.round(
        (price * (0.9 + i * 0.004) +
          faker.number.float({ min: -price * 0.015, max: price * 0.015 })) *
          100,
      ) / 100,
  }));
}
export function squadStrategyDefaults() {
  return {
    horizon: 'long' as const,
    approach: 'balanced' as const,
    leverage: false,
    short: false,
    derivatives: false,
    maxPositionPercent: '15',
    maxLeverage: '2',
    costLimit: '1000.00',
  };
}
function makeSquad(id: string, name: string): Squad {
  return {
    id,
    name,
    code: `TL-${id.toUpperCase()}-26`,
    captainId: 'me',
    status: 'active',
    ranked: true,
    value: '231000.00',
    profit: '21000.00',
    returnPercent: '10.00',
    strategy: 'Диверсифицированный портфель без плеча',
    goal: 'Совместно проверять идеи',
    mode: 'confirm',
    ...squadStrategyDefaults(),
    cash: '231000.00',
    positions: {},
    ownerConsents: ['me', 'anna', 'mark'],
    virtualOrders: [],
    revision: 1,
    members: [
      {
        id: 'm1',
        userId: 'me',
        name: 'Артём',
        agentId: 'max',
        contribution: '50000.00',
        units: '50000',
        sharePercent: '23.809524',
        value: '55000.00',
        profit: '5000.00',
      },
      {
        id: 'm2',
        userId: 'anna',
        name: 'Анна',
        agentId: 'lev',
        contribution: '60000.00',
        units: '60000',
        sharePercent: '28.571429',
        value: '66000.00',
        profit: '6000.00',
      },
      {
        id: 'm3',
        userId: 'mark',
        name: 'Марк',
        agentId: 'chill',
        contribution: '100000.00',
        units: '100000',
        sharePercent: '47.619048',
        value: '110000.00',
        profit: '10000.00',
      },
    ],
    messages: [
      {
        id: 'sm1',
        role: 'system',
        text: 'Виртуальный сквад. Средства не объединяются на реальном счёте.',
        createdAt: '2026-11-10T08:00:00.000Z',
      },
    ],
    decisions: [],
    contributions: [],
  };
}
export function createSeedDb(): MockDb {
  faker.seed(1101026);
  const specs = [
    ['SBER', 'Сбербанк', 'shares', '278.42', 10, '1.24', '#e6f4e9'],
    ['YDEX', 'Яндекс', 'shares', '4125.00', 1, '0.86', '#ffe9e4'],
    ['OFZ26238', 'ОФЗ 26238', 'bonds', '612.30', 1, '0.18', '#e8effa'],
    ['GOLD', 'Золото', 'metals', '8240.00', 1, '-0.32', '#fff1c1'],
    ['LKOH', 'Лукойл', 'shares', '6820.00', 1, '0.72', '#ffe6e5'],
    ['TMON', 'Денежный рынок', 'funds', '1.43', 1000, '0.05', '#eceafb'],
  ] as const;
  const instruments: Instrument[] = specs.map(
    ([id, name, kind, price, lotSize, changePercent, color]) => ({
      id,
      symbol: id,
      name,
      kind,
      price,
      lotSize,
      changePercent,
      color,
      history: history(Number(price)),
      description: (
        {
          SBER: 'Акции Сбербанка: участие в капитале компании. Результат зависит от цены акций и возможных дивидендов.',
          YDEX: 'Акции Яндекса: вложение в технологический бизнес. Цена зависит от результатов компании и ожиданий рынка.',
          OFZ26238:
            'Облигация федерального займа: долговой инструмент с купонными выплатами. Рыночная цена может меняться до погашения.',
          GOLD: 'Инструмент на золото: способ добавить драгоценный металл в структуру портфеля. Стоимость может расти и снижаться.',
          LKOH: 'Акции Лукойла: участие в нефтяном бизнесе. Доходность зависит от рыночной цены и решений о дивидендах.',
          TMON: 'Фонд денежного рынка: инструмент для размещения свободных средств. Не является вкладом и не гарантирует доход.',
        } as Record<string, string>
      )[id],
    }),
  );
  const users: User[] = [
    {
      id: 'me',
      name: 'Артём',
      avatar: '',
      title: '',
      privacy: 'open',
      rank: rankForPlace(10128),
      place: 10128,
      returnPercent: '2.46',
      drawdownPercent: '-2.10',
      following: false,
      movement: 12,
    },
    ...Array.from({ length: 12 }, (_, i) => {
      const place = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10127, 12001][i];
      return {
        id: `u${i + 1}`,
        name:
          [
            'Никита',
            'Мария',
            'Даниил',
            'Алиса',
            'Илья',
            'София',
            'Марк',
            'Ева',
            'Олег',
            'Аня',
            'Саша',
            'Роман',
          ][i] || `Игрок ${i + 1}`,
        avatar: '',
        title: 'Участник первого сезона',
        privacy: i === 3 ? 'closed' : i === 1 ? 'results' : 'open',
        rank: rankForPlace(place),
        place,
        returnPercent: exact(12.84 - i * 0.77),
        drawdownPercent: exact(-5.2 + i * 0.18),
        following: i === 2,
      } as User;
    }),
  ];
  const seeded: MockDb = {
    version: 1,
    usage: { period: new Date().toISOString().slice(0, 7), ordinary: 0 },
    chatPending: false,
    users,
    agents,
    config: {
      agentId: 'max',
      goal: 'Собрать долгосрочный портфель',
      priority: 'Сбалансированный подход',
      horizon: 'Больше года',
      budget: '150000.00',
      mode: 'confirm',
      paused: false,
      leverage: false,
      maxLeverage: '1',
      short: false,
      derivatives: false,
      maxPositionPercent: '15',
      costLimit: '1000.00',
      instruments: ['shares', 'bonds', 'funds', 'metals'],
      communication: 'friendly',
      revision: 1,
      onboardingComplete: false,
      agentSelected: false,
    },
    instruments,
    cash: '18200.00',
    netContributions: '138916.00',
    performanceUnits: '138916',
    positions: { SBER: 10, YDEX: 5, OFZ26238: 30, GOLD: 1, LKOH: 3, TMON: 20 },
    chat: [],
    journal: [
      {
        id: 'seed-1',
        type: 'analysis',
        title: 'Сохранил долю облигаций',
        description: 'Учебный пример: состав соответствует цели, новая заявка не нужна.',
        source: 'Агент · подготовленный пример',
        status: 'Без сделки',
        createdAt: '2026-11-10T09:42:00.000Z',
      },
    ],
    activities: [],
    squads: [makeSquad('alpha', 'Держим позицию')],
    season: {
      id: 'season-01',
      name: 'Новая высота',
      level: 4,
      xp: 420,
      nextXp: 600,
      daysLeft: 19,
      rewards: rewardCatalog(),
    },
    planId: 'start',
    tradePreviews: [],
    exitPreviews: [],
    dissolvePreviews: [],
    comparisons: [],
    observation: null,
  };
  const common = seeded.squads[0];
  common.positions = { SBER: 10, YDEX: 7, OFZ26238: 50, GOLD: 3, LKOH: 4, TMON: 20 };
  common.cash = exact(
    new Decimal(common.value).minus(
      seeded.instruments.reduce(
        (n, i) => n.plus(new Decimal(i.price).mul(i.lotSize).mul(common.positions[i.id] || 0)),
        new Decimal(0),
      ),
    ),
  );
  return normalizeMockDb(seeded);
}
let memory: MockDb | undefined;
function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
export function normalizeMockDb(db: MockDb): MockDb {
  db.observation ??= null;
  const catalog = rewardCatalog();
  db.season.rewards = db.season.rewards.map((r) => {
    const correct = catalog.find((item) => item.id === r.id);
    return correct
      ? { ...r, name: correct.name, kind: correct.kind, kindLabel: correct.kindLabel }
      : r;
  });
  const owner = db.users.find((u) => u.id === 'me');
  if (
    owner?.title &&
    !db.season.rewards.some((r) => r.claimed && r.kind === 'title' && r.name === owner.title)
  )
    owner.title = '';

  db.config.priority ??= 'Сбалансированный подход';
  const own = db.users.find((u) => u.id === 'me');
  if (own) own.movement ??= 12;
  const hasRankedMetadata = db.squads.some((s) => typeof s.ranked === 'boolean');
  const firstActive = db.squads.find((s) => s.status === 'active');
  db.squads.forEach((s) => {
    s.ranked ??= !hasRankedMetadata && s === firstActive;
    const defaults = squadStrategyDefaults();
    Object.entries(defaults).forEach(([key, value]) => {
      const row = s as unknown as Record<string, unknown>;
      if (row[key] === undefined) row[key] = value;
    });
    s.positions ??= {};
    s.virtualOrders ??= [];
    s.ownerConsents ??= s.members.map((m) => m.userId);
    if (s.cash === undefined) {
      const invested = db.instruments.reduce(
        (n, i) => n.plus(new Decimal(i.price).mul(i.lotSize).mul(s.positions[i.id] || 0)),
        new Decimal(0),
      );
      s.cash = exact(new Decimal(s.value).minus(invested));
    }
  });
  return db;
}
export function getMockDb(): MockDb {
  if (memory) return normalizeMockDb(memory);
  try {
    const raw = storage()?.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === 1) {
        memory = normalizeMockDb(parsed);
        persistMockDb(memory);
        return memory;
      }
    }
  } catch {
    /* seed below */
  }
  memory = createSeedDb();
  return memory;
}
export function persistMockDb(db: MockDb) {
  memory = db;
  try {
    storage()?.setItem(KEY, JSON.stringify(db));
  } catch {
    /* unavailable storage: in-memory mock still works */
  }
}
export function resetMockDb() {
  memory = createSeedDb();
  persistMockDb(memory);
  return memory;
}
export function refreshSquad(s: Squad) {
  const units = s.members.reduce((n, m) => n.plus(m.units), new Decimal(0));
  s.members.forEach((m) => {
    const share = units.eq(0) ? new Decimal(0) : new Decimal(m.units).div(units);
    m.sharePercent = share.mul(100).toFixed(6);
    m.value = exact(share.mul(s.value));
    m.profit = exact(new Decimal(m.value).minus(m.contribution));
  });
  s.profit = exact(
    new Decimal(s.value).minus(s.members.reduce((n, m) => n.plus(m.contribution), new Decimal(0))),
  );
}
