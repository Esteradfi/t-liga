import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeaderboard } from '../../../entities/profile';
import { useOverview } from '../../../entities/portfolio';
import { Button, PageHeading, Tabs, Loading, QueryError, Modal, pct, s } from '../../../shared/ui';
import { RankBadge } from '../../../widgets/investment-ui';
import css from './arena.module.css';
export const quotas = [
  ['Хищник рынка', 1, 750],
  ['Титан Уолл-стрит', 751, 1500],
  ['Алмазный Кит', 1501, 3000],
  ['Платиновая Акула', 3001, 5000],
  ['Золотой Бык', 5001, 8000],
  ['Серебряный Волк', 8001, 12000],
  ['Бронзовый Лис', 12001, 16000],
  ['Медный Хомяк', 16001, Infinity],
] as const;
export function ArenaPage() {
  const [scope, setScope] = useState<'all' | 'friends' | 'squads'>('all'),
    [rules, setRules] = useState(false),
    [fullRules, setFullRules] = useState(false);
  const query = useLeaderboard(scope),
    overview = useOverview();
  const own = overview.data?.user;
  const rows = (query.data?.filter((e) => !e.isCurrent) || []).slice(
    0,
    scope === 'all' ? 6 : undefined,
  );
  return (
    <div className={css.page}>
      <PageHeading
        title="Арена"
        action={
          <Button variant="ghost" small onClick={() => setRules(true)}>
            Ранги и места
          </Button>
        }
      />
      <div className={css.layout}>
        <div className={css.board}>
          <Tabs
            items={[
              { value: 'all', label: 'Все игроки' },
              { value: 'friends', label: 'Друзья' },
              { value: 'squads', label: 'Сквады' },
            ]}
            value={scope}
            onChange={setScope}
          />
          <div className={css.caption}>
            <span>{scope === 'squads' ? 'Командный зачёт' : 'Личный зачёт'}</span>
            <span>Виртуальный сезон</span>
          </div>
          <div className={css.tablehead}>
            <span>Место</span>
            <span>Игрок / ранг</span>
            <span>За сезон</span>
            <span>Просадка</span>
          </div>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <QueryError error={query.error} retry={() => query.refetch()} />
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                to={scope === 'squads' ? '/squads' : `/players/${row.userId}`}
                state={{ from: '/arena' }}
                className={css.row}
              >
                <span className={css.place}>{row.place.toLocaleString('ru-RU')}</span>
                <span className={css.name}>
                  <b>{row.name}</b>
                  <small>{row.rank}</small>
                </span>
                <b className={s.green}>{pct(row.returnPercent)}</b>
                <span className={css.drawdown}>{pct(row.drawdownPercent)}</span>
              </Link>
            ))
          )}
        </div>
        <section className={css.season}>
          <small>Сезон 01 · Ещё {overview.data?.season.daysLeft || 19} дней</small>
          <h2>
            Следующий ранг —<br />
            Золотой Бык
          </h2>
          <p>Нужно войти в топ-8 000</p>
          <RankBadge name="Золотой Бык" size={52} />
        </section>
      </div>
      <p className={css.note}>
        Лидеры сезона. Доходность после расходов; просадка — максимальное снижение капитала.
      </p>
      {own && scope !== 'squads' && (
        <Link to="/profile" className={css.own}>
          <span className={css.place}>{own.place.toLocaleString('ru-RU')}</span>
          <span className={css.name}>
            <b>{own.name} · ты</b>
            <small>{own.rank}</small>
          </span>
          <b className={s.green}>{pct(own.returnPercent)}</b>
          <span className={css.drawdown}>{pct(own.drawdownPercent)}</span>
        </Link>
      )}
      <Modal
        open={rules || fullRules}
        onOpenChange={(v) => {
          if (!v) {
            setRules(false);
            setFullRules(false);
          }
        }}
        title="Ранги и места"
      >
        {fullRules && (
          <p className={css.fullRules}>
            Место в общей таблице определяет ранг. Число мест в каждом ранге фиксируется перед
            сезоном.
          </p>
        )}
        <div>
          {quotas.map(([name, start, end]) => (
            <div key={name} className={`${css.rankSlot} ${name === own?.rank ? css.mySlot : ''}`}>
              <RankBadge name={name} size={32} />
              <div>
                <b>{name}</b>
                <small>
                  {end === Infinity
                    ? `С ${start.toLocaleString('ru-RU')}-го места`
                    : `${start.toLocaleString('ru-RU')}–${end.toLocaleString('ru-RU')} места`}
                </small>
              </div>
              <span>
                {end === Infinity
                  ? fullRules
                    ? 'Все остальные'
                    : 'Остальные'
                  : `${(end - start + 1).toLocaleString('ru-RU')} мест`}
              </span>
            </div>
          ))}
        </div>
        {fullRules ? (
          <div className={css.fullRules}>
            <p>
              Твоё место: #{own?.place.toLocaleString('ru-RU')} — {own?.rank}. Для Золотого Быка
              нужно войти в топ-8 000. Если соперник обходит тебя на границе ранга, звание меняется.
            </p>
            <p>
              Это предложенные квоты для масштабного сезона, а не число зарегистрированных игроков.
              Пустые места не заполняются ботами. Для небольшого пилота квоты уменьшаются до старта.
            </p>
            <p>
              При равной доходности: меньшая просадка, затем меньшие расходы, затем более раннее
              вступление. Итог сезона фиксирует награду; новый сезон сбрасывает зачёт.
            </p>
          </div>
        ) : (
          <>
            <div className={css.currentSummary}>
              <b>Твоё место #{own?.place.toLocaleString('ru-RU')}</b>
              <small>До Золотого Быка — топ-8 000</small>
            </div>
            <p className={css.rankFootnote}>Ранг зависит от места в сезонном рейтинге.</p>
            <button
              className={css.rulesButton}
              onClick={() => {
                setRules(false);
                setFullRules(true);
              }}
            >
              Правила сезона →
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
