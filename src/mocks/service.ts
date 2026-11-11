import type {
  AgentConfig,
  ChatMessage,
  Comparison,
  DissolvePreview,
  ExitPreview,
  JournalEvent,
  MockDb,
  Overview,
  Portfolio,
  PublicProfile,
  Squad,
  SquadDecision,
  SquadOrder,
  TradeInput,
  TradePreview,
  User,
} from '@/shared/api/contracts';
import { Decimal, exact } from '@/shared/lib/money';
import { squadStrategySchema } from '@/features/agent-management/model/squad-validation';
import { configSchema } from '@/features/agent-management/model/validation';
import { tradeSchema } from '@/features/trade/model/validation';
import {
  getMockDb,
  resetMockDb,
  persistMockDb,
  plans,
  rankForPlace,
  refreshSquad,
  squadStrategyDefaults,
} from './db';
export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function fail(code: string, message: string, status = 400): never {
  throw new ServiceError(status, code, message);
}
let seq = 0;
const id = () => `${Date.now().toString(36)}-${++seq}`;
const now = () => new Date().toISOString();
const me = (db: MockDb) => db.users.find((u) => u.id === 'me')!;
const instrument = (db: MockDb, key: string) =>
  db.instruments.find((i) => i.id === key) || fail('NOT_FOUND', 'Инструмент не найден', 404);
const squad = (db: MockDb, key: string) =>
  db.squads.find((s) => s.id === key) || fail('NOT_FOUND', 'Сквад не найден', 404);
function event(
  db: MockDb,
  title: string,
  type: JournalEvent['type'] = 'analysis',
  description = 'Контекст сохранён. Сделки не совершались.',
  source = 'Твоё действие',
  status = 'Без сделки',
) {
  const e = { id: id(), title, type, description, source, status, createdAt: now() };
  db.journal.unshift(e);
  return e;
}
function activity(db: MockDb, type: string, text: string, instrumentId?: string) {
  db.activities.unshift({ id: id(), type, text, instrumentId, createdAt: now() });
  db.activities = db.activities.slice(0, 100);
}
export function portfolio(db = getMockDb()): Portfolio {
  const positions = Object.entries(db.positions)
    .filter(([, lots]) => lots > 0)
    .map(([key, lots]) => {
      const i = instrument(db, key);
      return {
        instrumentId: key,
        symbol: i.symbol,
        name: i.name,
        lots,
        quantity: lots * i.lotSize,
        price: i.price,
        value: exact(new Decimal(i.price).mul(i.lotSize).mul(lots)),
      };
    });
  const invested = positions.reduce((n, p) => n.plus(p.value), new Decimal(0));
  const value = invested.plus(db.cash);
  return {
    value: exact(value),
    cash: db.cash,
    reserved: '0.00',
    invested: exact(invested),
    profit: exact(value.minus(db.netContributions || '138916.00')),
    returnPercent: value
      .div(db.performanceUnits || '138916')
      .minus(1)
      .mul(100)
      .toFixed(2),
    drawdownPercent: '-2.10',
    positions,
    history: db.instruments[0].history.map((p) => ({
      ...p,
      value: Number(value.mul(new Decimal(p.value).div(db.instruments[0].price)).toFixed(2)),
    })),
  };
}
function overview(db: MockDb): Overview {
  me(db).returnPercent = portfolio(db).returnPercent;
  return {
    user: me(db),
    portfolio: portfolio(db),
    config: db.config,
    agent: db.agents.find((a) => a.id === db.config.agentId)!,
    lastEvent: db.journal[0] || null,
    season: db.season,
    activePlan: db.planId,
    usage: db.usage || { period: new Date().toISOString().slice(0, 7), ordinary: 0 },
  };
}
function publicProfile(db: MockDb, key: string): PublicProfile {
  const user = db.users.find((u) => u.id === key) || fail('NOT_FOUND', 'Игрок не найден', 404);
  if (user.privacy === 'closed' && key !== 'me')
    fail('PROFILE_CLOSED', 'Профиль закрыт владельцем', 403);
  const visible = user.privacy === 'open' || key === 'me';
  const own = key === 'me';
  const seedOffset = Number(key.slice(1)) || 1;
  const publicHoldings = db.instruments.slice(0, 3).map((i, n) => {
    const lots = seedOffset + n;
    return {
      instrumentId: i.id,
      symbol: i.symbol,
      name: i.name,
      lots,
      quantity: lots * i.lotSize,
      price: i.price,
      value: exact(new Decimal(i.price).mul(i.lotSize).mul(lots)),
    };
  });
  const publicTrades: JournalEvent[] = [
    {
      id: 'public-' + key,
      type: 'trade',
      title: 'Публичный разбор стратегии',
      description:
        'Независимый подготовленный пример публичного портфеля. Личные операции текущего пользователя сюда не попадают.',
      source: user.name,
      status: 'Демо-публикация',
      createdAt: '2026-11-10T08:15:00.000Z',
    },
  ];
  return {
    user,
    holdings: visible ? (own ? portfolio(db).positions : publicHoldings) : null,
    trades: visible
      ? own
        ? db.journal.filter((e) => e.type === 'trade').slice(0, 5)
        : publicTrades
      : null,
    awards: own
      ? db.season.rewards.filter((r) => r.claimed)
      : db.season.rewards
          .filter((r) => !r.premium && r.level === 1)
          .map((r) => ({ ...r, claimed: true })),
    agent:
      db.agents[
        key === 'me'
          ? db.agents.findIndex((a) => a.id === db.config.agentId)
          : Number(key.slice(1)) % 3
      ] || db.agents[0],
    strategy: 'Личный бюджет, диверсификация и согласованные разрешения.',
    history: db.instruments[0].history,
  };
}
export function getResource(resource: string, params: URLSearchParams) {
  const db = getMockDb();
  me(db).returnPercent = portfolio(db).returnPercent;
  switch (resource) {
    case 'overview':
      return overview(db);
    case 'agents':
      return db.agents;
    case 'config':
      return db.config;
    case 'chat':
      return db.chat;
    case 'journal':
      return db.journal.filter(
        (e) =>
          !params.get('filter') ||
          params.get('filter') === 'all' ||
          e.type === params.get('filter'),
      );
    case 'instruments':
      return db.instruments.filter(
        (i) =>
          (!params.get('kind') || params.get('kind') === 'all' || i.kind === params.get('kind')) &&
          (!params.get('search') ||
            `${i.name} ${i.symbol}`.toLowerCase().includes(params.get('search')!.toLowerCase())),
      );
    case 'instrument':
      return instrument(db, params.get('id') || '');
    case 'leaderboard':
      return params.get('scope') === 'squads'
        ? db.squads
            .filter((s) => s.status === 'active' && s.ranked)
            .map((s, i) => ({
              id: s.id,
              userId: s.id,
              name: s.name,
              rank: 'Золотой Бык',
              place: i + 1,
              returnPercent: s.returnPercent,
              drawdownPercent: '-2.8',
              isCurrent: true,
            }))
        : db.users
            .filter((u) => params.get('scope') !== 'friends' || u.following || u.id === 'me')
            .sort((a, b) => a.place - b.place)
            .map((u) => ({
              id: u.id,
              userId: u.id,
              name: u.name,
              rank: rankForPlace(u.place),
              place: u.place,
              returnPercent: u.returnPercent,
              drawdownPercent: u.drawdownPercent,
              isCurrent: u.id === 'me',
              movement: u.movement || 0,
            }));
    case 'profile':
      return publicProfile(db, params.get('id') || 'me');
    case 'squads':
      return db.squads.map((s) => ({
        ...s,
        archiveDistribution: db.dissolvePreviews.find((p) => p.squadId === s.id && p.consumed)
          ?.members,
      }));
    case 'squad': {
      const s = squad(db, params.get('id') || '');
      return {
        ...s,
        archiveDistribution: db.dissolvePreviews.find((p) => p.squadId === s.id && p.consumed)
          ?.members,
      };
    }
    case 'squadMessages':
      return squad(db, params.get('id') || '').messages;
    case 'rewards':
      return db.season;
    case 'plans':
      return plans.map((p) => ({ ...p, selected: p.id === db.planId }));
    case 'watch':
      return db.users.filter((u) => u.following);
    case 'activities':
      return db.activities;
    case 'observation':
      return db.observation || null;
    default:
      return fail('NOT_FOUND', 'Ресурс не найден', 404);
  }
}
function ensureActive(s: Squad) {
  if (s.status !== 'active') fail('ARCHIVED', 'Сквад архивирован');
}
function memberMe(s: Squad) {
  return (
    s.members.find((m) => m.userId === 'me') || fail('NOT_MEMBER', 'Ты не участник сквада', 403)
  );
}
function previewExit(db: MockDb, s: Squad, memberId = 'me'): ExitPreview {
  refreshSquad(s);
  const m =
    s.members.find((x) => x.userId === memberId) || fail('NOT_MEMBER', 'Участник не найден');
  const fee = exact(new Decimal(m.value).mul('.003'));
  const gain = Decimal.max(new Decimal(m.value).minus(m.contribution).minus(fee), 0);
  const tax = exact(gain.mul('.13'));
  return {
    id: id(),
    squadId: s.id,
    memberId: m.userId,
    value: m.value,
    contribution: m.contribution,
    profit: m.profit,
    fee,
    tax,
    payout: exact(new Decimal(m.value).minus(fee).minus(tax)),
    revision: s.revision,
    consumed: false,
  };
}

