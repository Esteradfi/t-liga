import { useState } from 'react';
import styles from './PlansPage.module.css';
import { Check, ChevronDown } from 'lucide-react';
import { useOverview } from '../../../entities/portfolio';
import { usePlans, useSubscribePlan } from '../../../entities/season';
import type { Plan } from '../../../shared/api/contracts';
import {
  Back,
  Card,
  Button,
  PageHeading,
  Loading,
  QueryError,
  Modal,
  s,
  fmt,
  useNotice,
} from '../../../shared/ui';
const briefs: Record<string, string[]> = {
  start: [
    '20 обычных запросов в месяц',
    'Без фонового мониторинга',
    'Анализ и подтверждение операций',
    'Арена и базовые награды',
  ],
  plus: [
    '200 обычных + 20 глубоких отдельно',
    '1 стратегия · событийный мониторинг',
    'Автономный режим и контекст',
    'Платная ветка Battle Pass',
  ],
  squad: [
    '600 обычных + 60 глубоких на команду',
    'До 4 личных стратегий',
    'Совет агентов: 3 глубоких разбора',
    'Battle Pass каждому участнику',
  ],
};
export function PlansPage() {
  const overview = useOverview(),
    q = usePlans(),
    subscribe = useSubscribePlan(),
    [selected, setSelected] = useState<Plan | null>(null),
    [comparisonOpen, setComparisonOpen] = useState(false),
    [expanded, setExpanded] = useState<string | null>(null),
    notice = useNotice();
  if (q.isPending) return <Loading />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  return (
    <div className={styles.page}>
      <Back to="/season" label="Путь сезона" />
      <PageHeading title="Тарифы Т-Лиги" description="Для себя или команды." />
      <div className={styles.grid}>
        {q.data?.map((p) => (
          <Card key={p.id} className={`${styles.plan} ${p.id === 'plus' ? styles.featured : ''}`}>
            <h2>{p.name}</h2>
            <div className={s.metric} style={{ marginTop: 20 }}>
              {fmt(p.price)}
            </div>
            <p className={s.muted} style={{ fontSize: 11, marginTop: 5 }}>
              {p.unit.charAt(0).toUpperCase() + p.unit.slice(1)}
            </p>
            <ul
              style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12, margin: '20px 0' }}
            >
              {(briefs[p.id] || p.features).map((f) => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.6 }}>
                  <Check size={15} style={{ flexShrink: 0, color: '#ad9140', marginTop: 3 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <details className={`${s.details} ${styles.fullDetails}`} open={expanded === p.id}>
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setExpanded(expanded === p.id ? null : p.id);
                }}
              >
                <span className={styles.collapsedLabel}>Подробнее о тарифе</span>
                <span className={styles.expandedLabel}>Скрыть подробности</span>
                <ChevronDown size={17} />
              </summary>
              <h3>Полный состав</h3>
              {p.features.map((feature) => (
                <p key={feature}>{feature}</p>
              ))}
              <h3>Условия</h3>
              <p>
                {p.id === 'start'
                  ? 'Базовая версия без оплаты и без фонового мониторинга. Доступно 20 обычных запросов в месяц. Торговые поручения подтверждает пользователь.'
                  : p.id === 'plus'
                    ? 'Обычные запросы и глубокие разборы считаются отдельно: 200 и 20 в месяц. Пакет включает одну личную стратегию и событийный мониторинг.'
                    : '600 обычных запросов и 60 глубоких разборов — два отдельных общих пула на команду до четырёх человек. Совет агентов списывает 3 глубоких разбора. Цена 1 990 ₽ в месяц указана за всю команду; пакет заменяет индивидуальный Плюс участников одного сквада.'}
              </p>
              <p>
                Исчерпание квоты чата не отключает контроль действующих заявок, доступ к истории и
                остановку агента. Реальный мониторинг в макете не запускается.
              </p>
              <p>
                Цены и лимиты предварительные. Комиссии брокера отдельно. Платный пакет не
                гарантирует прибыль.
              </p>
              <p>
                Без подписки сохраняются активы и ручное управление. После её окончания новые
                платные автономные действия и мониторинг прекращаются; открытые позиции не продаются
                автоматически.
              </p>
              <p>Демо-подключение не меняет торговые разрешения.</p>
            </details>
            <div style={{ marginTop: 16 }}>
              {p.selected ? (
                <div className={styles.status}>
                  {p.id === 'start' ? 'Бесплатный' : '✓ Подключён в демо'}
                </div>
              ) : (
                <Button full variant="primary" onClick={() => setSelected(p)}>
                  {p.id === 'start' ? 'Перейти на Старт' : 'Купить'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {overview.data && (
        <div className={s.notice} style={{ marginBottom: 16 }}>
          Аналитические задачи за {overview.data.usage.period}: {overview.data.usage.ordinary} /{' '}
          {q.data?.find((p) => p.selected)?.chatLimit}. Уточнение внутри текущей задачи не списывает
          новый запрос.
        </div>
      )}
      <Button full variant="secondary" onClick={() => setComparisonOpen(true)}>
        Сравнить тарифы
      </Button>
      <Card>
        <h2 style={{ fontSize: 17 }}>Что происходит при окончании подписки</h2>
        <p className={s.muted}>
          Активы, ручное управление, история и остановка агента остаются доступны. Новые платные
          автономные действия и мониторинг прекращаются. Открытые позиции не продаются
          автоматически.
        </p>
      </Card>
      <p className={s.muted} style={{ marginTop: 15, fontSize: 11 }}>
        Предварительные цены для пилота. Оплата не подключена. Комиссии брокера отдельно. Платная
        версия не гарантирует прибыль.
      </p>
      <Modal
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={`Оформление · ${selected?.name || 'пакет'}`}
      >
        <div className={styles.checkoutPrice}>{selected && fmt(selected.price)}</div>
        <div className={styles.checkoutPeriod}>
          {selected ? selected.unit.charAt(0).toUpperCase() + selected.unit.slice(1) : ''}
        </div>
        <div className={styles.checkoutSummary}>
          <b>{selected?.name}</b>
          <p>
            {selected?.id === 'squad'
              ? 'Весь пакет для одной команды до четырёх человек. Цена не умножается на число участников.'
              : 'Индивидуальный пакет на одного пользователя.'}
          </p>
          <p>
            {selected?.id === 'plus'
              ? '200 обычных запросов + 20 глубоких разборов отдельно; одна личная стратегия.'
              : 'Общий пул: 600 обычных запросов + 60 глубоких разборов отдельно; до четырёх личных стратегий. Совет расходует 3 глубоких разбора.'}
          </p>
          <p>Событийный мониторинг и платная ветка Battle Pass включены.</p>
          <p>Период: один месяц. Автоматического продления и списаний в демо нет.</p>
          {q.data?.some((p) => p.selected && p.id !== 'start' && p.id !== selected?.id) && (
            <p>Текущий демо-пакет будет заменён выбранным.</p>
          )}
        </div>
        <div className={`${s.notice} ${styles.checkoutNotice}`}>
          <strong>Демо: реальная оплата не подключена</strong>
          <br />
          Подтверждение сохранит только выбранный тариф на этом устройстве. Деньги, активы и
          разрешения агента не изменятся.
        </div>
        <Button
          full
          disabled={subscribe.isPending}
          onClick={() =>
            selected &&
            subscribe.mutate(
              { planId: selected.id },
              {
                onSuccess: () => {
                  setSelected(null);
                  notice.notify('Демо-пакет выбран');
                },
              },
            )
          }
        >
          {subscribe.isPending ? 'Сохраняем…' : 'Подключить в демо'}
        </Button>
        {subscribe.error && <QueryError error={subscribe.error} />}
      </Modal>
      <Modal open={comparisonOpen} onOpenChange={setComparisonOpen} title="Сравнение тарифов">
        <div className={styles.tariffTable} role="table" aria-label="Сравнение тарифов">
          <div role="row">
            <span></span>
            <b>Старт</b>
            <b>Плюс</b>
            <b>Сквад</b>
          </div>
          {[
            ['Цена / мес.', '0 ₽', '599 ₽', '1 990 ₽¹'],
            ['Обычные запросы', '20', '200', '600¹'],
            ['Глубокие разборы', '—', '20', '60¹'],
            ['Личные стратегии', '—', '1', 'До 4'],
            ['Мониторинг', '—', 'События', 'События'],
            ['Совет агентов', '—', '—', '3 разбора'],
            ['Автономный режим', '—', '✓', '✓'],
            ['Платные награды', '—', '✓', '✓'],
          ].map((row) => (
            <div role="row" key={row[0]}>
              {row.map((v, i) =>
                i === 0 ? (
                  <span role="cell" key={i}>
                    {v}
                  </span>
                ) : (
                  <b role="cell" key={i}>
                    {v}
                  </b>
                ),
              )}
            </div>
          ))}
        </div>
        <p className={styles.comparisonNote}>
          ¹ За команду до четырёх участников. Обычные запросы и глубокие разборы — отдельные квоты.
          Совет использует 3 глубоких разбора команды.
        </p>
        <p className={styles.comparisonNote}>
          Квота чата не отключает контроль заявок, историю и остановку агента. Цены предварительные,
          реальная оплата не подключена.
        </p>
      </Modal>
      {notice.element}
    </div>
  );
}
