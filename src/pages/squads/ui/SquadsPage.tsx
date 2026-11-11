import { Decimal } from '../../../shared/lib/money';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Send } from 'lucide-react';
import {
  useSquads,
  useSquad,
  useCreateSquad,
  useJoinSquad,
  useSquadMessage,
  useSaveSquadStrategy,
  useApproveSquadDecision,
  useExecuteSquadDecision,
  useRejectSquadDecision,
  useProposeContribution,
  useApproveContribution,
  useExitPreview,
  useConfirmExit,
  useDissolvePreview,
  useConfirmDissolve,
  useSimulateSquadApproval,
  useSimulateSquadMandate,
  useInviteDemoMember,
} from '../../../entities/squad';
import { useSessionStore } from '../../../entities/session/model/store';
import type {
  ExitPreview,
  DissolvePreview,
  SquadDecision,
  SquadStrategyConfig,
  AgentId,
} from '../../../shared/api/contracts';
import {
  Card,
  Button,
  PageHeading,
  Tabs,
  Chip,
  Modal,
  Loading,
  QueryError,
  Empty,
  fmt,
  pct,
  s,
  useNotice,
} from '../../../shared/ui';
import css from './squads.module.css';
const payoutRub = (value: string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    new Decimal(value).toNumber(),
  ) + ' ₽';