function spendOrdinary(db: MockDb) {
  const period = new Date().toISOString().slice(0, 7);
  if (!db.usage || db.usage.period !== period) db.usage = { period, ordinary: 0 };
  const plan = plans.find((p) => p.id === db.planId)!;
  if (db.usage.ordinary >= plan.chatLimit)
    fail(
      'QUOTA_REACHED',
      'Лимит аналитических задач исчерпан. Ручные сделки, контроль прав, история и остановка остаются доступны.',
      429,
    );
  db.usage.ordinary++;
}
function validateAgentTrade(db: MockDb, t: TradeInput) {
  const c = db.config,
    i = instrument(db, t.instrumentId);
  if (!c.onboardingComplete)
    fail('ONBOARDING_REQUIRED', 'Сначала явно примени цель и разрешения агента');
  if (c.paused) fail('AGENT_PAUSED', 'Агент на паузе. Ручная торговля остаётся доступна');
  if (!c.instruments.includes(i.kind))
    fail('INSTRUMENT_FORBIDDEN', 'Класс инструмента не разрешён агенту');
  const base = new Decimal(i.price).mul(i.lotSize).mul(t.lots),
    fee = base.mul('.003').toDecimalPlaces(2);
  if (fee.gt(c.costLimit)) fail('COST_LIMIT', 'Комиссия превышает лимит расходов');
  if (t.side === 'buy') {
    const holding = new Decimal(i.price).mul(i.lotSize).mul((db.positions[i.id] || 0) + t.lots);
    if (holding.gt(new Decimal(c.budget).mul(c.maxPositionPercent).div(100)))
      fail('POSITION_LIMIT', 'После покупки превышен лимит позиции. Измени правила отдельно');
    if (portfolio(db).invested && new Decimal(portfolio(db).invested).plus(base).gt(c.budget))
      fail('BUDGET_LIMIT', 'Новый план превышает выделенный бюджет агента');
  }
}

