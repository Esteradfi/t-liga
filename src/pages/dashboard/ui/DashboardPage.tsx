import css from './dashboard.module.css';
import { useInstruments } from '../../../entities/market';
import {
  RankBadge,
  AgentAvatar,
  personas,
  MiniSpark,
  instrumentSymbol,
} from '../../../widgets/investment-ui';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Users, Sparkles, History, ChartNoAxesCombined, Eye } from 'lucide-react';
import { useOverview, useFundPortfolio } from '../../../entities/portfolio';
import { useState } from 'react';
import {
  Card,
  Button,
  ButtonLink,
  PageHeading,
  Chip,
  TrendChart,
  ListRow,
  Loading,
  QueryError,
  fmt,
  pct,
  s,
  Modal,
} from '../../../shared/ui';
export function DashboardPage() {
  const instruments = useInstruments(),
    navigate = useNavigate();
  const [lastOpen, setLastOpen] = useState(false);
  const query = useOverview(),
    [period, setPeriod] = useState('Сезон'),
    [help, setHelp] = useState(false),
    [funding, setFunding] = useState(false),
    [amount, setAmount] = useState('10000'),
    fund = useFundPortfolio();
  if (query.isPending) return <Loading />;
  if (query.error) return <QueryError error={query.error} retry={() => query.refetch()} />;
  const d = query.data!;
  return (
    <div>
      <div className={css.heading}>
        <PageHeading title={`Привет, ${d.user.name}`} />
      </div>
      <Link to="/arena" className={css.rankStrip}>
        <span className={css.rankIdentity}>
          <RankBadge name={d.user.rank} size={31} />
          <span>
            <small>{d.user.rank}</small>
            <b>
              {d.user.movement
                ? `↑ ${d.user.movement} позиций за сегодня`
                : `Сезон 01 · Ещё ${d.season.daysLeft} дней`}
            </b>
          </span>
        </span>
        <strong>#{d.user.place.toLocaleString('ru-RU')}</strong>
      </Link>
      <div className={`${s.grid} dashboard-grid`}>
        <div className={s.stack}>
          <Card className={`dashboard-portfolio ${css.portfolio}`}>
            <div className={css.portfolioHeading}>
              <div>
                <h2>Портфель под управлением</h2>
                <span>{d.agent.name} · Виртуальный счёт</span>
              </div>
              <button
                className={css.add}
                onClick={() => setFunding(true)}
                aria-label="Пополнить портфель"
              >
                +
              </button>
            </div>
            <div className={css.value}>{fmt(d.portfolio.value)}</div>
            <div className={css.profit}>
              <b>
                {d.portfolio.profit.startsWith('-') ? '' : '+'}
                {fmt(d.portfolio.profit)} <span>{pct(d.portfolio.returnPercent)}</span>
              </b>
              <span>за сезон</span>
            </div>
            <div className={css.allocation}>
              <div>
                <span>В активах</span>
                <b>{fmt(d.portfolio.invested)}</b>
              </div>
              <div>
                <span>Свободно</span>
                <b>{fmt(d.portfolio.cash)}</b>
              </div>
            </div>
            <div className={css.periods} role="tablist">
              {['День', 'Неделя', 'Сезон', 'Всё время'].map((p) => (
                <button
                  role="tab"
                  aria-selected={period === p}
                  key={p}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <TrendChart
              height={92}
              data={
                period === 'День'
                  ? d.portfolio.history.slice(-5)
                  : period === 'Неделя'
                    ? d.portfolio.history.slice(-7)
                    : d.portfolio.history
              }
            />
            <div className={css.portfolioBottom}>
              <button onClick={() => setHelp(true)}>
                Как считается портфель <span>ⓘ</span>
              </button>
              <span className={css.mode}>
                <i style={{ background: d.config.paused ? '#aaa' : '#16966b' }} />
                {d.config.paused
                  ? 'На паузе'
                  : d.config.mode === 'autonomous'
                    ? 'Автономно'
                    : 'С подтверждением'}
              </span>
            </div>
          </Card>
          <Card className={`dashboard-agent ${css.agent}`}>
            <div className={css.agentTop}>
              <h2>Твой напарник</h2>
              <ButtonLink to="/settings" variant="ghost" small>
                Настроить →
              </ButtonLink>
            </div>
            <Link className={css.agentBody} to="/agent">
              <AgentAvatar index={['max', 'lev', 'chill'].indexOf(d.agent.id)} size={54} />
              <div>
                <div className={css.agentName}>
                  <h2>{d.agent.name}</h2>
                  <span>{d.config.paused ? 'На паузе' : 'На связи'}</span>
                </div>
                <small>{personas[['max', 'lev', 'chill'].indexOf(d.agent.id)]?.style}</small>
                <p>«{personas[['max', 'lev', 'chill'].indexOf(d.agent.id)]?.quote}»</p>
              </div>
            </Link>
          </Card>
          <Card className="dashboard-holdings">
            <div className={s.row}>
              <h2 style={{ margin: 0 }}>В портфеле</h2>
              <ButtonLink to="/market" variant="ghost" small>
                Весь рынок →
              </ButtonLink>
            </div>
            {d.portfolio.positions.map((p) => (
              <ListRow
                key={p.instrumentId}
                title={p.name}
                description={`${p.symbol} · ${p.quantity} шт.`}
                icon={instrumentSymbol(p.instrumentId)}
                to={`/market/${p.instrumentId}`}
                right={
                  <div className={css.assetRight}>
                    <MiniSpark
                      data={
                        instruments.data?.find((i) => i.id === p.instrumentId)?.history || [
                          { value: 0 },
                          { value: 1 },
                        ]
                      }
                    />
                    <div style={{ textAlign: 'right' }}>
                      <b>{fmt(p.value)}</b>
                      <small>{fmt(p.price)} за штуку</small>
                    </div>
                  </div>
                }
              />
            ))}
          </Card>
        </div>
        <div className={s.stack}>
          <Card className="dashboard-squad">
            <Chip yellow>Вместе интереснее</Chip>
            <h2 style={{ fontSize: 27, margin: '15px 0 12px' }}>
              Собери свой <br />
              инвест-сквад
            </h2>
            <p className={s.muted}>
              Четыре игрока. Четыре агента. <br />
              Одна командная стратегия.
            </p>
            <ButtonLink to="/squads">
              Позвать друзей <ArrowRight size={16} />
            </ButtonLink>
          </Card>
          <Link
            to="/season"
            className={`${s.card} dashboard-season`}
            style={{ textDecoration: 'none' }}
          >
            <div className={s.row}>
              <h3 style={{ margin: 0 }}>Путь сезона</h3>
              <Chip>Уровень {d.season.level}/10</Chip>
            </div>
            <div className={s.progress} style={{ margin: '18px 0 12px' }}>
              <span style={{ width: `${(d.season.xp / d.season.nextXp) * 100}%` }} />
            </div>
            <span className={s.label}>Следующая награда</span>
            <b style={{ fontSize: 13 }}>Титул «Исследователь»</b>
            <p className={s.muted} style={{ margin: '7px 0 0' }}>
              Ещё {d.season.nextXp - d.season.xp} XP
            </p>
          </Link>
          <Card className={`dashboard-history ${css.historyWidget}`}>
            <div className={css.historyHeading}>
              <h2 style={{ margin: 0 }}>Действия агента</h2>
              <Link to="/journal">Вся история →</Link>
            </div>
            {d.lastEvent ? (
              <button className={css.event} onClick={() => setLastOpen(true)}>
                <span className={css.eventIcon}>↗</span>
                <span>
                  <span className={css.eventTitle}>{d.lastEvent.title}</span>
                  <span className={css.eventMeta}>
                    {new Date(d.lastEvent.createdAt).toLocaleString('ru-RU', {
                      timeZone: 'Europe/Moscow',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {d.lastEvent.status}
                    <br />
                    {d.lastEvent.source}
                  </span>
                </span>
                <span className={css.eventArrow}>›</span>
              </button>
            ) : (
              <p className={s.muted} style={{ margin: '16px 0 0' }}>
                Пока нет решений. Начни разговор с агентом.
              </p>
            )}
          </Card>
        </div>
      </div>
      <Modal open={lastOpen} onOpenChange={setLastOpen} title={d.lastEvent?.title || 'Действие'}>
        <Chip>{d.lastEvent?.status}</Chip>
        <div className={css.eventDetail}>
          <small>Когда и кто</small>
          <p>
            {d.lastEvent &&
              new Date(d.lastEvent.createdAt).toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow',
              })}{' '}
            · {d.lastEvent?.source}
          </p>
        </div>
        <div className={css.eventDetail}>
          <small>Основание</small>
          <p>{d.lastEvent?.source}</p>
        </div>
        <div className={css.eventDetail}>
          <small>Что произошло</small>
          <p>{d.lastEvent?.description}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setLastOpen(false);
            navigate('/journal');
          }}
        >
          Вся история действий
        </Button>
      </Modal>
      <Modal
        open={funding}
        onOpenChange={setFunding}
        title="Пополнить портфель"
        className={css.fundModal}
      >
        <div className={s.field}>
          <label htmlFor="fund-amount">Сумма, ₽</label>
          <input
            id="fund-amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {fund.error && <QueryError error={fund.error} />}
        <Button
          full
          disabled={!amount.trim() || Number(amount) <= 0 || fund.isPending}
          onClick={async () => {
            try {
              await fund.mutateAsync({ amount });
              setFunding(false);
            } catch {
              /* Mutation error remains visible. */
            }
          }}
        >
          Пополнить
        </Button>
      </Modal>
      <Modal
        open={help}
        onOpenChange={setHelp}
        title="Что входит в портфель"
        className={css.helpModal}
      >
        <p>
          <b>Всего под управлением — {fmt(d.portfolio.value)}.</b> Это текущая стоимость выделенного
          агенту портфеля, а не весь баланс Т-Банка.
        </p>
        <div className={css.helpComparison}>
          <span>В активах</span>
          <span>{fmt(d.portfolio.invested)}</span>
        </div>
        <p className={css.helpNote}>
          Текущая стоимость купленных инструментов. Она меняется вместе с ценами.
        </p>
        <div className={css.helpComparison}>
          <span>Свободно</span>
          <span>{fmt(d.portfolio.cash)}</span>
        </div>
        <p className={css.helpNote}>
          Не вложенные деньги для новых покупок. В рабочем продукте средства, зарезервированные под
          заявки, учитываются отдельно.
        </p>
        <p className={css.helpNote}>
          Все значения в макете виртуальные. Демо-покупка переносит сумму из свободных средств в
          активы; пополнение не считается прибылью.
        </p>
      </Modal>
    </div>
  );
}
export function MorePage() {
  const { data } = useOverview();
  return (
    <div className={css.more}>
      <h1>Ещё</h1>
      <Link to="/profile" className={css.moreProfile}>
        <span className={s.avatar}>
          {data?.user.avatar ? (
            <img src={data.user.avatar} alt="" />
          ) : (
            data?.user.name.slice(0, 2) || 'АР'
          )}
        </span>
        <span>
          <b>Мой профиль</b>
          <small>
            {data?.user.name || 'Артём'} · {data?.user.rank || 'Серебряный Волк'}
          </small>
        </span>
        <i>›</i>
      </Link>
      <Link to="/plans" className={css.moreTariffs}>
        <span>
          <b>Тарифы Т-Лиги</b>
          <small>Старт · Плюс · Сквад</small>
        </span>
        <i>›</i>
      </Link>
      <section className={css.moreLinks}>
        {[
          { title: 'Чат агента', to: '/agent', icon: Bot },
          { title: 'Рынок', to: '/market', icon: ChartNoAxesCombined },
          { title: 'Сравнить агентов', to: '/compare', icon: Users },
          { title: 'История действий', to: '/journal', icon: History },
          { title: 'Путь сезона', to: '/season', icon: Sparkles },
          { title: 'Наблюдаю', to: '/watchlist', icon: Eye },
        ].map(({ title, to, icon: Icon }) => (
          <Link to={to} key={to}>
            <Icon size={19} strokeWidth={1.6} />
            <span>{title}</span>
            <i>›</i>
          </Link>
        ))}
      </section>
    </div>
  );
}
