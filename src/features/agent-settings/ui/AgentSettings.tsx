import css from './agent-settings.module.css';
import { useOverview } from '../../../entities/portfolio';
import { useUpdateProfile } from '../../../entities/profile';
import { useResetDemo } from '../../../entities/session';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { useConfig, useSaveConfig, useAgents } from '../../../entities/agent';
import { useSessionStore } from '../../../entities/session/model/store';
import type { AgentConfig } from '../../../shared/api/contracts';
import {
  PageHeading,
  Modal,
  Button,
  Loading,
  QueryError,
  s,
  fmt,
  useNotice,
} from '../../../shared/ui';
const numeric = z.object({
  budget: z
    .string()
    .min(1)
    .refine(
      (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 1000 && Number(v) <= 100000000,
      'Укажи сумму от 1 000 до 100 000 000 ₽',
    ),
  maxPositionPercent: z
    .string()
    .min(1)
    .refine((v) => Number(v) > 0 && Number(v) <= 100, 'От 1 до 100%'),
  maxLeverage: z
    .string()
    .min(1)
    .refine((v) => Number(v) >= 1 && Number(v) <= 5, 'От 1 до 5'),
  costLimit: z
    .string()
    .min(1)
    .refine((v) => Number(v) >= 0 && Number.isFinite(Number(v)), 'Неотрицательная сумма'),
});
export function AgentSettings({
  asSheet = false,
  onClose,
}: {
  asSheet?: boolean;
  onClose?: () => void;
}) {
  const overview = useOverview(),
    updateProfile = useUpdateProfile();
  const [themeDraft, setThemeDraft] = useState('light'),
    [privacyDraft, setPrivacyDraft] = useState('open');
  const reset = useResetDemo(),
    resetClient = useSessionStore((v) => v.resetClientSettings),
    navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false),
    [resetConfirmed, setResetConfirmed] = useState(false);
  const query = useConfig(),
    save = useSaveConfig(),
    agents = useAgents(),
    theme = useSessionStore((v) => v.theme),
    setTheme = useSessionStore((v) => v.setTheme);
  const [limitEditor, setLimitEditor] = useState<
      'maxPositionPercent' | 'maxLeverage' | 'costLimit' | null
    >(null),
    [limitValue, setLimitValue] = useState('');
  const [editor, setEditor] = useState(''),
    [draft, setDraft] = useState<AgentConfig | null>(null),
    { notify, element } = useNotice();
  if (query.isPending) return <Loading />;
  if (query.error) return <QueryError error={query.error} retry={() => query.refetch()} />;
  const cfg = query.data!;
  function open(key: string) {
    setDraft({ ...cfg, instruments: [...cfg.instruments] });
    setThemeDraft(theme);
    setPrivacyDraft(overview.data?.user.privacy || 'open');
    setLimitEditor(null);
    setEditor(key);
  }
  async function apply() {
    if (editor === 'theme') {
      setTheme(themeDraft as 'light' | 'dark');
      closeEditor();
      return;
    }
    if (editor === 'privacy') {
      await updateProfile.mutateAsync({ privacy: privacyDraft as 'open' | 'results' | 'closed' });
      closeEditor();
      return;
    }
    if (!draft) return;
    const parsed = numeric.safeParse(draft);
    if (!parsed.success) {
      notify(parsed.error.issues[0].message);
      return;
    }
    if (!draft.goal.trim()) {
      notify('Опиши свою цель');
      return;
    }
    try {
      await save.mutateAsync(draft);
      closeEditor();
      notify('Правила сохранены');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  function closeEditor() {
    setLimitEditor(null);
    setEditor('');
    if (asSheet) onClose?.();
  }
  const d = draft || cfg;
  const limitFields = {
    maxPositionPercent: ['Максимальная позиция', 'Доля одного инструмента, %', 1, 100, 1],
    maxLeverage: ['Предел плеча', 'Максимальный множитель', 1, 5, 0.1],
    costLimit: ['Лимит расходов', 'Условный предел расходов, ₽', 0, 100000000, 1],
  } as const;
  function editLimit(key: 'maxPositionPercent' | 'maxLeverage' | 'costLimit') {
    setLimitValue(String(d[key]));
    setLimitEditor(key);
  }
  function commitLimit() {
    if (!limitEditor) return;
    const value = limitValue.trim(),
      n = Number(value),
      f = limitFields[limitEditor];
    if (!value || !Number.isFinite(n) || n < f[2] || n > f[3]) {
      notify(value ? 'Проверь допустимое значение' : 'Введи значение');
      return;
    }
    setDraft({ ...d, [limitEditor]: value });
    setLimitEditor(null);
  }
  const titles: Record<string, string> = {
    theme: 'Тема приложения',
    privacy: 'Приватность',
    persona: 'Персонаж агента',
    goal: 'Твоя цель',
    budget: 'Бюджет агента',
    mode: 'Режим работы',
    instruments: 'Инструменты и лимиты',
    communication: 'Общение с агентом',
  };
  return (
    <div className={asSheet ? css.sheetHost : css.page}>
      {!asSheet && (
        <>
          <PageHeading title="Настройки" />
          <h2 className={css.groupTitle}>АГЕНТ</h2>
          <div className={css.group}>
            {[
              ['goal', 'Цель', cfg.goal || 'Не задана'],
              ['budget', 'Бюджет', fmt(cfg.budget)],
              ['mode', 'Режим работы', cfg.mode === 'confirm' ? 'С подтверждением' : 'Автономно'],
              ['instruments', 'Инструменты и лимиты', ''],
              [
                'communication',
                'Общение',
                { business: 'Деловой', friendly: 'Дружеский', energetic: 'На драйве' }[
                  cfg.communication
                ],
              ],
            ].map(([key, label, value]) => (
              <button className={css.row} key={key} onClick={() => open(key)}>
                <span>{label}</span>
                <small>{value}</small>
                <i>›</i>
              </button>
            ))}
          </div>
          <h2 className={css.groupTitle}>ПРИЛОЖЕНИЕ</h2>
          <div className={css.group}>
            <button className={css.row} onClick={() => open('privacy')}>
              <span>Приватность</span>
              <small>
                {
                  {
                    open: 'Открытый профиль',
                    results: 'Только результаты',
                    closed: 'Закрытый профиль',
                  }[overview.data?.user.privacy || 'open']
                }
              </small>
              <i>›</i>
            </button>
            <button className={css.row} onClick={() => open('theme')}>
              <span>Тема</span>
              <small>{theme === 'light' ? 'Светлая' : 'Тёмная'}</small>
              <i>›</i>
            </button>
          </div>
        </>
      )}
      {asSheet && (
        <Modal
          open={!editor}
          onOpenChange={(open) => {
            if (!open) onClose?.();
          }}
          title="Настроить агента"
          className={css.panel}
          overlayClassName={css.overlay}
        >
          <p className={css.sheetSummary}>
            Персонаж и правила работы. Смена персонажа не меняет бюджет и торговые разрешения.
          </p>
          <section className={`${css.group} ${css.sheetGroup}`}>
            {[
              ['persona', 'Персонаж', agents.data?.find((a) => a.id === cfg.agentId)?.name || ''],
              ['goal', 'Цель', cfg.goal || 'Не задана'],
              ['budget', 'Бюджет', fmt(cfg.budget)],
              [
                'mode',
                'Режим работы',
                cfg.mode === 'autonomous' ? 'Автономно' : 'С подтверждением',
              ],
              ['instruments', 'Инструменты и лимиты', ''],
              [
                'communication',
                'Общение',
                { business: 'Деловой', friendly: 'Дружеский', energetic: 'На драйве' }[
                  cfg.communication
                ],
              ],
            ].map(([key, label, value]) => (
              <button key={key} className={css.row} onClick={() => open(key)}>
                <span>{label}</span>
                <small>{value}</small>
                <i>›</i>
              </button>
            ))}
          </section>
          <Button
            className={css.sheetPause}
            variant={cfg.paused ? 'secondary' : 'danger'}
            onClick={() => save.mutate({ paused: !cfg.paused }, { onSuccess: () => onClose?.() })}
          >
            {cfg.paused ? 'Продолжить работу' : 'Приостановить агента'}
          </Button>
        </Modal>
      )}
      <Modal
        open={Boolean(editor)}
        onOpenChange={(v) => {
          if (!v) closeEditor();
        }}
        title={limitEditor ? limitFields[limitEditor][0] : titles[editor] || 'Настройки'}
        className={css.panel}
        overlayClassName={css.overlay}
      >
        <div className={css.sourceEditor} data-editor={limitEditor ? 'limit' : editor}>
          {limitEditor ? (
            <>
              <label className={css.fieldLabel} htmlFor="settings-limit-value">
                {limitFields[limitEditor][1]}
              </label>
              <input
                className={css.numberInput}
                id="settings-limit-value"
                type="number"
                min={limitFields[limitEditor][2]}
                max={limitFields[limitEditor][3]}
                step={limitFields[limitEditor][4]}
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
              />
              <p className={css.note}>
                Изменение сначала попадёт в черновик. Все лимиты применятся после общего сохранения.
              </p>
            </>
          ) : editor === 'theme' ? (
            <div className={css.choices}>
              {[
                ['light', 'Светлая'],
                ['dark', 'Тёмная'],
              ].map(([value, label]) => (
                <label className={css.choice} key={value}>
                  <input
                    type="radio"
                    name="theme"
                    checked={themeDraft === value}
                    onChange={() => setThemeDraft(value)}
                  />
                  <span>
                    <b>{label}</b>
                  </span>
                </label>
              ))}
            </div>
          ) : editor === 'privacy' ? (
            <div className={css.choices}>
              {[
                ['open', 'Открытый профиль'],
                ['results', 'Только результаты'],
                ['closed', 'Закрытый профиль'],
              ].map(([value, label]) => (
                <label className={css.choice} key={value}>
                  <input
                    type="radio"
                    name="privacy"
                    checked={privacyDraft === value}
                    onChange={() => setPrivacyDraft(value)}
                  />
                  <span>
                    <b>{label}</b>
                    {editor === 'privacy' && (
                      <small>
                        {
                          {
                            open: 'Результаты и разрешённые тобой данные портфеля.',
                            results: 'Профиль и показатели видны, позиции и сделки скрыты.',
                            closed: 'В рейтинге остаются ник, ранг и результат. Кабинет закрыт.',
                          }[value as 'open' | 'results' | 'closed']
                        }
                      </small>
                    )}
                  </span>
                </label>
              ))}
            </div>
          ) : editor === 'persona' ? (
            <>
              <div className={css.personaOptions}>
                {agents.data?.map((a, i) => (
                  <label className={css.personaOption} key={a.id}>
                    <input
                      type="radio"
                      name="persona"
                      checked={d.agentId === a.id}
                      onChange={() => setDraft({ ...d, agentId: a.id })}
                    />
                    <span>
                      <b>{a.name}</b>
                      <small>
                        {['Активная торговля', 'Вдумчивый подход', 'Спокойный баланс'][i]}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              <p className={css.note}>
                Меняется подход персонажа. История диалога, цель, бюджет и разрешения сохраняются.
              </p>
            </>
          ) : editor === 'goal' ? (
            <>
              <label className={css.fieldLabel} htmlFor="goal">
                Что важно для твоего портфеля?
              </label>
              <textarea
                className={css.goalInput}
                id="goal"
                maxLength={500}
                placeholder="Например, накопить на покупку за три года"
                value={d.goal}
                onChange={(e) => setDraft({ ...d, goal: e.target.value })}
              />
              <p className={css.note}>
                Сохраняем цель в контексте агента. Это не поручение на сделку.
              </p>
            </>
          ) : editor === 'budget' ? (
            <>
              <label className={css.fieldLabel} htmlFor="budget">
                Выделенная сумма, ₽
              </label>
              <input
                className={css.numberInput}
                id="budget"
                type="number"
                inputMode="numeric"
                min={1000}
                max={100000000}
                value={d.budget}
                onChange={(e) => setDraft({ ...d, budget: e.target.value })}
              />
              <p className={css.note}>
                Лимит капитала для агента. Сохранение не пополняет счёт и не переводит деньги.
              </p>
            </>
          ) : editor === 'mode' ? (
            <>
              <div className={css.choices}>
                {[
                  {
                    value: 'autonomous' as const,
                    label: 'Автономно',
                    text: 'Агент отправляет торговые команды в заранее разрешённых пределах.',
                  },
                  {
                    value: 'confirm' as const,
                    label: 'С подтверждением',
                    text: 'Перед каждой торговой командой потребуется твоё подтверждение.',
                  },
                ].map((o) => (
                  <label key={o.value} className={css.choice}>
                    <input
                      type="radio"
                      name="mode"
                      checked={d.mode === o.value}
                      onChange={() => setDraft({ ...d, mode: o.value })}
                    />
                    <span>
                      <b>{o.label}</b>
                      <small>{o.text}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className={css.note}>
                Разрешения Т-Лиги. Доступность у брокера проверяется отдельно. Открытые позиции и
                уже отправленные заявки автоматически не изменяются.
              </p>
            </>
          ) : editor === 'communication' ? (
            <div className={css.choices}>
              {[
                {
                  value: 'business' as const,
                  label: 'Деловой',
                  text: 'Коротко, точно, по существу.',
                },
                { value: 'friendly' as const, label: 'Дружеский', text: 'Понятно и спокойно.' },
                {
                  value: 'energetic' as const,
                  label: 'На драйве',
                  text: 'Энергичная подача без изменения торговых рисков.',
                },
              ].map((o) => (
                <label key={o.value} className={css.choice}>
                  <input
                    type="radio"
                    name="communication"
                    checked={d.communication === o.value}
                    onChange={() => setDraft({ ...d, communication: o.value })}
                  />
                  <span>
                    <b>{o.label}</b>
                    <small>{o.text}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : editor === 'instruments' ? (
            <>
              <p className={css.note} style={{ marginTop: 0 }}>
                Разрешения Т-Лиги. Доступность у брокера проверяется отдельно.
              </p>
              {(
                [
                  { key: 'leverage', label: 'Плечо' },
                  { key: 'short', label: 'Шорты' },
                  { key: 'derivatives', label: 'Производные' },
                ] as const
              ).map((o) => (
                <div className={css.instrumentRow} key={o.key}>
                  <span>{o.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-label={o.label}
                    aria-checked={d[o.key]}
                    className={css.sourceSwitch}
                    onClick={() => setDraft({ ...d, [o.key]: !d[o.key] })}
                  />
                </div>
              ))}
              <button className={css.limitRow} onClick={() => editLimit('maxPositionPercent')}>
                <span>Максимальная позиция</span>
                <span>{d.maxPositionPercent}%</span>
                <i>›</i>
              </button>
              {d.leverage && (
                <button className={css.limitRow} onClick={() => editLimit('maxLeverage')}>
                  <span>Предел плеча</span>
                  <span>×{d.maxLeverage}</span>
                  <i>›</i>
                </button>
              )}
              <button className={css.limitRow} onClick={() => editLimit('costLimit')}>
                <span>Лимит расходов</span>
                <span>{fmt(d.costLimit)}</span>
                <i>›</i>
              </button>
            </>
          ) : null}
          {save.error && <QueryError error={save.error} />}
          <div className={css.editorActions}>
            <Button
              variant="secondary"
              onClick={() => (limitEditor ? setLimitEditor(null) : closeEditor())}
            >
              Отмена
            </Button>
            <Button onClick={limitEditor ? commitLimit : apply} disabled={save.isPending}>
              {limitEditor ? 'Готово' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Modal>
      {!asSheet && (
        <>
          <Button
            className={css.resetTrigger}
            variant="danger"
            onClick={() => {
              setResetConfirmed(false);
              setResetOpen(true);
            }}
          >
            Сбросить демо
          </Button>
          <Modal open={resetOpen} onOpenChange={setResetOpen} title="Сбросить демо?">
            <div className={s.form}>
              <p className={s.muted}>
                Будут удалены только данные этой Т-Лиги: виртуальные операции, настройки, переписка,
                сквады, награды и наблюдения. Другие данные браузера останутся.
              </p>
              <label className={css.choice}>
                <input
                  type="checkbox"
                  checked={resetConfirmed}
                  onChange={(e) => setResetConfirmed(e.target.checked)}
                />
                <span>Начать демо заново с исходными данными</span>
              </label>
              {reset.error && <QueryError error={reset.error} />}
              <div className={s.actions}>
                <Button variant="secondary" onClick={() => setResetOpen(false)}>
                  Отмена
                </Button>
                <Button
                  disabled={!resetConfirmed || reset.isPending}
                  onClick={async () => {
                    try {
                      await reset.mutateAsync();
                      resetClient();
                      setResetOpen(false);
                      navigate('/');
                      notify('Демо сброшено');
                    } catch {
                      /* The reset error is rendered in this confirmation. */
                    }
                  }}
                >
                  Подтвердить сброс
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
      {element}
    </div>
  );
}
