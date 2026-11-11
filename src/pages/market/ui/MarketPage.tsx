import css from './market.module.css';
import { MiniSpark, instrumentSymbol } from '../../../widgets/investment-ui';
import { Decimal } from '../../../shared/lib/money';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Bookmark } from 'lucide-react';
import {
  useInstruments,
  useInstrument,
  usePreviewTrade,
  useConfirmTrade,
} from '../../../entities/market';
import { useOverview } from '../../../entities/portfolio';
import { useSendMessage } from '../../../entities/agent';
import { useTrackActivity } from '../../../entities/agent';
import type { TradePreview } from '../../../shared/api/contracts';
import {
  Card,
  Button,
  ButtonLink,
  PageHeading,
  Loading,
  QueryError,
  Empty,
  Tabs,
  TrendChart,
  Back,
  Modal,
  Chip,
  ListRow,
  fmt,
  pct,
  s,
  useNotice,
} from '../../../shared/ui';
const kinds = [
  { value: 'all', label: 'Все' },
  { value: 'shares', label: 'Акции' },
  { value: 'bonds', label: 'Облигации' },
  { value: 'funds', label: 'Фонды' },
  { value: 'metals', label: 'Металлы' },
];
export function MarketPage() {
  const [search, setSearch] = useState(''),
    [kind, setKind] = useState('all'),
    [contextOpen, setContextOpen] = useState(false);
  const query = useInstruments(search, kind === 'all' ? undefined : kind);
  return (
    <div>
      <div className={css.marketTitle}>
        <PageHeading title="Рынок" description="Найди идею. Обсуди её со своим агентом." />
      </div>
      <div className={s.grid}>
        <Card className={css.marketCard}>
          <div className={css.search}>
            <input
              className={s.input}
              aria-label="Поиск инструментов"
              placeholder="Поиск по названию или тикеру"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs scrollable items={kinds} value={kind} onChange={setKind} />
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <QueryError error={query.error} retry={() => query.refetch()} />
          ) : query.data?.length ? (
            query.data.map((i) => (
              <ListRow
                key={i.id}
                title={i.name}
                description={`${i.symbol} · ${kinds.find((k) => k.value === i.kind)?.label}`}
                to={`/market/${i.id}`}
                icon={<span style={{ color: '#556277' }}>{instrumentSymbol(i.id)}</span>}
                right={
                  <div className={css.assetRight}>
                    <MiniSpark
                      data={i.history}
                      color={Number(i.changePercent) >= 0 ? '#1aaf82' : '#c77569'}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <b>{fmt(i.price)}</b>
                      <small
                        style={{
                          color: Number(i.changePercent) >= 0 ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {pct(i.changePercent)}
                      </small>
                    </div>
                  </div>
                }
              />
            ))
          ) : (
            <Empty title="Ничего не найдено" text="Попробуй другой тикер или категорию." />
          )}
        </Card>
        <div className={`${s.stack} ${css.marketHelp}`}>
          <Card>
            <h2>Как покупка изменит портфель?</h2>
            <p className={s.muted}>
              Агент проверит доли активов, свободные средства и твои ограничения.
            </p>
            <ButtonLink to="/agent">
              Спросить агента <ArrowRight size={17} />
            </ButtonLink>
          </Card>
          <Card>
            <Chip>Проверяем контекст</Chip>
            <h2 style={{ marginTop: 15 }}>Новости и события</h2>
            <p className={s.muted}>
              В демонстрации новости не транслируются. В продукте у каждого события будут источник,
              дата и связь с решением агента.
            </p>
            <Button variant="ghost" onClick={() => setContextOpen(true)}>
              Как агент использует данные →
            </Button>
          </Card>
        </div>
      </div>
      <Modal open={contextOpen} onOpenChange={setContextOpen} title="Как агент использует данные">
        <p className={s.muted}>
          Агент учитывает сохранённые правила, портфель и твои действия. В продукте каждое рыночное
          событие будет связано с источником и временем публикации. В макете используются учебные
          данные.
        </p>
      </Modal>
    </div>
  );
}
export function InstrumentPage() {
  const { instrumentId = '', symbol } = useParams(),
    id = instrumentId || symbol || '',
    navigate = useNavigate(),
    query = useInstrument(id),
    overview = useOverview(),
    send = useSendMessage(),
    track = useTrackActivity().mutate,
    preview = usePreviewTrade(),
    confirm = useConfirmTrade();
  const [period, setPeriod] = useState('День'),
    [side, setSide] = useState<'buy' | 'sell'>('buy'),
    [lots, setLots] = useState('1'),
    [ticket, setTicket] = useState(false),
    [quote, setQuote] = useState<TradePreview | null>(null);
  const { notify, element } = useNotice();
  useEffect(() => {
    if (ticket) document.querySelector('main')?.scrollTo({ top: 0 });
  }, [ticket]);
  useEffect(() => {
    if (id) track({ type: 'instrument', text: `Открыт инструмент ${id}`, instrumentId: id });
  }, [id, track]);
  if (query.isPending) return <Loading />;
  if (query.error) return <QueryError error={query.error} retry={() => query.refetch()} />;
  const i = query.data!,
    position = overview.data?.portfolio.positions.find((p) => p.instrumentId === id),
    unit =
      (
        {
          SBER: 'акций',
          YDEX: 'акция',
          OFZ26238: 'облигация',
          GOLD: 'грамм',
          LKOH: 'акция',
          TMON: 'паёв',
        } as Record<string, string>
      )[id] || 'шт.';
  function open(side: 'buy' | 'sell') {
    setSide(side);
    setLots('1');
    setQuote(null);
    setTicket(true);
  }
  async function review() {
    try {
      const q = await preview.mutateAsync({ instrumentId: id, side, lots: Number(lots) });
      setQuote(q);
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function execute() {
    if (!quote) return;
    try {
      await confirm.mutateAsync({ previewId: quote.previewId || quote.id });
      setTicket(false);
      setQuote(null);
      notify(side === 'buy' ? 'Виртуальные лоты куплены' : 'Виртуальные лоты проданы');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function ask() {
    await send.mutateAsync({
      text: `Разбери ${i.name} (${i.symbol}) с учётом моего портфеля и правил. Стоит ли менять его долю?`,
    });
    navigate('/agent');
  }
  if (ticket) {
    const count = Number(lots),
      valid = Number.isInteger(count) && count > 0;
    const base = valid
      ? new Decimal(i.price).mul(i.lotSize).mul(count).toDecimalPlaces(2)
      : new Decimal(0);
    const fee = base.mul('0.003').toDecimalPlaces(2),
      total = side === 'buy' ? base.plus(fee) : base.minus(fee);
    const warning = !valid
      ? 'Количество лотов должно быть целым и больше нуля.'
      : side === 'buy' && total.gt(overview.data?.portfolio.cash || '0')
        ? 'Недостаточно свободных средств.'
        : side === 'sell' && count > (position?.lots || 0)
          ? 'Недостаточно лотов. Сначала купи инструмент в демо.'
          : '';
    return (
      <div className={css.orderTicket}>
        <div className={css.ticketTop}>
          <button onClick={() => setTicket(false)}>← {i.name}</button>
          <Chip>Виртуальная сделка</Chip>
        </div>
        <PageHeading
          title={side === 'buy' ? 'Покупка' : 'Продажа'}
          description={`${i.name} · ${i.symbol}`}
        />
        <Card className={css.ticket}>
          <div className={css.ticketType}>
            <span>Исполнение</span>
            <b>По демо-цене</b>
          </div>
          <div>
            <div className={s.label}>Количество лотов</div>
            <div className={css.ticketLots}>
              <button
                aria-label="Уменьшить лоты"
                onClick={() => setLots(String(Math.max(1, (Number(lots) || 1) - 1)))}
              >
                −
              </button>
              <input
                aria-label="Количество лотов"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={lots}
                onChange={(e) => {
                  setLots(e.target.value);
                  setQuote(null);
                }}
              />
              <button
                aria-label="Увеличить лоты"
                onClick={() => setLots(String(Math.max(1, (Number(lots) || 1) + 1)))}
              >
                +
              </button>
            </div>
            <p className={css.ticketUnits}>
              {valid
                ? `${count * i.lotSize} ${unit} · 1 лот = ${i.lotSize} ${unit}`
                : 'Введи целое число лотов'}
            </p>
          </div>
          <div className={css.ticketDetails}>
            {[
              ['Цена за единицу', fmt(i.price)],
              ['Стоимость лотов', valid ? fmt(base.toFixed(2)) : '—'],
              ['Демо-комиссия · 0,3%', valid ? fmt(fee.toFixed(2)) : '—'],
              [
                side === 'buy' ? 'Доступно денег' : 'Доступно лотов',
                side === 'buy'
                  ? fmt(overview.data?.portfolio.cash || '0')
                  : `${position?.lots || 0} лот.`,
              ],
            ].map(([label, value]) => (
              <div key={label} className={css.ticketLine}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
            <div className={`${css.ticketLine} ${css.ticketTotal}`}>
              <span>{side === 'buy' ? 'К списанию' : 'К зачислению'}</span>
              <b>{valid ? fmt(total.toFixed(2)) : '—'}</b>
            </div>
          </div>
          <div className={css.ticketWarning}>{warning}</div>
          {preview.error && <QueryError error={preview.error} />}
          <Button full onClick={review} disabled={Boolean(warning) || preview.isPending}>
            Проверить заявку
          </Button>
        </Card>
        <p className={css.ticketNote}>
          Ручное поручение подтверждаешь ты. Пауза агента его не блокирует. Демо-комиссия не
          является тарифом Т-Банка. Плечо и шорт в ручной сделке не используются.
        </p>
        <Modal
          open={Boolean(quote)}
          onOpenChange={(v) => !v && setQuote(null)}
          title="Проверь перед подтверждением"
          className={css.tradeConfirm}
        >
          {quote && (
            <>
              <Chip>Ручное поручение · демо</Chip>
              <p className={css.confirmTitle}>
                <b>
                  {side === 'buy' ? 'Покупка' : 'Продажа'} · {i.name}
                </b>
                <br />
                {quote.lots} лот. · {quote.quantity} {unit}
              </p>
              <div className={css.ticketLine}>
                <span>Комиссия включена</span>
                <b>{fmt(quote.fee)}</b>
              </div>
              <div className={`${css.ticketLine} ${css.ticketTotal}`}>
                <span>{side === 'buy' ? 'К списанию' : 'К зачислению'}</span>
                <b>{fmt(quote.total)}</b>
              </div>
              <p className={css.confirmNote}>
                Нажатие изменит только виртуальный портфель. Биржевая заявка не отправляется.
              </p>
              {confirm.error && <QueryError error={confirm.error} />}
              <Button onClick={execute} disabled={confirm.isPending}>
                {side === 'buy' ? 'Подтвердить покупку' : 'Подтвердить продажу'}
              </Button>
            </>
          )}
        </Modal>
        {element}
      </div>
    );
  }
  return (
    <div className={css.instrument}>
      <div className={css.instrumentTop}>
        <Back to="/market" label="Назад" />
        <Chip>Учебный рынок</Chip>
      </div>
      <div className={`${s.row} ${css.instrumentBrand}`}>
        <div className={s.flex}>
          <span className={s.icon} style={{ background: i.color }}>
            {instrumentSymbol(i.id)}
          </span>
          <div>
            <h1 style={{ fontSize: 25, margin: '0 0 5px' }}>{i.name}</h1>
            <span className={s.muted}>{i.symbol}</span>
          </div>
        </div>
        <Button
          variant="secondary"
          small
          aria-label="Сохранить наблюдение"
          onClick={() => {
            track({ type: 'watch', text: `Наблюдаю за ${i.symbol}`, instrumentId: id });
            notify('Наблюдение сохранено для агента');
          }}
        >
          <Bookmark size={18} />
        </Button>
      </div>
      <div className={s.grid}>
        <Card className={css.quote}>
          <div className={css.price}>{fmt(i.price)}</div>
          <p
            className={Number(i.changePercent) >= 0 ? s.green : s.red}
            style={{ fontSize: 12, marginTop: 8 }}
          >
            {pct(i.changePercent)} <span className={s.muted}>за день</span>
          </p>
          <div className={css.unit}>
            {i.kind === 'bonds' ? 'Условная цена облигации без НКД' : 'Цена за единицу'} ·
            Демо-котировка
          </div>
          <TrendChart
            height={94}
            seed={period.length}
            data={i.history.slice(
              period === 'День' ? -7 : period === 'Неделя' ? -14 : period === 'Месяц' ? -21 : 0,
            )}
          />
          <div className={css.instrumentPeriods}>
            <Tabs
              value={period}
              onChange={setPeriod}
              items={['День', 'Неделя', 'Месяц', 'Год'].map((value) => ({ value, label: value }))}
            />
          </div>
          <div className={`${s.two} ${css.facts}`}>
            <div>
              <span className={s.label}>Один лот</span>
              <b>{i.lotSize} шт.</b>
            </div>
            <div>
              <span className={s.label}>В портфеле</span>
              <b>{position?.lots || 0} лот.</b>
            </div>
            <div>
              <span className={s.label}>Стоимость лота</span>
              <b>{fmt(new Decimal(i.price).mul(i.lotSize).toString())}</b>
            </div>
            <div>
              <span className={s.label}>Свободно</span>
              <b>{fmt(overview.data?.portfolio.cash || 0)}</b>
            </div>
          </div>
        </Card>
        <div className={s.stack}>
          <Card className={css.agentIdea}>
            <h2>Что думает {overview.data?.agent.name || 'твой агент'}?</h2>
            <p className={s.muted}>
              Проверим, зачем этот актив твоей стратегии, какую долю он займёт и сколько денег
              останется.
            </p>
            <Button full onClick={ask} disabled={send.isPending}>
              Разобрать с агентом
            </Button>
            {send.error && <QueryError error={send.error} />}
          </Card>
          <Card>
            <h2>Сделка самостоятельно</h2>
            <p className={s.muted}>Выбери количество лотов и проверь итог перед подтверждением.</p>
            <div className={s.actions}>
              <Button onClick={() => open('buy')}>Купить</Button>
              <Button variant="secondary" onClick={() => open('sell')}>
                Продать
              </Button>
            </div>
          </Card>
          <Card>
            <h3>Об инструменте</h3>
            <p className={s.muted}>{i.description}</p>
          </Card>
        </div>
      </div>

      {element}
    </div>
  );
}
