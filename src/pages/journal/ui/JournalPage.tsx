import css from './source-typography.module.css';
import { useOverview } from '../../../entities/portfolio';
import { useState, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, Settings2 } from 'lucide-react';
import { useJournal } from '../../../entities/journal';
import type { JournalEvent } from '../../../shared/api/contracts';
import {
  Button,
  ButtonLink,
  fmt,
  pct,
  useNotice,
  PageHeading,
  Loading,
  QueryError,
  Empty,
  Modal,
  Chip,
  s,
} from '../../../shared/ui';
export function JournalPage() {
  const [filter, setFilter] = useState('all'),
    [selected, setSelected] = useState<JournalEvent | null>(null);
  const q = useJournal(filter),
    overview = useOverview();
  const [report, setReport] = useState(false),
    [share, setShare] = useState(false),
    shareSvg = useRef<SVGSVGElement>(null),
    { notify, element } = useNotice();
  function downloadCard() {
    if (!shareSvg.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(shareSvg.current)], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 't-liga-season-01.svg';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={css.page}>
      <div style={{ marginBottom: 16 }}>
        <PageHeading
          title="История действий"
          description="Сделки, анализ и твои поручения."
          action={
            <Button variant="ghost" small onClick={() => setReport(true)}>
              Итоги сезона
            </Button>
          }
        />
      </div>
      <div className={css.filters}>
        {[
          ['all', 'Все'],
          ['trade', 'Сделки'],
          ['analysis', 'Анализ и идеи'],
          ['settings', 'Настройки'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      <div>
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : q.data?.length ? (
          <section className={css.historyList}>
            {q.data.map((e) => (
              <button className={css.event} key={e.id} onClick={() => setSelected(e)}>
                <span className={css.eventIcon}>
                  {e.type === 'trade' ? (
                    e.title.startsWith('Продажа') ? (
                      <ArrowDownLeft size={12} />
                    ) : (
                      <ArrowUpRight size={12} />
                    )
                  ) : e.type === 'settings' ? (
                    <Settings2 size={12} />
                  ) : (
                    <Search size={12} />
                  )}
                </span>
                <span>
                  <span className={css.eventTitle}>{e.title}</span>
                  <span className={css.eventMeta}>
                    {new Date(e.createdAt).toLocaleString('ru-RU', {
                      timeZone: 'Europe/Moscow',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {e.status}
                    <br />
                    {e.source}
                  </span>
                </span>
                <span className={css.eventArrow}>›</span>
              </button>
            ))}
          </section>
        ) : (
          <Empty
            title="Пока нет таких событий"
            text="Сделки и решения будут появляться здесь по фактическому времени."
          />
        )}
      </div>
      <p className={css.caption}>
        История пополняется при действиях в демо: ручной покупке или продаже, проверке и сохранении
        идей, изменении правил. Два стартовых события — иллюстрации работы агента. Фоновый анализ
        рынка в HTML не запущен.
      </p>
      <Modal
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.title || 'Действие'}
      >
        <Chip>{selected?.status}</Chip>
        <div className={css.detailLine}>
          <small>Когда и кто</small>
          <p>
            {selected &&
              new Date(selected.createdAt).toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow',
              })}{' '}
            · {selected?.source}
          </p>
        </div>
        <div className={css.detailLine}>
          <small>Основание</small>
          <p>{selected?.source}</p>
        </div>
        <div className={css.detailLine}>
          <small>Что произошло</small>
          <p>{selected?.description}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSelected(null);
            setFilter('all');
          }}
        >
          Вся история действий
        </Button>
      </Modal>
      <Modal open={report} onOpenChange={setReport} title="Твой сезон с AI">
        <div className={s.form}>
          <Chip yellow>Предварительный разбор · демо</Chip>
          {overview.data && (
            <>
              <b className={`${s.metric} ${s.green}`}>
                {pct(overview.data.portfolio.returnPercent)}
              </b>
              <p className={s.muted}>
                Результат {fmt(overview.data.portfolio.profit)}. В портфеле{' '}
                {overview.data.portfolio.positions.length} инструментов, свободно{' '}
                {fmt(overview.data.portfolio.cash)}. Максимальная просадка —{' '}
                {pct(overview.data.portfolio.drawdownPercent)}.
              </p>
              <h3 style={{ marginBottom: 0 }}>Что проверим дальше</h3>
              <p className={s.muted}>
                Сравним более равномерный состав с текущим. Не меняем стратегию без твоего решения.
              </p>
              <ButtonLink to="/compare">Открыть лабораторию</ButtonLink>
              <Button
                variant="secondary"
                onClick={() => {
                  setReport(false);
                  setShare(true);
                }}
              >
                Карточка результата ↗
              </Button>
            </>
          )}
        </div>
      </Modal>
      <Modal open={share} onOpenChange={setShare} title="Карточка результата">
        {overview.data && (
          <div className={s.form}>
            <div className={css.shareCard}>
              <span>Т-ЛИГА · СЕЗОН 01</span>
              <h2>
                {overview.data.user.name}
                <br />
                {overview.data.user.rank}
              </h2>
              <div className={css.shareMetrics}>
                <b>#{overview.data.user.place.toLocaleString('ru-RU')}</b>
                <strong>{pct(overview.data.portfolio.returnPercent)}</strong>
              </div>
              <p>Демонстрационный виртуальный результат</p>
            </div>
            <p className={s.muted} style={{ fontSize: 12 }}>
              Карточка для обсуждения с командой. Можно сделать снимок экрана.
            </p>
            <svg
              ref={shareSvg}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 600 360"
              role="img"
              aria-label="Карточка результата сезона"
              style={{ display: 'none' }}
            >
              <rect width="600" height="360" rx="28" fill="#282e38" />
              <text x="34" y="49" fill="#f2d46e" fontSize="16" fontFamily="Arial">
                Т-ЛИГА · СЕЗОН 01
              </text>
              <text x="34" y="119" fill="white" fontSize="32" fontWeight="700" fontFamily="Arial">
                {overview.data.user.name.slice(0, 24)}
              </text>
              <text x="34" y="158" fill="#bdc9dc" fontSize="21" fontFamily="Arial">
                {overview.data.user.rank}
              </text>
              <text x="34" y="245" fill="white" fontSize="48" fontWeight="700" fontFamily="Arial">
                #{overview.data.user.place.toLocaleString('ru-RU')}
              </text>
              <text
                x="568"
                y="245"
                textAnchor="end"
                fill="#65cea9"
                fontSize="44"
                fontWeight="700"
                fontFamily="Arial"
              >
                {pct(overview.data.portfolio.returnPercent)}
              </text>
              <text x="34" y="320" fill="#9baac0" fontSize="14" fontFamily="Arial">
                Демонстрационный виртуальный результат
              </text>
            </svg>
            <Button onClick={downloadCard}>Скачать карточку</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Т-Лига · ${overview.data!.user.name} · ${overview.data!.user.rank} · #${overview.data!.user.place} · ${pct(overview.data!.portfolio.returnPercent)}`,
                  );
                  notify('Результат скопирован');
                } catch {
                  notify('Не удалось скопировать. Можно скачать карточку.');
                }
              }}
            >
              Скопировать результат
            </Button>
          </div>
        )}
      </Modal>
      {element}
    </div>
  );
}