function squadTradePlan(db: MockDb, s: Squad, text: string): SquadDecision {
  const i = instrument(db, 'OFZ26238');
  const budget = Decimal.min(
    3000,
    new Decimal(s.value).mul('.03'),
    new Decimal(s.cash).div('1.003'),
  );
  const lots = budget.div(new Decimal(i.price).mul(i.lotSize)).floor().toNumber();
  const base = new Decimal(i.price).mul(i.lotSize).mul(lots),
    fee = base.mul('.003').toDecimalPlaces(2);
  const actions: SquadOrder[] =
    lots > 0
      ? [
          {
            id: id(),
            instrumentId: i.id,
            side: 'buy',
            lots,
            quantity: lots * i.lotSize,
            price: i.price,
            base: exact(base),
            fee: exact(fee),
            total: exact(base.plus(fee)),
            status: 'planned',
            leverage: false,
            derivative: false,
          },
        ]
      : [];
  const messages: ChatMessage[] = s.members.slice(0, 4).map((m, n) => ({
    id: id(),
    role: 'agent' as const,
    agentId: m.agentId,
    text:
      n === 0
        ? `Проверим учебную покупку облигаций для цели «${s.goal}».`
        : `${m.name}: сверю концентрацию, расходы и горизонт ${s.horizon}. Правила v${s.revision}.`,
    createdAt: now(),
  }));
  messages.push({
    id: id(),
    role: 'system',
    text: actions.length
      ? `Координатор: один общий план — ${lots} лот. ${i.name}. Нужны согласования или сохранённый мандат всех участников.`
      : 'Свободного виртуального капитала недостаточно даже для одного лота. Сделок не будет.',
    createdAt: now(),
  });
  return {
    id: id(),
    title: actions.length ? `Учебная покупка: ${i.name}` : 'Оставить портфель без изменений',
    status: actions.length ? 'proposed' : 'rejected',
    text,
    approvals: [],
    revision: s.revision,
    createdAt: now(),
    messages,
    plan: {
      actions,
      reason:
        'Ограниченный учебный сценарий ребалансировки. Не прогноз и не реальная рекомендация.',
    },
    execution: { status: 'not_started', orders: [], executedAt: null },
  };
}
function executeCommonPlan(db: MockDb, s: Squad, d: SquadDecision) {
  if (d.status === 'executed') return;
  if (d.status === 'rejected') fail('REJECTED_PLAN', 'План отклонён', 409);
  if (d.revision !== s.revision || d.status === 'stale')
    fail('STALE_PLAN', 'Правила или состав сквада изменились', 409);
  const unanimous = s.members.every((m) => d.approvals.includes(m.userId));
  const mandate =
    s.mode === 'autonomous' && s.members.every((m) => s.ownerConsents.includes(m.userId));
  if (d.proposedStrategy ? !unanimous : !unanimous && !mandate)
    fail(
      'NEED_APPROVAL',
      'Нужно согласие каждого участника или действующий общий автономный мандат',
      409,
    );
  if (d.proposedStrategy) {
    Object.assign(s, d.proposedStrategy);
    s.revision++;
    s.ownerConsents = s.members.map((m) => m.userId);
    d.status = 'executed';
    d.messages.push({
      id: id(),
      role: 'system',
      text: 'Новые правила применены после явно смоделированного согласия команды. Реальных согласий здесь нет.',
      createdAt: now(),
    });
    s.decisions
      .filter((x) => x.id !== d.id && x.status !== 'executed')
      .forEach((x) => (x.status = 'stale'));
    return;
  }
  const actions = d.plan?.actions || [];
  if (!actions.length) fail('NO_ACTIONS', 'В плане нет торговых действий');
  let cash = new Decimal(s.cash);
  const positions = { ...s.positions };
  let fees = new Decimal(0);
  for (const a of actions) {
    const i = instrument(db, a.instrumentId);
    if (a.leverage || a.derivative)
      fail(
        'UNSUPPORTED_RISK_TRADE',
        'Общий демо-исполнитель не поддерживает плечо или производные',
      );
    if (!Number.isInteger(a.lots) || a.lots < 1) fail('INVALID_LOTS', 'Неверное количество лотов');
    if (a.price !== i.price) fail('STALE_QUOTE', 'Цена изменилась — подготовь новый план', 409);
    const base = new Decimal(i.price).mul(i.lotSize).mul(a.lots),
      fee = base.mul('.003').toDecimalPlaces(2);
    fees = fees.plus(fee);
    if (a.side === 'buy') {
      const exposure = new Decimal(i.price).mul(i.lotSize).mul((positions[i.id] || 0) + a.lots);
      if (exposure.gt(new Decimal(s.value).mul(s.maxPositionPercent).div(100)))
        fail('POSITION_LIMIT', 'Покупка превысит общий лимит позиции');
      cash = cash.minus(base).minus(fee);
      positions[i.id] = (positions[i.id] || 0) + a.lots;
    } else {
      if (a.lots > (positions[i.id] || 0))
        fail('INSUFFICIENT_POSITION', 'В общем портфеле недостаточно лотов');
      cash = cash.plus(base).minus(fee);
      positions[i.id] -= a.lots;
    }
    if (cash.lt(0)) fail('INSUFFICIENT_FUNDS', 'Недостаточно общих свободных средств');
  }
  if (fees.gt(s.costLimit)) fail('COST_LIMIT', 'Расходы превышают общий лимит');
  s.cash = exact(cash);
  s.positions = positions;
  s.value = exact(new Decimal(s.value).minus(fees));
  refreshSquad(s);
  const units = s.members.reduce((n, m) => n.plus(m.units), new Decimal(0));
  s.returnPercent = units.gt(0)
    ? new Decimal(s.value).div(units).minus(1).mul(100).toFixed(2)
    : '0.00';
  const orders = actions.map((a) => ({ ...a, id: id(), status: 'executed_demo' as const }));
  s.virtualOrders.push(...orders);
  s.revision++;
  s.decisions
    .filter((item) => item.id !== d.id && item.status !== 'executed')
    .forEach((item) => (item.status = 'stale'));
  d.status = 'executed';
  d.execution = { status: 'executed_demo', orders, executedAt: now() };
  d.messages.push({
    id: id(),
    role: 'system',
    text: `Координатор исполнил ${orders.length} виртуальную операцию. Комиссия ${exact(fees)} ₽. Личный портфель не менялся.`,
    createdAt: now(),
  });
  event(
    db,
    'Учебная операция общего портфеля',
    'squad',
    `Исполнено ${orders.length} виртуальных заявок, расходы ${exact(fees)} ₽.`,
    s.name,
    'Исполнено · демо',
  );
}