function SquadSurface({
  open,
  page,
  title,
  onOpenChange,
  children,
  backLabel = 'Сквады',
  subtitle,
}: {
  open: boolean;
  page: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  backLabel?: string;
  subtitle?: string;
}) {
  if (!open) return null;
  if (!page)
    return (
      <Modal open onOpenChange={onOpenChange} title={title}>
        {children}
      </Modal>
    );
  return (
    <section className={css.pageSurface}>
      <button className={css.surfaceBack} onClick={() => onOpenChange(false)}>
        ← {backLabel}
      </button>
      <h1 className={subtitle ? css.withSubtitle : undefined}>{title}</h1>
      {subtitle && <p className={css.surfaceSubtitle}>{subtitle}</p>}
      {children}
    </section>
  );
}
export function SquadsPage() {
  const params = useParams(),
    location = useLocation(),
    navigate = useNavigate(),
    all = useSquads(),
    activeId = useSessionStore((v) => v.activeSquadId),
    setActive = useSessionStore((v) => v.setActiveSquadId);
  const id =
      params.squadId ||
      params.id ||
      activeId ||
      all.data?.find((g) => g.status === 'active' && g.members.some((m) => m.userId === 'me'))
        ?.id ||
      'alpha',
    query = useSquad(id),
    create = useCreateSquad(),
    join = useJoinSquad(),
    message = useSquadMessage(id),
    save = useSaveSquadStrategy(id),
    approve = useApproveSquadDecision(id),
    execute = useExecuteSquadDecision(id),
    reject = useRejectSquadDecision(id),
    propose = useProposeContribution(id),
    approveFund = useApproveContribution(id),
    exit = useExitPreview(id),
    confirmExit = useConfirmExit(id),
    simulateApproval = useSimulateSquadApproval(id),
    mandate = useSimulateSquadMandate(id),
    inviteMember = useInviteDemoMember(id),
    dissolve = useDissolvePreview(id),
    confirmDissolve = useConfirmDissolve(id);
  const tab = location.pathname.endsWith('/chat')
    ? 'chat'
    : location.pathname.endsWith('/decisions')
      ? 'decisions'
      : new URLSearchParams(location.search).get('tab') === 'members'
        ? 'members'
        : 'overview';
  function setTab(next: string) {
    navigate(
      `/squads/${id}${next === 'chat' ? '/chat' : next === 'decisions' ? '/decisions' : next === 'members' ? '?tab=members' : ''}`,
    );
  }
  const [modal, setModal] = useState(
      new URLSearchParams(location.search).has('invite') ? 'join' : '',
    ),
    [consentDecisionId, setConsentDecisionId] = useState<string | null>(null),
    [archiveId, setArchiveId] = useState<string | null>(null),
    [rulesDraft, setRulesDraft] = useState<SquadStrategyConfig | null>(null),
    [guestName, setGuestName] = useState(''),
    [guestAgent, setGuestAgent] = useState<AgentId>('max'),
    [name, setName] = useState(''),
    [code, setCode] = useState(new URLSearchParams(location.search).get('invite') || ''),
    [text, setText] = useState(''),
    [amount, setAmount] = useState('10000'),
    [goal, setGoal] = useState(''),
    [strategy, setStrategy] = useState(''),
    [mode, setMode] = useState<'confirm' | 'autonomous'>('confirm'),
    [exitData, setExitData] = useState<ExitPreview | null>(null),
    [dissolveData, setDissolveData] = useState<DissolvePreview | null>(null),
    [reviewChecked, setReviewChecked] = useState(false);
  const { notify, element } = useNotice(),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (id) setActive(id);
  }, [id, setActive]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [query.data?.messages.length]);
  const groups =
      all.data?.filter((g) => g.status === 'active' && g.members.some((m) => m.userId === 'me')) ||
      [],
    archived =
      all.data?.filter(
        (g) => g.status === 'archived' || !g.members.some((m) => m.userId === 'me'),
      ) || [];
  if (all.isPending) return <Loading />;
  if (all.error) return <QueryError error={all.error} retry={() => all.refetch()} />;
  const g = query.data,
    self = g?.members.find((m) => m.userId === 'me'),
    hasGroup = Boolean(g && groups.some((v) => v.id === g.id));
  function choose(gid: string) {
    setActive(gid);
    navigate(`/squads/${gid}`);
  }
  async function make() {
    try {
      const v = await create.mutateAsync({ name: name.trim() });
      setModal('');
      setName('');
      choose(v.id);
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function enter() {
    try {
      const v = await join.mutateAsync({ code: code.trim() });
      setModal('');
      choose(v.id);
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  function openSettings() {
    if (!g) return;
    setRulesDraft({
      strategy: g.strategy,
      goal: g.goal,
      horizon: g.horizon,
      approach: g.approach,
      mode: g.mode,
      leverage: g.leverage,
      short: g.short,
      derivatives: g.derivatives,
      maxPositionPercent: g.maxPositionPercent,
      maxLeverage: g.maxLeverage,
      costLimit: g.costLimit,
    });
    setGoal(g.goal);
    setStrategy(g.strategy);
    setMode(g.mode);
    setModal('settings');
  }
  async function saveSettings() {
    try {
      await save.mutateAsync({ ...rulesDraft, goal, strategy, mode });
      setModal('');
      notify('Предложение сохранено в решениях сквада');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function send(value: string) {
    if (!value.trim()) return;
    try {
      await message.mutateAsync({ text: value });
      setText('');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function requestFund() {
    try {
      await propose.mutateAsync({ amount });
      setModal('');
      notify('Взнос ожидает решения команды');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function prepareExit() {
    try {
      setExitData(await exit.mutateAsync());
      setReviewChecked(false);
      setModal('exit');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function prepareDissolve() {
    try {
      setDissolveData(await dissolve.mutateAsync());
      setReviewChecked(false);
      setModal('dissolve');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function leave() {
    if (!exitData) return;
    try {
      await confirmExit.mutateAsync({ previewId: exitData.id });
      setModal('');
      setActive(null);
      navigate('/squads');
      notify('Полный выход рассчитан. Запись сохранена в истории.');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function disband() {
    if (!dissolveData) return;
    try {
      await confirmDissolve.mutateAsync({ previewId: dissolveData.id });
      setModal('');
      setActive(null);
      navigate('/squads');
      notify('Сквад перенесён в архив');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  const mutationError =
    create.error ||
    join.error ||
    message.error ||
    save.error ||
    approve.error ||
    execute.error ||
    reject.error ||
    propose.error ||
    approveFund.error ||
    exit.error ||
    confirmExit.error ||
    dissolve.error ||
    confirmDissolve.error ||
    simulateApproval.error ||
    mandate.error ||
    inviteMember.error;
  function decisionView(d: SquadDecision, readOnly = false) {
    return (
      <div className={css.plan}>
        <Chip>
          {
            {
              proposed: 'Предложено',
              approved: 'Подтверждено за себя',
              executed: 'Завершено · демо',
              rejected: 'Отклонено',
              stale: 'Нужен пересмотр',
            }[d.status]
          }
        </Chip>
        <h3>{d.title}</h3>
        <p>{d.text}</p>
        <details className={s.details}>
          <summary>Подробности решения</summary>
          {d.messages.map((m) => (
            <div key={m.id} className={css.branch}>
              <b>{m.role === 'agent' ? 'Агент' : 'Участник'}</b>
              <p>{m.text}</p>
            </div>
          ))}
          <p>
            Подтверждения:{' '}
            {d.approvals.length
              ? d.approvals.map((id) => (id === 'me' ? 'Ты' : id)).join(', ')
              : 'не выдавались'}
            .
          </p>
          <p>
            Версия правил: {d.revision} · {new Date(d.createdAt).toLocaleString('ru-RU')}
          </p>
          <p>Одна итоговая версия плана. Исполнение координируется последовательно.</p>
        </details>
        {d.plan && (
          <div style={{ marginTop: 12 }}>
            <span className={s.label}>Итоговый план</span>
            <p className={s.muted}>{d.plan.reason}</p>
            {d.plan.actions.map((o) => (
              <div key={o.id} className={s.row} style={{ margin: '8px 0', fontSize: 12 }}>
                <b>
                  {o.side === 'buy' ? 'Купить' : 'Продать'} {o.instrumentId} · {o.lots} лот.
                </b>
                <span>{fmt(o.total)}</span>
              </div>
            ))}
          </div>
        )}
        {d.status === 'executed' ? (
          <div className={s.notice}>
            {d.execution?.orders.length ? (
              <>
                <b>Исполнено · демо</b>
                {d.execution.orders.map((o) => (
                  <p key={o.id} style={{ margin: '6px 0 0' }}>
                    {o.side === 'buy' ? 'Куплено' : 'Продано'} {o.instrumentId}: {o.lots} лот. ·
                    Комиссия {fmt(o.fee)}
                  </p>
                ))}
              </>
            ) : d.proposedStrategy ? (
              'Общие правила обновлены после согласования.'
            ) : (
              'Сделок не было. Результат решения сохранён в журнале.'
            )}
          </div>
        ) : d.status === 'stale' ? (
          <p className={s.muted}>Правила изменились. Обсуди идею заново.</p>
        ) : d.status === 'rejected' || readOnly ? null : (
          <>
            <p className={s.muted} style={{ margin: '13px 0 6px' }}>
              Согласовано {d.approvals.length} из {g?.members.length || 0}
            </p>
            <div className={s.actions} style={{ marginTop: 8 }}>
              {!d.approvals.includes('me') && (
                <Button
                  small
                  onClick={() => approve.mutate({ decisionId: d.id })}
                  disabled={approve.isPending}
                >
                  Подтвердить за себя
                </Button>
              )}
              {d.approvals.length < (g?.members.length || 0) && (
                <Button
                  variant="secondary"
                  small
                  onClick={() => {
                    setConsentDecisionId(d.id);
                    setModal('teamConsent');
                  }}
                  disabled={simulateApproval.isPending}
                >
                  Смоделировать ответы остальных
                </Button>
              )}
              {d.status === 'approved' && (
                <Button
                  small
                  onClick={() => execute.mutate({ decisionId: d.id })}
                  disabled={execute.isPending}
                >
                  {d.proposedStrategy ? 'Применить общие правила' : 'Исполнить демо-план'}
                </Button>
              )}
              <Button variant="secondary" small onClick={() => reject.mutate({ decisionId: d.id })}>
                Отклонить
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }
  const pageMode = ['settings', 'invite', 'dissolve', 'archive', 'archiveDetail'].includes(modal);
  return (
    <div className={pageMode ? css.pageMode : undefined}>
      <PageHeading
        title="Сквады"
        action={
          <Button small onClick={() => setModal('create')}>
            <Plus size={16} />
            Создать
          </Button>
        }
      />
      {groups.length > 0 ? (
        <>
          <div className={css.picker}>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => choose(group.id)}
                className={group.id === id ? css.active : ''}
              >
                {group.name}
              </button>
            ))}
          </div>
          {query.isPending ? (
            <Loading />
          ) : !hasGroup ? (
            <Empty
              title="Выбери свой сквад"
              action={
                <Button onClick={() => choose(groups[0].id)}>Открыть {groups[0].name}</Button>
              }
            />
          ) : g && self ? (
            <>
              <div className={css.teamHead}>
                <div>
                  <h2>{g.name}</h2>
                  <span>
                    {g.members.length} из 4 участников{' '}
                    <Chip>{g.ranked ? 'В рейтинге' : 'Частный'}</Chip>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  small
                  onClick={() => setModal('menu')}
                  aria-label="Управление сквадом"
                >
                  •••
                </Button>
              </div>
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'overview', label: 'Обзор' },
                  { value: 'members', label: 'Участники' },
                  { value: 'chat', label: 'Чат' },
                ]}
              />
              <div style={{ marginTop: 16 }}>
                {tab === 'overview' ? (
                  <div className={`${s.grid} ${css.overviewGrid}`}>
                    <div className={css.overviewStack}>
                      <Card className={css.financial}>
                        <div className={css.caption}>Виртуальный портфель</div>
                        <div className={css.totals}>
                          <div>
                            <small>Общий капитал</small>
                            <b>{fmt(g.value)}</b>
                          </div>
                          <div>
                            <small>Результат</small>
                            <b className={s.green}>{pct(g.returnPercent)}</b>
                          </div>
                        </div>
                        <div className={css.share}>
                          <div className={s.row}>
                            <b>Твоя доля</b>
                            <button
                              aria-label="Как рассчитывается доля"
                              onClick={() => setModal('shareInfo')}
                            >
                              ⓘ
                            </button>
                          </div>
                          <div className={css.shareGrid}>
                            <div>
                              <small>Сейчас стоит</small>
                              <b>{fmt(self.value)}</b>
                            </div>
                            <div>
                              <small>Внесено</small>
                              <b>{fmt(self.contribution)}</b>
                            </div>
                            <div>
                              <small>Результат</small>
                              <b className={s.green}>
                                {self.profit.startsWith('-') ? '' : '+'}
                                {fmt(self.profit)}
                              </b>
                            </div>
                            <div>
                              <small>Доля капитала</small>
                              <b>{new Decimal(self.sharePercent).toFixed(2).replace('.', ',')}%</b>
                            </div>
                          </div>
                        </div>
                      </Card>
                      <button className={css.secondaryRow} onClick={openSettings}>
                        <span>
                          <b>Стратегия сквада</b>
                          <small>
                            {
                              { short: 'Краткосрок', medium: 'Месяцы', long: 'Долгосрок' }[
                                g.horizon
                              ]
                            }{' '}
                            · {g.mode === 'confirm' ? 'С подтверждением' : 'Автономно'}
                            {g.decisions.some(
                              (d) =>
                                d.proposedStrategy &&
                                (d.status === 'proposed' || d.status === 'approved'),
                            )
                              ? ' · Есть предложение'
                              : ''}
                          </small>
                        </span>
                        <span>›</span>
                      </button>
                      {g.mode === 'autonomous' &&
                        g.members.some((m) => !g.ownerConsents.includes(m.userId)) && (
                          <Button variant="secondary" small onClick={() => mandate.mutate()}>
                            Смоделировать согласия на автономность
                          </Button>
                        )}
                      {g.contributions.some((r) => r.status === 'pending') && (
                        <Card>
                          <h3>Дополнительные взносы</h3>
                          {g.contributions.map((r) => (
                            <div key={r.id} className={s.stack}>
                              <div className={s.row}>
                                <b>{fmt(r.amount)}</b>
                                <Chip>{r.status === 'pending' ? 'На согласовании' : 'Учтён'}</Chip>
                              </div>
                              {r.status === 'pending' && (
                                <Button
                                  variant="secondary"
                                  small
                                  onClick={() => approveFund.mutate({ requestId: r.id })}
                                >
                                  Смоделировать одобрение команды
                                </Button>
                              )}
                            </div>
                          ))}
                        </Card>
                      )}
                      <button className={css.secondaryRow} onClick={() => setModal('decisions')}>
                        <span>
                          <b>Решения сквада</b>
                          <small>
                            {g.decisions.length
                              ? `${g.decisions.length} в истории`
                              : 'Пока нет решений'}
                          </small>
                        </span>
                        <span>›</span>
                      </button>
                    </div>
                    <Card className={css.members}>
                      <h3 style={{ fontSize: 13, lineHeight: 1.35 }}>
                        Участники · {g.members.length}/4
                      </h3>
                      {g.members.map((m) => (
                        <div className={s.listrow} key={m.id}>
                          <span className={s.avatar}>{m.name.slice(0, 1)}</span>
                          <span className={s.grow}>
                            <b>
                              {m.name}
                              {m.userId === 'me' ? ' · ты' : ''}
                            </b>
                            <small>
                              {['max', 'lev', 'chill'].indexOf(m.agentId) >= 0
                                ? { max: 'Макс', lev: 'Лев', chill: 'Чилл' }[m.agentId]
                                : m.agentId}{' '}
                              · {m.userId === g.captainId ? 'Капитан' : 'Участник'}
                            </small>
                          </span>
                          <span style={{ textAlign: 'right' }}>
                            <b>{fmt(m.value)}</b>
                            <small>Взнос {fmt(m.contribution)}</small>
                          </span>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        small
                        onClick={() => setModal('invite')}
                        disabled={g.members.length >= 4}
                      >
                        {g.members.length >= 4 ? 'Сквад заполнен' : 'Пригласить друга →'}
                      </Button>
                    </Card>
                  </div>
                ) : tab === 'members' ? (
                  <Card className={css.members}>
                    <h3>Участники · {g.members.length}/4</h3>
                    {g.members.map((m) => (
                      <div key={m.id} className={s.listrow}>
                        <span className={s.avatar}>{m.name.slice(0, 1)}</span>
                        <div className={s.grow}>
                          <b>
                            {m.name}
                            {m.userId === 'me' ? ' · ты' : ''}
                          </b>
                          <small>
                            {{ max: 'Макс', lev: 'Лев', chill: 'Чилл' }[m.agentId]} ·{' '}
                            {m.userId === g.captainId ? 'Капитан' : 'Участник'}
                          </small>
                        </div>
                        <span style={{ textAlign: 'right' }}>
                          <b>{fmt(m.value)}</b>
                          <small>Взнос {fmt(m.contribution)}</small>
                        </span>
                      </div>
                    ))}
                    <Button
                      full
                      variant="secondary"
                      onClick={() => setModal('invite')}
                      disabled={g.members.length >= 4}
                    >
                      Пригласить друга
                    </Button>
                  </Card>
                ) : tab === 'decisions' ? (
                  <div className={s.stack}>
                    {g.decisions.length ? (
                      g.decisions.map((d) => <Card key={d.id}>{decisionView(d)}</Card>)
                    ) : (
                      <Empty
                        title="Пока нет решений"
                        text="Обсуди идею в общем чате — агенты сформируют план."
                        action={<Button onClick={() => setTab('chat')}>Перейти в чат</Button>}
                      />
                    )}
                  </div>
                ) : (
                  <Card className={css.chatPanel}>
                    <div className={css.messages}>
                      {g.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`${css.bubble} ${m.role === 'user' ? css.mine : ''}`}
                        >
                          <small>{m.role === 'agent' ? 'Агент сквада' : 'Участник'}</small>
                          <div>{m.text}</div>
                        </div>
                      ))}
                      {g.decisions.slice(0, 1).map((d) => (
                        <div key={d.id}>{decisionView(d)}</div>
                      ))}
                      <div ref={bottom} />
                    </div>
                    <div className={css.hints}>
                      <button onClick={() => send('@Макс, как улучшить состав портфеля?')}>
                        @Макс, проверь состав
                      </button>
                      <button onClick={() => send('@Лев, что думаешь о нашей цели?')}>
                        @Лев, наша цель
                      </button>
                    </div>
                    <form
                      className={css.composer}
                      onSubmit={(e) => {
                        e.preventDefault();
                        send(text);
                      }}
                    >
                      <input
                        aria-label="Сообщение скваду"
                        placeholder="Сообщение или @имя агента…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                      <Button
                        type="submit"
                        aria-label="Отправить в сквад"
                        disabled={!text.trim() || message.isPending}
                      >
                        <Send size={17} />
                      </Button>
                    </form>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <QueryError error={query.error || new Error('Сквад недоступен')} />
          )}
        </>
      ) : (
        <Empty
          title="Собери свой сквад"
          text="До четырёх участников. Начните с общего виртуального портфеля."
          action={
            <div className={s.actions}>
              <Button onClick={() => setModal('create')}>Создать сквад</Button>
              <Button variant="secondary" onClick={() => setModal('join')}>
                Ввести код
              </Button>
            </div>
          }
        />
      )}
      <div className={s.actions} style={{ marginTop: 18 }}>
        <Button variant="ghost" small onClick={() => setModal('join')}>
          Вступить по коду
        </Button>
        {archived.length > 0 && (
          <Button variant="ghost" small onClick={() => setModal('archive')}>
            Архив и прошлые сквады
          </Button>
        )}
      </div>
      {mutationError && <QueryError error={mutationError} />}
      <Modal
        open={modal === 'decisions'}
        onOpenChange={(v) => !v && setModal('')}
        title="Решения сквада"
      >
        <p className={css.captionText}>Предложение → проверка → результат</p>
        {g?.decisions.length ? (
          g.decisions.map((d) => (
            <button
              key={d.id}
              className={css.historySheetItem}
              onClick={() => {
                setModal('');
                setTab('chat');
              }}
            >
              <b>{d.title} →</b>
              <small>
                {
                  {
                    proposed: 'Ожидает согласия',
                    approved: 'Готов к исполнению',
                    executed: 'Исполнено · демо',
                    rejected: 'Отклонено',
                    stale: 'Нужен пересмотр',
                  }[d.status]
                }
              </small>
            </button>
          ))
        ) : (
          <p className={css.captionText}>Пока нет решений. Начни с идеи в чате.</p>
        )}
      </Modal>
      <SquadSurface
        open={Boolean(modal) && modal !== 'decisions'}
        page={pageMode}
        backLabel={modal === 'archiveDetail' ? 'Архив сквадов' : g?.name || 'Сквады'}
        subtitle={
          modal === 'archiveDetail' && archived.find((a) => a.id === archiveId)?.archivedAt
            ? `Расформирован ${new Date(archived.find((a) => a.id === archiveId)!.archivedAt!).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}`
            : undefined
        }
        onOpenChange={(v) => {
          if (!v) setModal('');
        }}
        title={
          {
            shareInfo: 'Доля в виртуальном портфеле',
            create: 'Создать сквад',
            join: 'Войти по коду',
            invite: 'Пригласить друга',
            menu: `Сквад: ${g?.name || ''}`,
            settings: 'Стратегия сквада',
            fund: 'Дополнительный взнос',
            exit: 'Полный выход из сквада',
            dissolve: 'Расформировать сквад',
            archive: 'Архив сквадов',
            archiveDetail: archived.find((a) => a.id === archiveId)?.name || 'Архив сквада',
            invitePreview: 'Как друг увидит приглашение',
            teamConsent: g?.decisions.find((d) => d.id === consentDecisionId)?.proposedStrategy
              ? 'Демо-согласие команды'
              : 'Согласия команды · демо',
          }[modal] || 'Сквад'
        }
      >
        <div
          className={
            ['invitePreview', 'teamConsent', 'create', 'join', 'shareInfo'].includes(modal)
              ? css.sourceModalFlow
              : s.form
          }
        >
          {modal === 'shareInfo' ? (
            <>
              <p className={s.muted}>
                Стоимость доли меняется вместе с общим портфелем. В этом учебном примере доли
                основаны на взносах участников.
              </p>
              <p className={s.muted}>
                При позднем пополнении новые виртуальные паи рассчитываются по текущей стоимости
                портфеля. Дополнительный взнос поступает в общий портфель после решения команды.
              </p>
              <p className={s.muted}>
                Общий бюджет сквада только виртуальный. Реальный совместный счёт, выплаты и права
                владения требуют отдельного согласования с банком.
              </p>
            </>
          ) : modal === 'create' ? (
            <>
              <p className={css.captionText}>
                До четырёх человек. Новый сквад будет частным; текущий рейтинговый состав не
                изменится.
              </p>
              <div className={s.field}>
                <label htmlFor="squad-name">Название</label>
                <input
                  id="squad-name"
                  maxLength={40}
                  placeholder="Например, Спокойный рост"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button
                onClick={make}
                disabled={!name.trim() || create.isPending || groups.length >= 3}
              >
                {groups.length >= 3 ? 'Лимит сквадов достигнут' : 'Создать'}
              </Button>
            </>
          ) : modal === 'join' ? (
            <>
              <p className={css.captionText}>
                В этом макете можно открыть только сквад, уже сохранённый на этом устройстве. Общего
                сервера приглашений нет.
              </p>
              <div className={s.field}>
                <input
                  id="squad-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Код сквада"
                />
              </div>
              <Button onClick={enter} disabled={!code.trim() || join.isPending}>
                Проверить код
              </Button>
            </>
          ) : modal === 'invite' && g ? (
            <>
              <p className={css.captionText}>
                {g.members.length >= 4
                  ? 'В этом скваде уже четыре участника.'
                  : `Свободно ${4 - g.members.length} из 4 мест. Можно начать без брокерского счёта.`}
              </p>
              <Card>
                <Chip>Демонстрационное приглашение</Chip>
                <label className={css.linkLabel} htmlFor="invite-url">
                  Ссылка
                </label>
                <div className={css.linkCopy}>
                  <input
                    id="invite-url"
                    readOnly
                    value={`${window.location.origin}/squads?invite=${encodeURIComponent(g.code)}`}
                  />
                  <button
                    aria-label="Скопировать ссылку"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/squads?invite=${encodeURIComponent(g.code)}`,
                        );
                        notify('Ссылка скопирована');
                      } catch {
                        notify('Скопируй ссылку из поля выше');
                      }
                    }}
                  >
                    ⧉
                  </button>
                </div>
                <div className={css.inviteCode}>
                  <div>
                    <small>Код сквада</small>
                    <b>{g.code}</b>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(g.code);
                        notify('Код скопирован');
                      } catch {
                        notify('Скопируй код из поля выше');
                      }
                    }}
                  >
                    Скопировать код
                  </button>
                </div>
              </Card>
              <Card>
                <h2 style={{ fontSize: 17 }}>Как присоединится друг</h2>
                <ol className={css.inviteSteps}>
                  {[
                    [
                      'Откроет ссылку в браузере',
                      'Установка приложения для первого знакомства не нужна.',
                    ],
                    [
                      'Создаст профиль и выберет агента',
                      'Виртуальное участие — без брокерского счёта.',
                    ],
                    [
                      'Вступит в твой сквад',
                      'Реальное инвестирование подключается отдельно, со счётом и разрешениями владельца.',
                    ],
                  ].map(([title, text], i) => (
                    <li key={title}>
                      <span>{i + 1}</span>
                      <div>
                        <b>{title}</b>
                        <small>{text}</small>
                      </div>
                    </li>
                  ))}
                </ol>
                <Button variant="secondary" onClick={() => setModal('invitePreview')}>
                  Посмотреть путь друга
                </Button>
              </Card>
              <p className={css.captionText}>
                Ссылка и код — демонстрационные, не регистрируют реального пользователя. Ничего не
                отправляется автоматически. Доступ к контактам и Т-ID не запрашивается.
              </p>
            </>
          ) : modal === 'invitePreview' && g ? (
            <>
              <Chip>Предпросмотр · без регистрации</Chip>
              <p>
                Тебя приглашают в сквад <b>{g.name}</b>.
              </p>
              <p className={css.captionText}>
                {g.members.length}/4 участников.{' '}
                {g.members.length >= 4
                  ? 'Сквад заполнен: вступить сейчас нельзя.'
                  : 'Для виртуального участия брокерский счёт не нужен.'}
              </p>
              <div className={s.form} style={{ marginTop: 14 }}>
                <div className={s.field}>
                  <label htmlFor="guest-name">Имя в демо</label>
                  <input
                    id="guest-name"
                    maxLength={24}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label htmlFor="guest-agent">Агент</label>
                  <select
                    id="guest-agent"
                    value={guestAgent}
                    onChange={(e) => setGuestAgent(e.target.value as AgentId)}
                  >
                    <option value="max">Макс</option>
                    <option value="lev">Лев</option>
                    <option value="chill">Чилл</option>
                  </select>
                </div>
                <Button
                  disabled={!guestName.trim() || g.members.length >= 4 || inviteMember.isPending}
                  onClick={async () => {
                    try {
                      await inviteMember.mutateAsync({
                        name: guestName.trim(),
                        agentId: guestAgent,
                      });
                      notify('Демо-участник вступил без взноса');
                      setModal('');
                    } catch {
                      /* The mutation error is shown in this form. */
                    }
                  }}
                >
                  Вступить в демо
                </Button>
                <small className={s.muted}>
                  В этом прототипе добавится только локальный демонстрационный участник. Реальный
                  аккаунт не создаётся.
                </small>
              </div>
            </>
          ) : modal === 'teamConsent' ? (
            <>
              <p>
                {g?.decisions.find((d) => d.id === consentDecisionId)?.proposedStrategy
                  ? `Смоделировать согласие всех ${g.members.length} участников на новые правила?`
                  : 'Смоделировать согласие участников на этот план?'}
              </p>
              <p className={css.captionText}>
                {g?.decisions.find((d) => d.id === consentDecisionId)?.proposedStrategy
                  ? 'Это локальная имитация. Она не означает согласия реальных людей и не выдаёт права на реальные деньги.'
                  : 'Это не согласие реальных людей. Действие добавит только локальные демонстрационные записи.'}
              </p>
              <Button
                disabled={simulateApproval.isPending}
                onClick={async () => {
                  if (consentDecisionId) {
                    await simulateApproval.mutateAsync({ decisionId: consentDecisionId });
                    if (g?.decisions.find((d) => d.id === consentDecisionId)?.proposedStrategy) {
                      await execute.mutateAsync({ decisionId: consentDecisionId });
                      setModal('');
                    } else setModal('decisions');
                  }
                }}
              >
                Да, смоделировать
              </Button>
            </>
          ) : modal === 'menu' && g ? (
            <div className={css.menuGroup}>
              {[
                'Цель и правила',
                'Пригласить друга',
                'Все решения',
                'Создать сквад',
                'Архив сквадов',
                'Дополнительный взнос',
                'Выйти целиком',
                ...(g.captainId === 'me' ? ['Расформировать сквад'] : []),
              ].map((label, i) => (
                <button
                  key={label}
                  className={label === 'Расформировать сквад' ? css.dangerLine : undefined}
                  onClick={() => {
                    if (i === 0) openSettings();
                    else if (i === 1) setModal('invite');
                    else if (i === 2) setModal('decisions');
                    else if (i === 3) setModal('create');
                    else if (i === 4) setModal('archive');
                    else if (i === 5) setModal('fund');
                    else if (i === 6) void prepareExit();
                    else void prepareDissolve();
                  }}
                >
                  <span>{label}</span>
                  <span>›</span>
                </button>
              ))}
            </div>
          ) : modal === 'settings' ? (
            <>
              {g?.decisions.some(
                (d) => d.proposedStrategy && (d.status === 'proposed' || d.status === 'approved'),
              ) && (
                <div className={s.notice}>
                  Ждёт согласия ·{' '}
                  {
                    g.decisions.find(
                      (d) =>
                        d.proposedStrategy && (d.status === 'proposed' || d.status === 'approved'),
                    )?.approvals.length
                  }
                  /{g.members.length}
                  <br />
                  Прежние правила действуют.
                </div>
              )}
              <div className={s.field}>
                <label htmlFor="team-goal">Цель</label>
                <textarea
                  id="team-goal"
                  maxLength={300}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label>Горизонт</label>
                <Tabs
                  value={rulesDraft?.horizon || 'long'}
                  onChange={(v) => setRulesDraft((d) => (d ? { ...d, horizon: v } : d))}
                  items={[
                    { value: 'short', label: 'Краткосрок' },
                    { value: 'medium', label: 'Месяцы' },
                    { value: 'long', label: 'Долгосрок' },
                  ]}
                />
              </div>
              <div className={s.field}>
                <label>Подход</label>
                <Tabs
                  value={rulesDraft?.approach || 'balanced'}
                  onChange={(v) => {
                    setRulesDraft((d) => (d ? { ...d, approach: v } : d));
                    setStrategy(
                      { cautious: 'Осторожно', balanced: 'Сбалансированно', active: 'Активно' }[v],
                    );
                  }}
                  items={[
                    { value: 'cautious', label: 'Осторожно' },
                    { value: 'balanced', label: 'Баланс' },
                    { value: 'active', label: 'Активно' },
                  ]}
                />
              </div>
              <div className={s.field}>
                <label>Исполнение</label>
                <div className={css.executionOptions}>
                  {[
                    ['confirm', 'С подтверждением', 'Каждое действие согласует команда'],
                    ['autonomous', 'Автономно', 'В пределах общих правил'],
                  ].map(([value, label, hint]) => (
                    <label key={value} className={css.executionRadio}>
                      <input
                        type="radio"
                        name="team-mode"
                        checked={mode === value}
                        onChange={() => setMode(value as 'confirm' | 'autonomous')}
                      />
                      <span>
                        <b>{label}</b>
                        <small>{hint}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <details className={s.details}>
                <summary>
                  Инструменты и лимиты{' '}
                  <small>
                    Плечо {rulesDraft?.leverage ? 'вкл.' : 'выкл.'} · позиция{' '}
                    {rulesDraft?.maxPositionPercent}%
                  </small>
                </summary>
                {(
                  [
                    { key: 'leverage', label: 'Плечо' },
                    { key: 'short', label: 'Шорты' },
                    { key: 'derivatives', label: 'Производные' },
                  ] as const
                ).map((o) => (
                  <label key={o.key} className={s.switchrow}>
                    {o.label}
                    <input
                      type="checkbox"
                      className={s.switch}
                      checked={rulesDraft?.[o.key] || false}
                      onChange={(e) =>
                        setRulesDraft((d) => (d ? { ...d, [o.key]: e.target.checked } : d))
                      }
                    />
                  </label>
                ))}
                <div className={s.two} style={{ marginTop: 14 }}>
                  <div className={s.field}>
                    <label htmlFor="team-position">Макс. позиция, %</label>
                    <input
                      id="team-position"
                      type="number"
                      min="1"
                      max="100"
                      value={rulesDraft?.maxPositionPercent || ''}
                      onChange={(e) =>
                        setRulesDraft((d) => (d ? { ...d, maxPositionPercent: e.target.value } : d))
                      }
                    />
                  </div>
                  {rulesDraft?.leverage && (
                    <div className={s.field}>
                      <label htmlFor="team-leverage">Предел плеча, ×</label>
                      <input
                        id="team-leverage"
                        type="number"
                        min="1"
                        max="5"
                        step=".1"
                        value={rulesDraft.maxLeverage}
                        onChange={(e) =>
                          setRulesDraft((d) => (d ? { ...d, maxLeverage: e.target.value } : d))
                        }
                      />
                    </div>
                  )}
                  <div className={s.field}>
                    <label htmlFor="team-cost">Лимит расходов, ₽</label>
                    <input
                      id="team-cost"
                      type="number"
                      min="0"
                      value={rulesDraft?.costLimit || ''}
                      onChange={(e) =>
                        setRulesDraft((d) => (d ? { ...d, costLimit: e.target.value } : d))
                      }
                    />
                  </div>
                </div>
              </details>
              <p className={s.muted} style={{ fontSize: 10 }}>
                Новые правила действуют только после согласия команды.
              </p>
              <div className={s.actions}>
                <Button variant="secondary" onClick={() => setModal('')}>
                  Отмена
                </Button>
                <Button onClick={saveSettings} disabled={!goal.trim() || save.isPending}>
                  Предложить команде
                </Button>
              </div>
              {g?.decisions
                .filter(
                  (d) => d.proposedStrategy && (d.status === 'proposed' || d.status === 'approved'),
                )
                .slice(0, 1)
                .map((d) => (
                  <section key={d.id} className={css.pendingPanel}>
                    <b>Демо-согласование</b>
                    <p>Это локальная имитация, не согласие реальных друзей.</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setConsentDecisionId(d.id);
                        setModal('teamConsent');
                      }}
                    >
                      Смоделировать согласие команды
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await reject.mutateAsync({ decisionId: d.id });
                        setModal('');
                      }}
                    >
                      Отменить предложение
                    </Button>
                  </section>
                ))}
              {g?.captainId === 'me' && (
                <button className={css.disbandLink} onClick={prepareDissolve}>
                  Расформировать сквад
                </button>
              )}
            </>
          ) : modal === 'fund' ? (
            <>
              <p className={s.muted}>
                Взнос поступит в общий портфель только после решения команды.
              </p>
              <div className={s.field}>
                <label htmlFor="contribution">Сумма, ₽</label>
                <input
                  id="contribution"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button
                onClick={requestFund}
                disabled={!amount.trim() || Number(amount) <= 0 || propose.isPending}
              >
                Отправить на согласование
              </Button>
            </>
          ) : modal === 'exit' && exitData ? (
            <>
              <div className={s.two}>
                {[
                  ['Внесено', exitData.contribution],
                  ['Текущая стоимость', exitData.value],
                  ['Результат', exitData.profit],
                  ['Расходы', exitData.fee],
                  ['Условный налог', exitData.tax],
                  ['К распределению', exitData.payout],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className={s.label}>{label}</span>
                    <b>{fmt(value)}</b>
                  </div>
                ))}
              </div>
              <label className={s.radio}>
                <input
                  type="checkbox"
                  checked={reviewChecked}
                  onChange={(e) => setReviewChecked(e.target.checked)}
                />
                <span>Подтверждаю полный выход. Частичный вывод недоступен.</span>
              </label>
              <p className={s.muted}>Расчёт виртуальный. Личный денежный остаток не изменится.</p>
              <Button onClick={leave} disabled={!reviewChecked || confirmExit.isPending}>
                Подтвердить полный выход
              </Button>
            </>
          ) : modal === 'dissolve' && dissolveData ? (
            <>
              <p className={s.muted}>
                Сквад будет архивирован. История и снимок распределения сохранятся.
              </p>
              <div className={css.distributionSummary}>
                <small>Общая виртуальная стоимость</small>
                <b>{payoutRub(g?.value || '0')}</b>
              </div>
              {dissolveData.members.map((m) => (
                <article key={m.id} className={css.payoutPerson}>
                  <h3>
                    {g?.members.find((v) => v.userId === m.memberId)?.name || m.memberId}
                    {m.memberId === 'me' ? ' · ты' : ''}
                  </h3>
                  <div className={css.payoutGrid}>
                    {[
                      ['Внесено', payoutRub(m.contribution)],
                      [
                        'Доля капитала',
                        `${g?.members.find((v) => v.userId === m.memberId)?.sharePercent || '0'}%`,
                      ],
                      ['Сейчас стоит', payoutRub(m.value)],
                      ['К выплате · демо', payoutRub(m.payout)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
              <div className={s.notice}>
                Незавершённые демо-планы и заявки будут отменены. История и расчёт сохранятся в
                архиве.
              </div>
              <label className={s.radio}>
                <input
                  type="checkbox"
                  checked={reviewChecked}
                  onChange={(e) => setReviewChecked(e.target.checked)}
                />
                <span>
                  Подтверждаю расформирование виртуального сквада и сохранение расчёта в архиве.
                </span>
              </label>
              <Button
                variant="secondary"
                onClick={disband}
                disabled={!reviewChecked || confirmDissolve.isPending}
              >
                Расформировать в демо
              </Button>
            </>
          ) : modal === 'archive' ? (
            <>
              {archived.length ? (
                archived.map((a) => (
                  <button
                    key={a.id}
                    className={css.archiveItem}
                    onClick={() => {
                      setArchiveId(a.id);
                      setModal('archiveDetail');
                    }}
                  >
                    <b>{a.name}</b>
                    <small>
                      {a.myExit
                        ? 'Твоё участие завершено'
                        : a.archivedAt
                          ? new Date(a.archivedAt).toLocaleDateString('ru-RU', {
                              timeZone: 'Europe/Moscow',
                            })
                          : 'Расформирован'}{' '}
                      · Распределение в демо {payoutRub(a.myExit?.payout || a.value)}
                    </small>
                  </button>
                ))
              ) : (
                <Card>Архив пока пуст</Card>
              )}
            </>
          ) : modal === 'archiveDetail' ? (
            archived
              .filter((a) => a.id === archiveId)
              .map((a) => (
                <div key={a.id} className={css.archivedContent}>
                  <section className={css.distributionSummary}>
                    <small>{a.myExit ? 'Твоё участие завершено' : 'Распределено виртуально'}</small>
                    <b>{payoutRub(a.myExit?.payout || a.value)}</b>
                    <small style={{ marginTop: 8 }}>
                      Реальных переводов и изменения личного счёта нет
                    </small>
                  </section>
                  {(a.myExit ? [a.myExit] : a.archiveDistribution || []).map((m) => (
                    <article key={m.id} className={css.payoutPerson}>
                      <h3>
                        {a.members.find((v) => v.userId === m.memberId)?.name ||
                          (m.memberId === 'me' ? 'Ты' : m.memberId)}
                        {m.memberId === 'me' ? ' · ты' : ''}
                      </h3>
                      <div className={css.payoutGrid}>
                        {[
                          ['Внесено', payoutRub(m.contribution)],
                          [
                            'Доля капитала',
                            `${new Decimal(m.value)
                              .div(
                                new Decimal(a.myExit?.value || a.value || '0').eq(0)
                                  ? '1'
                                  : a.myExit?.value || a.value,
                              )
                              .mul(100)
                              .toFixed(2)
                              .replace('.', ',')}%`,
                          ],
                          ['Сейчас стоит', payoutRub(m.value)],
                          ['К выплате · демо', payoutRub(m.payout)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <small>{label}</small>
                            <b>{value}</b>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                  <Card>
                    <h2 style={{ fontSize: 17 }}>Сохранённая история</h2>
                    {a.decisions.length ? (
                      a.decisions.map((d) => (
                        <details key={d.id} className={s.details}>
                          <summary>{d.title}</summary>
                          {decisionView(d, true)}
                        </details>
                      ))
                    ) : (
                      <p className={css.captionText}>До расформирования обсуждений не было.</p>
                    )}
                    <p className={css.captionText}>
                      Сообщений в чате: {a.messages.length}. Архив сохраняет их вместе с правилами и
                      журналом.
                    </p>
                  </Card>
                </div>
              ))
          ) : null}
          {mutationError && <QueryError error={mutationError} />}
        </div>
      </SquadSurface>
      {element}
    </div>
  );
}
