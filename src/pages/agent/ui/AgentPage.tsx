import { useOverview } from '../../../entities/portfolio';
import { AgentSettings } from '../../../features/agent-settings';
import { useSessionStore } from '../../../entities/session/model/store';
import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import {
  useAgents,
  useConfig,
  useSaveConfig,
  useChat,
  useSendMessage,
  useRejectAgentPlan,
  useActivities,
} from '../../../entities/agent';
import { useConfirmTrade } from '../../../entities/market';
import type {
  AgentConfig,
  AgentId,
  TradePreview,
  AgentOnboardingDraft,
} from '../../../shared/api/contracts';
import {
  Button,
  PageHeading,
  Loading,
  QueryError,
  Chip,
  fmt,
  s,
  useNotice,
} from '../../../shared/ui';
import { AgentAvatar, personas } from '../../../widgets/investment-ui';
import css from './agent.module.css';
const agentIds: AgentId[] = ['max', 'lev', 'chill'];
const steps = [
  {
    key: 'goal',
    question:
      'Чего хочешь добиться с этим портфелем? Можно выбрать вариант или написать своими словами.',
    choices: ['Накопить на цель', 'Разобраться в инвестициях', 'Проверить активную стратегию'],
  },
  {
    key: 'horizon',
    question: 'На какой срок планируешь вложения?',
    choices: ['До года', '1–3 года', 'Больше 3 лет'],
  },
  {
    key: 'priority',
    question: 'Что важнее при выборе решений?',
    choices: ['Меньше колебаний', 'Гибкость и свободные деньги', 'Рост на длинном горизонте'],
  },
  {
    key: 'budget',
    question:
      'Какой бюджет выделишь агенту? Напиши сумму в рублях. Это лимит, а не пополнение счёта.',
    choices: ['30000', '50000', '100000'],
  },
  {
    key: 'mode',
    question: 'Как исполнять торговые решения?',
    choices: ['С подтверждением', 'Автономно в пределах правил'],
  },
  {
    key: 'tools',
    question:
      'Оставим базовые ограничения или настроим их? По умолчанию плечо, шорты и производные выключены.',
    choices: ['Оставить базовые пределы', 'Настроить ограничения'],
  },
  { key: 'leverage', question: 'Разрешить использование плеча?', choices: ['Нет', 'Да'] },
  {
    key: 'maxLeverage',
    question: 'Какой максимальный множитель плеча? Допустимо от 1 до 5.',
    choices: ['1.5', '2', '3'],
  },
  { key: 'short', question: 'Разрешить короткие позиции?', choices: ['Нет', 'Да'] },
  { key: 'derivatives', question: 'Разрешить производные инструменты?', choices: ['Нет', 'Да'] },
  {
    key: 'maxPositionPercent',
    question:
      'Какую максимальную долю портфеля может занимать один инструмент? Укажи процент от 1 до 100.',
    choices: ['10', '15', '20'],
  },
  {
    key: 'costLimit',
    question: 'Какой лимит расходов задать? Укажи сумму в рублях. Это демонстрационный предел.',
    choices: ['500', '1000', '2000'],
  },
  {
    key: 'communication',
    question: 'Как тебе удобнее общаться?',
    choices: ['Деловое', 'Дружеское', 'Энергичное'],
  },
];
function wizardDraft(cfg: AgentConfig): AgentOnboardingDraft {
  return {
    agentId: cfg.agentId,
    step: 0,
    deferred: false,
    goal: cfg.goal,
    priority: cfg.priority || '',
    horizon: cfg.horizon,
    budget: cfg.budget,
    mode: 'confirm',
    leverage: false,
    short: false,
    derivatives: false,
    maxPositionPercent: cfg.maxPositionPercent,
    maxLeverage: cfg.maxLeverage,
    costLimit: cfg.costLimit,
    instruments: [...cfg.instruments],
    communication: cfg.communication,
  };
}
export function AgentPage() {
  const overview = useOverview(),
    agents = useAgents(),
    config = useConfig(),
    chat = useChat(),
    save = useSaveConfig(),
    send = useSendMessage(),
    confirm = useConfirmTrade(),
    reject = useRejectAgentPlan(),
    activities = useActivities(),
    [choice, setChoice] = useState<AgentId>('max'),
    [text, setText] = useState(''),
    [memoryOpen, setMemoryOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [preview, setPreview] = useState<TradePreview | null>(null);
  const onboarding = useSessionStore((v) => v.onboardingDraft),
    setOnboarding = useSessionStore((v) => v.setOnboardingDraft),
    patchOnboarding = useSessionStore((v) => v.patchOnboardingDraft),
    deferOnboarding = useSessionStore((v) => v.deferOnboarding),
    resumeOnboarding = useSessionStore((v) => v.resumeOnboarding),
    clearOnboarding = useSessionStore((v) => v.clearOnboardingDraft),
    step = onboarding?.step ?? 0;
  useEffect(() => {
    if (config.data?.agentSelected && !config.data.onboardingComplete && !onboarding)
      setOnboarding(wizardDraft(config.data));
  }, [config.data, onboarding, setOnboarding]);
  const end = useRef<HTMLDivElement>(null),
    { notify, element } = useNotice();
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [chat.data?.length, step]);
  if (config.isPending || agents.isPending) return <Loading />;
  if (config.error) return <QueryError error={config.error} retry={() => config.refetch()} />;
  const cfg = config.data!,
    list = agents.data || [],
    selected = list.find((a) => a.id === cfg.agentId),
    selectedIndex = agentIds.indexOf(cfg.agentId),
    picked = Boolean(cfg.agentSelected || cfg.onboardingComplete || onboarding),
    draft = onboarding || wizardDraft(cfg),
    recentActivity = (activities.data || []).filter((a) => a.type !== 'screen'),
    ruleLines = [
      ['Цель', cfg.goal || 'Пока не задана — уточним в разговоре'],
      ['Бюджет', fmt(cfg.budget)],
      [
        'Режим',
        `${cfg.paused ? 'На паузе · ' : ''}${cfg.mode === 'autonomous' ? 'Автономно в заданных пределах' : 'С подтверждением каждой торговой команды'}`,
      ],
      [
        'Инструменты',
        `Акции, облигации, фонды и другие доступные инструменты; производные ${cfg.derivatives ? 'разрешены' : 'выключены'}`,
      ],
      ['Плечо', cfg.leverage ? `Разрешено до ×${cfg.maxLeverage}` : 'Выключено'],
      ['Шорты', cfg.short ? 'Разрешены' : 'Выключены'],
      ['Позиция', `До ${cfg.maxPositionPercent}% на инструмент`],
      ['Расходы', `До ${fmt(cfg.costLimit)}`],
      [
        'Общение',
        { business: 'Деловой', friendly: 'Дружеский', energetic: 'На драйве' }[cfg.communication],
      ],
    ];
  if (cfg.horizon) ruleLines.splice(1, 0, ['Горизонт', cfg.horizon]);
  if (cfg.priority) ruleLines.splice(2, 0, ['Приоритет', cfg.priority]);
  const setupSummary = `Вот как я понял нашу задачу:\nЦель: ${draft.goal || cfg.goal}\nГоризонт: ${draft.horizon || cfg.horizon}\nПриоритет: ${draft.priority || 'Не задан'}\nБюджет: ${fmt(draft.budget || cfg.budget)}\nИсполнение: ${draft.mode === 'autonomous' ? 'автономно в заданных пределах' : 'с подтверждением каждой торговой команды'}\nПлечо: ${draft.leverage ? 'до ×' + draft.maxLeverage : 'выключено'}; шорты: ${draft.short ? 'разрешены' : 'выключены'}; производные: ${draft.derivatives ? 'разрешены' : 'выключены'}\nПозиция: до ${draft.maxPositionPercent}%; расходы: до ${fmt(draft.costLimit)}.\n\nПока это черновик. Применим эти правила?`;
  async function choose() {
    try {
      await save.mutateAsync({ agentId: choice, agentSelected: true, paused: true });
      setOnboarding({ ...wizardDraft(cfg), agentId: choice });
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  function setupReply(value: string) {
    const v = value.trim(),
      current = steps[step];
    if (!v || !current) return;
    let patch: Partial<AgentOnboardingDraft> = {},
      next = step + 1;
    if (['budget', 'maxLeverage', 'maxPositionPercent', 'costLimit'].includes(current.key)) {
      const raw = v.replace(/\s|₽|%/g, '').replace(',', '.');
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
        notify('Укажи число');
        return;
      }
      const n = Number(raw),
        valid =
          current.key === 'budget'
            ? n >= 1000
            : current.key === 'maxLeverage'
              ? n >= 1 && n <= 5
              : current.key === 'maxPositionPercent'
                ? n >= 1 && n <= 100
                : n >= 0;
      if (!valid) {
        notify(
          current.key === 'budget'
            ? 'Бюджет от 1 000 ₽'
            : current.key === 'maxLeverage'
              ? 'Предел плеча от 1 до 5'
              : current.key === 'maxPositionPercent'
                ? 'Доля от 1 до 100%'
                : 'Расходы не могут быть отрицательными',
        );
        return;
      }
      patch = { [current.key]: raw };
    } else if (current.key === 'mode') {
      if (!current.choices.includes(v)) {
        notify('Выбери режим одной из кнопок');
        return;
      }
      patch = { mode: v === 'С подтверждением' ? 'confirm' : 'autonomous' };
    } else if (current.key === 'tools') {
      if (!current.choices.includes(v)) {
        notify('Выбери вариант настройки');
        return;
      }
      if (v === 'Оставить базовые пределы') {
        patch = { leverage: false, short: false, derivatives: false };
        next = 12;
      }
    } else if (['leverage', 'short', 'derivatives'].includes(current.key)) {
      if (!['Да', 'Нет'].includes(v)) {
        notify('Укажи явно «Да» или «Нет»');
        return;
      }
      patch = { [current.key]: v === 'Да' };
      if (current.key === 'leverage' && v === 'Нет') next = 8;
    } else if (current.key === 'communication') {
      const values: Record<string, AgentConfig['communication']> = {
        Деловое: 'business',
        Дружеское: 'friendly',
        Энергичное: 'energetic',
      };
      if (!values[v]) {
        notify('Выбери стиль общения');
        return;
      }
      patch = { communication: values[v] };
    } else patch = { [current.key]: v.slice(0, 500) };
    patchOnboarding({ ...patch, step: next });
    setText('');
  }
  async function applySetup() {
    try {
      const { step: _step, deferred: _deferred, ...rules } = draft;
      await save.mutateAsync({
        ...rules,
        agentId: cfg.agentId,
        onboardingComplete: true,
        paused: false,
      });
      clearOnboarding();
      notify('Правила сохранены. Начнём работу.');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function submit(value: string) {
    if (!cfg.onboardingComplete && !draft.deferred) {
      if (step < steps.length) setupReply(value);
      else
        notify(
          'Применение правил — только кнопкой «Применить». Можно вернуться и изменить ответы.',
        );
      return;
    }
    if (!value.trim()) return;
    try {
      await send.mutateAsync({ text: value.trim() });
      setText('');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  if (!picked)
    return (
      <div>
        <PageHeading
          title="Выбери напарника"
          description="Под свой стиль инвестирования. Позже персонажа можно сменить в настройках агента."
        />
        <div className={css.personas}>
          {list.map((a) => (
            <button
              key={a.id}
              className={`${css.persona} ${choice === a.id ? css.chosen : ''}`}
              onClick={() => setChoice(a.id)}
              aria-pressed={choice === a.id}
            >
              <AgentAvatar index={agentIds.indexOf(a.id)} size={72} />
              <div>
                <b>{a.name}</b>
                <small>{personas[agentIds.indexOf(a.id)]?.description || a.description}</small>
              </div>
              <span className={css.check}>{choice === a.id && <Check size={12} />}</span>
            </button>
          ))}
        </div>
        <Button full onClick={choose} disabled={save.isPending} className={css.start}>
          Начать общение
        </Button>
        {save.error && <QueryError error={save.error} />}
        <p className={s.muted} style={{ fontSize: 10, marginTop: 13 }}>
          Выбор персонажа не расширяет торговые разрешения. Бюджет, режим и ограничения
          настраиваются отдельно.
        </p>
      </div>
    );
  return (
    <div className={css.chat}>
      {settingsOpen && <AgentSettings asSheet onClose={() => setSettingsOpen(false)} />}
      <header className={css.header}>
        <div className={s.flex}>
          <span className={css.thumb}>
            <AgentAvatar index={selectedIndex} size={36} />
          </span>
          <div>
            <h1>{selected?.name}</h1>
            <small>
              {cfg.paused
                ? 'На паузе'
                : cfg.mode === 'confirm'
                  ? 'С подтверждением'
                  : 'Автономный режим'}
            </small>
          </div>
        </div>
        <Button variant="secondary" small onClick={() => setSettingsOpen(true)}>
          Настроить агента
        </Button>
      </header>
      {recentActivity.length > 0 && (
        <div className={css.context}>
          <span>Контекст действий сохранён</span>
          <Button
            variant="ghost"
            small

            onClick={() => setMemoryOpen(true)}
          >
            Что я помню →
          </Button>
        </div>
      )}
      <details className={css.rules}>
        <summary>Текущие правила</summary>
        <div className={css.rulesBody}>
          {ruleLines.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <p>Сохранённые настройки Т-Лиги. Доступность у брокера проверяется отдельно.</p>
        </div>
      </details>
      {!cfg.onboardingComplete && draft.deferred && (
        <button className={css.resumeSetup} onClick={resumeOnboarding}>
          Настройка не завершена · Продолжить →
        </button>
      )}
      <div className={css.messages} aria-live="polite">
        {!cfg.onboardingComplete && draft.deferred && (
          <>
            {step >= steps.length && <div className={css.bubble}>{setupSummary}</div>}
            <div className={css.bubble}>
              Настройку можно продолжить позже. Черновик не применён.
              {cfg.paused ? ' Агент пока на паузе.' : ''}
            </div>
          </>
        )}
        {!cfg.onboardingComplete && !draft.deferred ? (
          <>
            <div className={css.bubble}>
              {
                [
                  'Я Макс. Ищу краткосрочные возможности и заранее определяю условия выхода. Но сначала настроим, как будем работать.',
                  'Я Лев. Предпочитаю вдумчивый выбор активов и более длительный горизонт. Сначала разберёмся с твоей задачей.',
                  'Я Чилл. Помогаю держать баланс портфеля и избегать лишней суеты. Сначала определим цель и правила.',
                ][selectedIndex]
              }
            </div>
            {step < steps.length ? (
              <div className={css.bubble}>{steps[step].question}</div>
            ) : (
              <div className={css.bubble}>
                {setupSummary}
                {save.error && <QueryError error={save.error} />}
              </div>
            )}
          </>
        ) : chat.isPending ? (
          <Loading />
        ) : chat.error ? (
          <QueryError error={chat.error} />
        ) : chat.data?.length ? (
          chat.data.map((m) => (
            <div key={m.id} className={`${css.bubble} ${m.role === 'user' ? css.mine : ''}`}>
              <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
              {m.plan && (
                <div className={css.plan}>
                  <Chip>
                    {m.plan.cancelled
                      ? 'Отклонён · сделки не было'
                      : m.plan.consumed
                        ? 'Исполнено'
                        : 'План операции'}
                  </Chip>
                  <h3>
                    {m.plan.side === 'buy' ? 'Купить' : 'Продать'} {m.plan.instrumentId} ·{' '}
                    {m.plan.lots} лот.
                  </h3>
                  <p>
                    Стоимость {fmt(m.plan.base)} · Комиссия {fmt(m.plan.fee)}
                  </p>
                  <b>Итого {fmt(m.plan.total)}</b>
                  {!m.plan.consumed && !m.plan.cancelled && (
                    <div className={s.actions} style={{ marginTop: 13 }}>
                      <Button onClick={() => setPreview(m.plan!)} small>
                        Проверить и подтвердить
                      </Button>
                      <Button
                        variant="secondary"
                        small
                        disabled={reject.isPending}
                        onClick={() => reject.mutate({ previewId: m.plan!.id })}
                      >
                        Отклонить план
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : !cfg.onboardingComplete && draft.deferred ? null : (
          <div className={css.bubble}>
            Привет, {overview.data?.user.name || 'Артём'}. Я {selected?.name}. Расскажи, чего хочешь
            добиться — уточню детали и предложу следующий шаг. Торговые разрешения можно проверить в
            настройках.
          </div>
        )}
        <div ref={end} />
      </div>
      <div className={css.suggestions}>
        {!cfg.onboardingComplete && !draft.deferred && step < steps.length ? (
          steps[step].choices.map((c) => (
            <button key={c} onClick={() => setupReply(c)}>
              {steps[step].key === 'budget' ? fmt(c) : c}
            </button>
          ))
        ) : cfg.onboardingComplete || draft.deferred ? (
          [
            'Может, что-нибудь поменяем в портфеле?',
            'Почему лидер выше меня?',
            'Что я сохранил?',
          ].map((t) => (
            <button key={t} onClick={() => submit(t)}>
              {t}
            </button>
          ))
        ) : (
          <>
            <button className={css.applySetup} onClick={applySetup} disabled={save.isPending}>
              Применить
            </button>
            <button onClick={() => patchOnboarding({ step: 0 })}>Изменить</button>
            <button onClick={deferOnboarding}>Отложить</button>
          </>
        )}
      </div>
      {send.error && <QueryError error={send.error} />}
      {reject.error && <QueryError error={reject.error} />}
      <form
        className={css.composer}
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <input
          aria-label="Сообщение агенту"
          placeholder="Напиши своими словами…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button aria-label="Отправить" type="submit" disabled={send.isPending || !text.trim()}>
          ↑
        </Button>
      </form>
      <div className={css.demoCaption}>Демо-диалог · LLM и реальный рынок не подключены</div>
      <ModalPlan
        quote={preview}
        close={() => setPreview(null)}
        confirm={async () => {
          if (!preview) return;
          try {
            await confirm.mutateAsync({ previewId: preview.id });
            setPreview(null);
            notify('План агента исполнен в демо');
          } catch {
            /* Mutation error is shown in the form. */
          }
        }}
        pending={confirm.isPending}
        error={confirm.error}
      />
      <Modal
        open={memoryOpen}
        onOpenChange={setMemoryOpen}
        title="Контекст агента"
        description="Просмотры и сохранённые идеи помогают продолжить разговор, но не разрешают торговлю."
      >
        {activities.isPending ? (
          <Loading />
        ) : activities.error ? (
          <QueryError error={activities.error} />
        ) : recentActivity.length ? (
          <div>
            {recentActivity.slice(0, 8).map((a) => (
              <div key={a.id} className={s.listrow}>
                <span>
                  <b>{a.text}</b>
                  <small>
                    {new Date(a.createdAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={s.muted}>Пока нет сохранённых действий.</p>
        )}
      </Modal>
      {element}
    </div>
  );
}
import { Modal } from '../../../shared/ui';
function ModalPlan({
  quote,
  close,
  confirm,
  pending,
  error,
}: {
  quote: TradePreview | null;
  close: () => void;
  confirm: () => void;
  pending: boolean;
  error: unknown;
}) {
  return (
    <Modal open={Boolean(quote)} onOpenChange={close} title="Подтвердить план агента">
      {quote && (
        <div className={s.form}>
          <p>
            {quote.side === 'buy' ? 'Покупка' : 'Продажа'} {quote.instrumentId} · {quote.lots} лот.
          </p>
          <div className={s.row}>
            <span>Комиссия</span>
            <b>{fmt(quote.fee)}</b>
          </div>
          <div className={s.row}>
            <span>Итого</span>
            <b>{fmt(quote.total)}</b>
          </div>
          {Boolean(error) && <QueryError error={error} />}
          <div className={s.actions}>
            <Button variant="secondary" onClick={close}>
              Отмена
            </Button>
            <Button disabled={pending} onClick={confirm}>
              Подтвердить операцию
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