export function mutateResource(action: string, input: Record<string, unknown>) {
  const db = getMockDb();
  let result: unknown;
  switch (action) {
    case 'saveConfig': {
      const next = { ...db.config, ...input, revision: db.config.revision + 1 };
      const parsed = configSchema.safeParse(next);
      if (!parsed.success) fail('VALIDATION', parsed.error.issues.map((i) => i.message).join('; '));
      db.config = parsed.data;
      event(
        db,
        'Обновлены правила агента',
        'settings',
        'Сохранена новая версия настроек. Неотправленные планы требуют повторной проверки.',
      );
      activity(db, 'settings', 'Изменены цель и разрешения агента');
      result = db.config;
      break;
    }
    case 'updateProfile': {
      const original = me(db);
      const u = { ...original };
      if (typeof input.name === 'string') {
        const n = input.name.trim();
        if (n.length < 2 || n.length > 32) fail('VALIDATION', 'Имя: от 2 до 32 символов');
        u.name = n;
      }
      if (typeof input.avatar === 'string') {
        if (
          input.avatar.length > 2500000 ||
          (!input.avatar.startsWith('data:image/') && input.avatar !== '')
        )
          fail('VALIDATION', 'Нужен локальный аватар-изображение до 2 МБ');
        u.avatar = input.avatar;
      }
      if (input.privacy) {
        if (!['open', 'results', 'closed'].includes(String(input.privacy)))
          fail('VALIDATION', 'Неизвестная приватность');
        u.privacy = input.privacy as User['privacy'];
      }
      if (typeof input.title === 'string') {
        if (
          input.title !== '' &&
          !db.season.rewards.some((r) => r.claimed && r.kind === 'title' && r.name === input.title)
        )
          fail('NOT_EARNED', 'Титул ещё не получен');
        u.title = input.title;
      }
      Object.assign(original, u);
      result = original;
      break;
    }
    case 'sendMessage': {
      const text = String(input.text || '').trim();
      if (!text || text.length > 3000) fail('VALIDATION', 'Сообщение от 1 до 3000 символов');
      if (!db.chatPending) spendOrdinary(db);
      db.chatPending = false;
      db.chat.push({ id: id(), role: 'user', text, createdAt: now() });
      const a = db.agents.find((a) => a.id === db.config.agentId)!;
      const explicit = text.match(
        /^(?:купи|купить|продай|продать)\s+([A-Z0-9]+)\s+(\d+)\s*(?:лот|лота|лотов)[.!]?\s*$/i,
      );
      if (explicit) {
        try {
          if (/плеч|шорт|фьючер|маржин/i.test(text))
            fail(
              'UNSUPPORTED_RISK_TRADE',
              'Ручной демо-план поддерживает только сделку без плеча и шорта. Такой запрос требует отдельного поддержанного инструмента и проверки разрешений; я не подменяю его обычной покупкой.',
            );
          const side = /прод/i.test(explicit[0]) ? 'sell' : 'buy';
          const preview = mutateResource('previewTrade', {
            instrumentId: explicit[1].toUpperCase(),
            side,
            lots: Number(explicit[2]),
            source: 'agent',
          }) as TradePreview;
          let message =
            'Подготовлен проверенный демо-план. Проверь цену, лоты и комиссию. До подтверждения заявка не исполняется.';
          if (db.config.mode === 'autonomous') {
            mutateResource('confirmTrade', { previewId: preview.id });
            message =
              'Явное поручение исполнено виртуально в автономном режиме после проверки сохранённых разрешений. Реальная заявка не отправлялась.';
          }
          db.chat.push({
            id: id(),
            role: 'agent',
            agentId: a.id,
            text: message,
            createdAt: now(),
            plan: preview,
          });
        } catch (error) {
          db.chat.push({
            id: id(),
            role: 'agent',
            agentId: a.id,
            text: error instanceof Error ? error.message : 'Не удалось подготовить план',
            createdAt: now(),
            choices: ['Обсудить ограничения'],
          });
        }
        result = db.chat;
        break;
      }
      let reply: string;
      let choices: string[] | undefined;
      if (/помен|измен|портфел|риск/i.test(text)) {
        db.chatPending = true;
        reply = `${a.name}: уточни, что важнее — меньше колебаний, больше свободных денег или проверить состав? Наша цель: «${db.config.goal}», горизонт: ${db.config.horizon}. Пока сделки не готовлю.`;
        choices = ['Меньше колебаний', 'Больше свободных денег', 'Проверить текущий состав'];
      } else if (/привет|начн|знаком/i.test(text) && !db.config.onboardingComplete) {
        reply = `Я ${a.name}. ${a.approach} Расскажи, для чего тебе инвестиции и на какой срок? Можно выбрать вариант или написать своими словами. После уточнений покажем настройки, которые ты явно применишь.`;
        choices = ['На несколько лет', 'Хочу разобраться', 'Проверить активную стратегию'];
      } else if (/смотр|сохран|контекст|помни/i.test(text)) {
        reply = `Вижу последние действия: ${
          db.activities
            .slice(0, 4)
            .map((e) => e.text)
            .join('; ') || 'пока нет сохранённых событий'
        }. Они не разрешают сделки. Что продолжим?`;
      } else if (/куп|прод/i.test(text)) {
        reply = `Проверю поручение отдельно. Укажи инструмент и количество лотов; ручная сделка доступна в карточке рынка. Автоматическая отправка по одной фразе не выполняется. Бюджет: ${db.config.budget} ₽, режим: ${db.config.mode === 'confirm' ? 'с подтверждением' : 'автономный в пределах прав'}.`;
      } else {
        reply = `${a.name}: ${a.approach} Учитываю цель «${db.config.goal}» и горизонт ${db.config.horizon}. Уточни, нужен разбор текущего состава или новая идея? Это сценарный ответ демо; реальная LLM не подключена.`;
        choices = ['Разбор состава', 'Сравнить агентов'];
      }
      db.chat.push({
        id: id(),
        role: 'agent',
        agentId: a.id,
        text: reply,
        choices,
        createdAt: now(),
      });
      result = db.chat;
      break;
    }
    case 'previewTrade': {
      const parsed = tradeSchema.safeParse(input);
      if (!parsed.success) fail('VALIDATION', 'Количество лотов должно быть целым и положительным');
      const t = parsed.data;
      if (t.source === 'agent') validateAgentTrade(db, t);
      const i = instrument(db, t.instrumentId);
      const base = new Decimal(i.price).mul(i.lotSize).mul(t.lots),
        fee = base.mul('.003').toDecimalPlaces(2);
      const total = t.side === 'buy' ? base.plus(fee) : base.minus(fee);
      if (t.side === 'buy' && total.gt(db.cash))
        fail('INSUFFICIENT_FUNDS', 'Недостаточно свободных средств');
      if (t.side === 'sell' && t.lots > (db.positions[i.id] || 0))
        fail('INSUFFICIENT_POSITION', 'Недостаточно лотов для продажи');
      const key = id();
      const preview: TradePreview = {
        ...t,
        id: key,
        previewId: key,
        quantity: t.lots * i.lotSize,
        price: i.price,
        base: exact(base),
        fee: exact(fee),
        total: exact(total),
        revision: db.config.revision,
        consumed: false,
        expiresAt: new Date(Date.now() + 120000).toISOString(),
      };
      db.tradePreviews.push(preview);
      result = preview;
      break;
    }
    case 'confirmTrade': {
      const p =
        db.tradePreviews.find((p) => p.id === input.previewId) ||
        fail('NOT_FOUND', 'Предпросмотр не найден');
      if (p.cancelled) fail('PLAN_CANCELLED', 'План отменён', 409);
      if (p.consumed) {
        result = { status: 'already-executed', preview: p };
        break;
      }
      if (p.revision !== db.config.revision || Date.parse(p.expiresAt) < Date.now())
        fail('STALE_PREVIEW', 'План устарел. Подготовь заявку заново', 409);
      if (p.source === 'agent') validateAgentTrade(db, p);
      if (p.side === 'buy' && new Decimal(p.total).gt(db.cash))
        fail('INSUFFICIENT_FUNDS', 'Доступные средства изменились');
      if (p.side === 'sell' && p.lots > (db.positions[p.instrumentId] || 0))
        fail('INSUFFICIENT_POSITION', 'Количество лотов изменилось');
      db.cash = exact(
        new Decimal(db.cash).plus(p.side === 'buy' ? new Decimal(p.total).neg() : p.total),
      );
      db.positions[p.instrumentId] =
        (db.positions[p.instrumentId] || 0) + (p.side === 'buy' ? p.lots : -p.lots);
      p.consumed = true;
      db.chat.forEach((m) => {
        if (m.plan?.id === p.id) m.plan = { ...p };
      });
      const e = event(
        db,
        `${p.side === 'buy' ? 'Покупка' : 'Продажа'} ${p.instrumentId}`,
        'trade',
        `${p.lots} лот. · ${p.total} ₽ · комиссия ${p.fee} ₽. Только виртуальное исполнение.`,
        p.source === 'agent' ? 'Агент по разрешениям' : 'Твоё поручение',
        'Исполнено · демо',
      );
      activity(db, 'trade', e.title, p.instrumentId);
      result = { status: 'executed', preview: p, event: e };
      break;
    }
    case 'rejectAgentPlan': {
      const p =
        db.tradePreviews.find((p) => p.id === input.previewId) ||
        fail('NOT_FOUND', 'План не найден');
      if (p.consumed) fail('ALREADY_EXECUTED', 'План уже исполнен', 409);
      p.cancelled = true;
      db.chat.forEach((m) => {
        if (m.plan?.id === p.id) m.plan = { ...p };
      });
      event(db, 'План агента отклонён', 'analysis', 'Пользователь отклонил план. Сделки не было.');
      result = p;
      break;
    }
    case 'fundPortfolio': {
      const a = String(input.amount || '');
      if (
        !a.trim() ||
        !new Decimal(a).isFinite() ||
        new Decimal(a).lte(0) ||
        new Decimal(a).gt(10000000)
      )
        fail('VALIDATION', 'Укажи сумму от 0,01 до 10 000 000 ₽');
      const currentValue = new Decimal(portfolio(db).value);
      const units = new Decimal(db.performanceUnits || '138916');
      db.performanceUnits = units.plus(new Decimal(a).div(currentValue.div(units))).toString();
      db.cash = exact(new Decimal(db.cash).plus(a));
      db.netContributions = exact(new Decimal(db.netContributions || '138916.00').plus(a));
      event(
        db,
        'Виртуальное пополнение',
        'settings',
        `${a} ₽ добавлено свободными средствами. Это не прибыль.`,
      );
      result = portfolio(db);
      break;
    }
    case 'createSquad': {
      const name = String(input.name || '').trim();
      if (name.length < 2 || name.length > 40) fail('VALIDATION', 'Название: от 2 до 40 символов');
      if (db.squads.filter((s) => s.captainId === 'me' && s.status === 'active').length >= 3)
        fail('SQUAD_LIMIT', 'Доступно три бесплатных сквада');
      const key = id();
      const s: Squad = {
        id: key,
        name,
        code: `TL-${key.toUpperCase()}`,
        captainId: 'me',
        status: 'active',
        ranked: !db.squads.some((group) => group.status === 'active' && group.ranked),
        value: '0.00',
        profit: '0.00',
        returnPercent: '0.00',
        members: [
          {
            id: id(),
            userId: 'me',
            name: me(db).name,
            agentId: db.config.agentId,
            contribution: '0.00',
            units: '0',
            sharePercent: '100',
            value: '0.00',
            profit: '0.00',
          },
        ],
        strategy: 'Пока не определена',
        goal: 'Проверить общую стратегию',
        mode: 'confirm',
        ...squadStrategyDefaults(),
        cash: '0.00',
        positions: {},
        ownerConsents: ['me'],
        virtualOrders: [],
        revision: 1,
        messages: [],
        decisions: [],
        contributions: [],
      };
      db.squads.push(s);
      result = s;
      break;
    }
    case 'joinSquad': {
      const s =
        db.squads.find(
          (s) =>
            s.code.toUpperCase() ===
            String(input.code || '')
              .trim()
              .toUpperCase(),
        ) || fail('INVALID_CODE', 'Код приглашения не найден');
      ensureActive(s);
      if (s.members.some((m) => m.userId === 'me')) {
        result = s;
        break;
      }
      if (s.members.length >= 4) fail('SQUAD_FULL', 'В скваде уже четыре участника');
      s.members.push({
        id: id(),
        userId: 'me',
        name: me(db).name,
        agentId: db.config.agentId,
        contribution: '0.00',
        units: '0',
        sharePercent: '0',
        value: '0.00',
        profit: '0.00',
      });
      s.revision++;
      result = s;
      break;
    }
    case 'squadMessage': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      const text = String(input.text || '').trim();
      if (!text || text.length > 3000) fail('VALIDATION', 'Добавь сообщение до 3 000 символов');
      s.messages.push({ id: id(), role: 'user', text, createdAt: now() });
      if (/@Макс|@Лев|@Чилл|совет|план/i.test(text)) {
        const d = squadTradePlan(db, s, text);
        s.decisions.unshift(d);
        s.messages.push(...d.messages);
        if (
          s.mode === 'autonomous' &&
          d.plan?.actions.length &&
          s.members.every((m) => s.ownerConsents.includes(m.userId))
        ) {
          executeCommonPlan(db, s, d);
        }
      }
      result = s.messages;
      break;
    }
    case 'saveSquadStrategy': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      const parsed = squadStrategySchema.safeParse({ ...s, ...input });
      if (!parsed.success) fail('VALIDATION', parsed.error.issues.map((i) => i.message).join('; '));
      const proposedStrategy = parsed.data;
      s.decisions.unshift({
        id: id(),
        title: 'Изменение стратегии сквада',
        text: 'Предложена новая стратегия. Действующие правила пока не меняются.',
        status: 'proposed',
        approvals: [],
        revision: s.revision,
        createdAt: now(),
        messages: [],
        proposedStrategy,
      });
      result = s;
      break;
    }
    case 'approveSquadDecision':
    case 'simulateSquadApproval':
    case 'executeSquadDecision':
    case 'rejectSquadDecision': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      const d =
        s.decisions.find((d) => d.id === input.decisionId) ||
        fail('NOT_FOUND', 'Решение не найдено');
      if (d.status === 'executed') {
        result = d;
        break;
      }
      if (d.revision !== s.revision || d.status === 'stale')
        fail('STALE_PLAN', 'Правила изменились — подготовь новый план', 409);
      if (d.status === 'rejected') fail('REJECTED_PLAN', 'План уже отклонён', 409);
      if (action === 'rejectSquadDecision') {
        d.status = 'rejected';
        d.messages.push({
          id: id(),
          role: 'user',
          text: 'План отклонён. Общие средства не изменились.',
          createdAt: now(),
        });
      } else if (action === 'approveSquadDecision') {
        if (!d.approvals.includes('me')) d.approvals.push('me');
        d.status = s.members.every((m) => d.approvals.includes(m.userId)) ? 'approved' : 'proposed';
        d.messages.push({
          id: id(),
          role: 'user',
          text: 'Владелец подтвердил только за себя.',
          createdAt: now(),
        });
      } else if (action === 'simulateSquadApproval') {
        d.approvals = s.members.map((m) => m.userId);
        d.status = 'approved';
        d.messages.push({
          id: id(),
          role: 'system',
          text: 'Согласие остальных участников явно смоделировано. Это не реальные согласия людей.',
          createdAt: now(),
        });
      } else executeCommonPlan(db, s, d);
      result = d;
      break;
    }
    case 'simulateSquadMandate': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      s.ownerConsents = s.members.map((m) => m.userId);
      event(
        db,
        'Автономный мандат команды · симуляция',
        'squad',
        'Явная виртуальная имитация согласия участников, не реальные права.',
      );
      result = s;
      break;
    }
    case 'inviteDemoMember': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      if (s.members.length >= 4) fail('SQUAD_FULL', 'В скваде уже четыре участника');
      const name = String(input.name || '').trim();
      if (name.length < 2 || name.length > 32) fail('VALIDATION', 'Имя друга: от 2 до 32 символов');
      const agentId = String(input.agentId);
      if (!db.agents.some((a) => a.id === agentId)) fail('VALIDATION', 'Выбери агента');
      s.members.push({
        id: id(),
        userId: 'guest-' + id(),
        name,
        agentId: agentId as AgentConfig['agentId'],
        contribution: '0.00',
        units: '0',
        sharePercent: '0',
        value: '0.00',
        profit: '0.00',
      });
      s.revision++;
      s.decisions.filter((d) => d.status !== 'executed').forEach((d) => (d.status = 'stale'));
      refreshSquad(s);
      result = s;
      break;
    }
    case 'proposeContribution': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      memberMe(s);
      const a = String(input.amount || '');
      if (
        !a.trim() ||
        !new Decimal(a).isFinite() ||
        new Decimal(a).lte(0) ||
        new Decimal(a).gt(10000000)
      )
        fail('VALIDATION', 'Нужен положительный взнос до 10 000 000 ₽');
      const request = {
        id: id(),
        userId: 'me',
        amount: exact(a),
        status: 'pending' as const,
        approvals: ['me'],
        createdAt: now(),
      };
      s.contributions.push(request);
      result = request;
      break;
    }
    case 'approveContribution': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      const r =
        s.contributions.find((r) => r.id === input.requestId) ||
        fail('NOT_FOUND', 'Предложение не найдено');
      if (r.status === 'approved') {
        result = s;
        break;
      }
      const totalUnits = s.members.reduce((n, m) => n.plus(m.units), new Decimal(0));
      const nav = totalUnits.eq(0) ? new Decimal(1) : new Decimal(s.value).div(totalUnits);
      if (nav.lte(0) || !nav.isFinite())
        fail('INVALID_NAV', 'Стоимость доли не позволяет принять взнос без отдельного расчёта');
      const m = memberMe(s);
      m.units = new Decimal(m.units).plus(new Decimal(r.amount).div(nav)).toString();
      m.contribution = exact(new Decimal(m.contribution).plus(r.amount));
      s.value = exact(new Decimal(s.value).plus(r.amount));
      s.cash = exact(new Decimal(s.cash).plus(r.amount));
      r.status = 'approved';
      r.approvals = s.members.map((m) => m.userId);
      s.revision++;
      refreshSquad(s);
      event(
        db,
        'Допвзнос одобрен · симуляция',
        'squad',
        'Виртуальная симуляция одобрения команды. Реальный порог голосов ещё согласуется.',
        'Демо',
        'Учтён по текущей стоимости доли',
      );
      result = s;
      break;
    }
    case 'exitPreview': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      const preview = previewExit(db, s);
      db.exitPreviews.push(preview);
      result = preview;
      break;
    }
    case 'confirmExit': {
      const p =
        db.exitPreviews.find((p) => p.id === input.previewId) ||
        fail('NOT_FOUND', 'Расчёт не найден');
      const s = squad(db, p.squadId);
      if (p.consumed) {
        result = p;
        break;
      }
      ensureActive(s);
      if (s.revision !== p.revision)
        fail('STALE_PREVIEW', 'Стоимость или состав изменились. Пересчитай выход', 409);
      const remaining = new Decimal(s.value).minus(p.value);
      const factor = new Decimal(s.value).gt(0) ? remaining.div(s.value) : new Decimal(0);
      Object.keys(s.positions).forEach((key) => {
        s.positions[key] = new Decimal(s.positions[key]).mul(factor).floor().toNumber();
      });
      const remainingInvested = db.instruments.reduce(
        (n, i) => n.plus(new Decimal(i.price).mul(i.lotSize).mul(s.positions[i.id] || 0)),
        new Decimal(0),
      );
      s.cash = exact(remaining.minus(remainingInvested));
      s.value = exact(remaining);
      s.members = s.members.filter((m) => m.userId !== p.memberId);
      if (!s.members.length) s.status = 'archived';
      s.revision++;
      refreshSquad(s);
      p.consumed = true;
      s.myExit = { ...p };
      event(
        db,
        'Полный выход из сквада · демо',
        'squad',
        `Учебная стоимость доли ${p.value} ₽, расходы ${p.fee} ₽, условный налог ${p.tax} ₽, расчёт ${p.payout} ₽. Реальная выплата не выполнялась.`,
      );
      result = p;
      break;
    }
    case 'dissolvePreview': {
      const s = squad(db, String(input.squadId));
      ensureActive(s);
      if (s.captainId !== 'me') fail('FORBIDDEN', 'Только капитан инициирует расформирование', 403);
      const preview: DissolvePreview = {
        id: id(),
        squadId: s.id,
        revision: s.revision,
        members: s.members.map((m) => previewExit(db, s, m.userId)),
        consumed: false,
      };
      db.dissolvePreviews.push(preview);
      result = preview;
      break;
    }
    case 'confirmDissolve': {
      const p =
        db.dissolvePreviews.find((p) => p.id === input.previewId) ||
        fail('NOT_FOUND', 'Расчёт не найден');
      const s = squad(db, p.squadId);
      if (p.consumed) {
        result = p;
        break;
      }
      if (s.revision !== p.revision) fail('STALE_PREVIEW', 'Данные сквада изменились', 409);
      ensureActive(s);
      s.status = 'archived';
      s.archivedAt ??= now();
      s.revision++;
      p.consumed = true;
      event(
        db,
        'Сквад архивирован · демо',
        'squad',
        'Снимок распределения сохранён. Личный денежный остаток не менялся.',
      );
      result = p;
      break;
    }
    case 'claimReward': {
      const r =
        db.season.rewards.find((r) => r.id === input.rewardId) ||
        fail('NOT_FOUND', 'Награда не найдена');
      if (r.claimed) {
        result = r;
        break;
      }
      if (r.level > db.season.level) fail('LEVEL_LOCKED', 'Нужен следующий уровень');
      if (r.premium && db.planId === 'start')
        fail('PREMIUM_REQUIRED', 'Награда доступна с Плюс или Сквад');
      r.claimed = true;
      result = r;
      break;
    }
    case 'applyReward': {
      const r =
        db.season.rewards.find((r) => r.id === input.rewardId) ||
        fail('NOT_FOUND', 'Награда не найдена');
      if (!r.claimed) fail('NOT_EARNED', 'Сначала получи эту награду');
      if (r.kind === 'title') {
        me(db).title = r.name;
        result = { reward: r, title: r.name };
      } else if (r.kind === 'theme') {
        result = { reward: r, theme: 'dark' };
      } else {
        result = { reward: r };
      }
      activity(db, 'reward', 'Применена награда ' + r.name);
      break;
    }
    case 'subscribePlan': {
      if (!plans.some((p) => p.id === input.planId)) fail('VALIDATION', 'Неизвестный пакет');
      db.planId = input.planId as MockDb['planId'];
      activity(db, 'plan', 'Демо-выбор пакета ' + db.planId);
      result = plans.find((p) => p.id === db.planId);
      break;
    }
    case 'follow': {
      const u = db.users.find((u) => u.id === input.userId) || fail('NOT_FOUND', 'Игрок не найден');
      u.following = !u.following;
      activity(db, 'follow', (u.following ? 'Подписка на ' : 'Отписка от ') + u.name);
      result = u;
      break;
    }
    case 'compare': {
      const a = db.agents.find((a) => a.id === input.agentA),
        b = db.agents.find((a) => a.id === input.agentB);
      if (!a || !b || a.id === b.id) fail('VALIDATION', 'Выбери двух разных агентов');
      const budget = String(input.budget || '');
      if (!budget.trim() || new Decimal(budget).lt(1000)) fail('VALIDATION', 'Бюджет от 1 000 ₽');
      spendOrdinary(db);
      const resultData: Comparison = {
        id: id(),
        task: String(input.task || 'Собрать долгосрочный портфель'),
        budget: exact(budget),
        results: [a, b].map((agent) => ({
          agent,
          reasoning: agent.approach,
          actions: [
            'Проверить цель и доступные данные',
            'Рассчитать последствия до сделки',
            'Действовать только в разрешённых пределах',
          ],
        })),
      };
      db.comparisons.unshift(resultData);
      activity(db, 'comparison', `Сравнение ${a.name} и ${b.name}: ${resultData.task}`);
      result = resultData;
      break;
    }
    case 'trackActivity': {
      activity(
        db,
        String(input.type || 'view'),
        String(input.text || 'Просмотр'),
        typeof input.instrumentId === 'string' ? input.instrumentId : undefined,
      );
      result = db.activities[0];
      break;
    }
    case 'resetDemo': {
      resetMockDb();
      return { reset: true };
    }
    case 'setObservationPaused': {
      if (!db.observation) fail('NOT_FOUND', 'Сохранённая идея не найдена', 404);
      if (typeof input.paused !== 'boolean') fail('VALIDATION', 'Укажи состояние наблюдения');
      db.observation!.paused = input.paused as boolean;
      activity(
        db,
        'saved',
        input.paused ? 'Наблюдение за идеей приостановлено' : 'Наблюдение за идеей возобновлено',
      );
      result = db.observation;
      break;
    }
    case 'saveIdea': {
      if (input.comparisonId) {
        const comparison = db.comparisons.find((c) => c.id === input.comparisonId);
        if (!comparison) fail('NOT_FOUND', 'Сравнение не найдено', 404);
        db.observation = {
          comparison: structuredClone(comparison!),
          paused: false,
          createdAt: now(),
        };
      }
      activity(db, 'saved', String(input.text || 'Сохранена идея'));
      event(db, 'Сохранена идея', 'analysis', String(input.text || ''));
      result = db.activities[0];
      break;
    }
    default:
      return fail('NOT_FOUND', 'Команда не найдена', 404);
  }
  persistMockDb(db);
  return result;
}
