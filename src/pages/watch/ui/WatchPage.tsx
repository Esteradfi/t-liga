import css from './source-typography.module.css';
import { useWatch, useFollow, useLeaderboard, usePublicProfile } from '../../../entities/profile';
import { Card, Button, ButtonLink, PageHeading, QueryError, s, pct } from '../../../shared/ui';
import { Link } from 'react-router-dom';
function AgentName({ id }: { id: string }) {
  const profile = usePublicProfile(id);
  return <>{profile.data?.agent.name || '…'}</>;
}
export function WatchPage() {
  const q = useWatch(),
    follow = useFollow(),
    leaders = useLeaderboard('all');
  return (
    <div className={css.page}>
      <PageHeading title="Наблюдаю" description="Следи за подходами, а не только за цифрами." />
      <div className={s.stack}>
        {leaders.data
          ?.filter((u) => !u.isCurrent)
          .slice(0, 3)
          .map((u) => (
            <Card key={u.userId} className={css.followCard}>
              <div className={s.flex}>
                <span className={s.avatar} style={{ height: 42, width: 42, fontSize: 14 }}>
                  {u.name.slice(0, 2)}
                </span>
                <Link
                  state={{ from: '/watchlist' }}
                  to={`/players/${u.userId}`}
                  className={s.grow}
                  style={{ textDecoration: 'none' }}
                >
                  <h3>{u.name}</h3>
                  <small style={{ display: 'block', fontSize: 10, color: 'var(--muted)' }}>
                    <AgentName id={u.userId} /> · #{u.place}
                  </small>
                </Link>
              </div>
              <div className={`${css.returnValue} ${s.green}`}>{pct(u.returnPercent)}</div>
              <p className={s.muted} style={{ fontSize: 12, lineHeight: 1.5, margin: '12px 0' }}>
                Новый разбор: что повлияло на результат и какие риски сохранились.
              </p>
              <div className={s.actions} style={{ marginTop: 0 }}>
                <Button
                  small
                  variant={q.data?.some((p) => p.id === u.userId) ? 'secondary' : 'primary'}
                  onClick={() => follow.mutate({ userId: u.userId })}
                >
                  {q.data?.some((p) => p.id === u.userId) ? 'Вы подписаны' : 'Следить'}
                </Button>
                <ButtonLink
                  small
                  variant="ghost"
                  to={`/players/${u.userId}`}
                  state={{ from: '/watchlist' }}
                >
                  Профиль →
                </ButtonLink>
              </div>
            </Card>
          ))}
      </div>
      <Card className={css.feed}>
        <h2>Лента разборов</h2>
        <div className={css.feedBubble}>
          <b>
            {leaders.data?.find((u) => !u.isCurrent)?.name || 'Никита'} ·{' '}
            {leaders.data?.find((u) => !u.isCurrent) && (
              <AgentName id={leaders.data.find((u) => !u.isCurrent)!.userId} />
            )}
          </b>
          <p className={s.muted}>
            Сохранили часть средств свободными. Новая идея пока не прошла проверку по концентрации.
          </p>
          <span className={s.muted}>Публикация демонстрационного профиля · сегодня</span>
        </div>
        <ButtonLink to="/compare" variant="ghost" small>
          Проверить свою гипотезу →
        </ButtonLink>
      </Card>
      {follow.error && <QueryError error={follow.error} />}
    </div>
  );
}
