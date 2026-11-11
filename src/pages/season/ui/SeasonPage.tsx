import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../../../entities/session/model/store';
import { useOverview } from '../../../entities/portfolio';
import { useState } from 'react';

import { useRewards, useClaimReward, useApplyReward } from '../../../entities/season';
import { useUpdateProfile } from '../../../entities/profile';
import {
  PageHeading,
  Card,
  Button,
  ButtonLink,
  Loading,
  QueryError,
  Chip,
  Modal,
  s,
  useNotice,
} from '../../../shared/ui';
import type { Reward } from '../../../shared/api/contracts';
import { RewardArt } from '../../../widgets/investment-ui';
import css from './season.module.css';
export function SeasonPage() {
  const navigate = useNavigate(),
    overview = useOverview(),
    query = useRewards(),
    claim = useClaimReward(),
    update = useUpdateProfile(),
    applyReward = useApplyReward(),
    setTheme = useSessionStore((v) => v.setTheme),
    [detail, setDetail] = useState<Reward | null>(null),
    { notify, element } = useNotice();
  if (query.isPending) return <Loading />;
  if (query.error) return <QueryError error={query.error} retry={() => query.refetch()} />;
  const season = query.data!;
  const artwork = (reward: Reward) => (
    <RewardArt
      kind={reward.kind}
      index={reward.premium ? reward.level + 2 : reward.level - 1}
      agentIndex={['max', 'lev', 'chill'].indexOf(overview.data?.config.agentId || 'max')}
    />
  );
  const cardArtClass = (reward: Reward) =>
    `${css.art} ${reward.premium ? ((reward.level - 1) % 2 ? css.premiumDark : css.premiumArt) : ['', css.artBlue, css.artGreen][(reward.level - 1) % 3]}`;
  async function getReward(reward: Reward) {
    try {
      await claim.mutateAsync({ rewardId: reward.id });
      setDetail((d) => (d?.id === reward.id ? { ...d, claimed: true } : d));
      notify('Награда получена. Можно выбрать её в профиле.');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  return (
    <div className={css.page}>
      <PageHeading title="Путь сезона" action={<Chip yellow>Сезон 01</Chip>} />
      <section className={css.summary}>
        <div className={s.row}>
          <div>
            <small>Сезон 01 · Ещё {season.daysLeft} дней</small>
            <h2>{season.name}</h2>
          </div>
          <strong>
            {String(season.level).padStart(2, '0')}
            <span>/ 10</span>
          </strong>
        </div>
        <div className={s.row} style={{ fontSize: 10, margin: '15px 0 8px' }}>
          <span>
            {season.xp} / {season.nextXp} XP
          </span>
          <span>До уровня 5 · {season.nextXp - season.xp} XP</span>
        </div>
        <div className={s.progress} style={{ background: '#484f59' }}>
          <span style={{ width: `${(season.xp / season.nextXp) * 100}%` }} />
        </div>
        <p>
          Далее <b>Титул «Исследователь»</b>
        </p>
      </section>
      <div className={s.row} style={{ margin: '21px 0 14px' }}>
        <h2 style={{ margin: 0 }}>Награды</h2>
        <span className={s.muted}>
          {season.rewards.filter((r) => r.claimed && !r.premium).length} из 10 получено
        </span>
      </div>
      <ButtonLink to="/plans" variant="secondary">
        <span>
          <b>Тарифы и возможности</b>
          <small>Что входит в Плюс и Сквад</small>
        </span>
        <span>→</span>
      </ButtonLink>
      <div className={css.track}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
          <section key={level}>
            <div className={css.level}>
              <b>УРОВЕНЬ {level}</b>
              <span>{level <= season.level ? 'Открыт' : `Нужно ${level} ур.`}</span>
            </div>
            <div className={css.pair}>
              {season.rewards
                .filter((r) => r.level === level)
                .map((r) => (
                  <article
                    key={r.id}
                    className={`${css.reward} ${r.premium ? css.premium : ''} ${r.claimed ? css.obtained : r.available ? css.available : css.locked}`}
                  >
                    {r.premium && <div className={css.ribbon}>ПРЕМИУМ</div>}
                    {r.premium ? (
                      <button
                        className={css.previewArt}
                        onClick={() => setDetail(r)}
                        aria-label={`Посмотреть награду ${r.name}`}
                      >
                        <div className={cardArtClass(r)}>{artwork(r)}</div>
                      </button>
                    ) : (
                      <div className={cardArtClass(r)}>{artwork(r)}</div>
                    )}
                    <b className={css.name}>{r.name}</b>
                    <span className={css.kind}>{r.kindLabel}</span>
                    <Button
                      full
                      small
                      variant={r.claimed || r.premium || !r.available ? 'secondary' : 'primary'}
                      onClick={() =>
                        !r.premium && r.available && !r.claimed ? getReward(r) : setDetail(r)
                      }
                    >
                      {r.claimed
                        ? 'В коллекции'
                        : r.available && !r.premium
                          ? 'Забрать'
                          : r.premium
                            ? 'Посмотреть награду'
                            : 'Посмотреть'}
                    </Button>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
      <div className={css.taskHead}>
        <h2>Задания недели</h2>
        <span>Без реальных сделок</span>
      </div>
      <Card className={css.tasks}>
        {[
          ['✓', 'Настрой напарника', 'Выбери цель и разрешения', 'Готово', '/agent'],
          ['⌬', 'Сравни стратегии', 'Запусти эксперимент в лаборатории', '+150 XP', '/compare'],
          ['⌕', 'Разберись в расходах', 'Открой журнал решений', '+150 XP', '/journal'],
        ].map(([icon, title, subtitle, xp, to]) => (
          <Link key={to} to={to} className={css.task}>
            <span className={css.taskIcon}>{icon}</span>
            <span>
              <b>{title}</b>
              <small>{subtitle}</small>
            </span>
            <span>{xp} →</span>
          </Link>
        ))}
      </Card>
      {claim.error && <QueryError error={claim.error} />}
      <p className={s.muted} style={{ fontSize: 10, marginTop: 20 }}>
        Награды сохраняются после сезона и не дают преимуществ в торговле. Уровни и XP в макете
        демонстрационные.
      </p>
      <Modal
        open={Boolean(detail)}
        onOpenChange={() => setDetail(null)}
        title={detail?.name || 'Награда'}
      >
        {detail && (
          <>
            {detail.premium ? (
              <>
                <span className={`${css.detailKind} ${css.kindYellow}`}>
                  Премиальная награда · Уровень {detail.level}
                </span>
                <div
                  className={`${css.detailArt} ${(detail.level - 1) % 2 ? css.premiumDark : css.premiumArt}`}
                  style={{ height: 155, marginTop: 15 }}
                >
                  {artwork(detail)}
                </div>
                <p>
                  <b>{detail.kindLabel}</b>
                </p>
                <p className={css.detailNote}>
                  Доступна с пакетом «Агент Плюс» или «Сквад» при достижении уровня {detail.level}.
                  Уже пройденные уровни открывают соответствующие награды при подключении.
                  Полученная косметика остаётся после сезона.
                </p>
                <Button
                  full
                  onClick={() => {
                    setDetail(null);
                    navigate('/plans');
                  }}
                >
                  Посмотреть пакеты
                </Button>
                <p className={css.detailNote} style={{ margin: '12px 0 0' }}>
                  Это макет: пакеты и награды не продаются, подключение оплаты отсутствует.
                </p>
              </>
            ) : (
              <>
                <div
                  className={`${css.detailArt} ${detail.kind === 'theme' ? css.premiumDark : ''}`}
                  style={{ height: 140 }}
                >
                  {artwork(detail)}
                </div>
                <span className={`${css.detailKind} ${detail.claimed ? '' : css.kindYellow}`}>
                  {detail.kindLabel} · Уровень {detail.level}
                </span>
                <p className={css.detailNote}>
                  {detail.claimed
                    ? 'Награда в твоей коллекции и останется после завершения сезона.'
                    : 'Пройди задания и достигни нужного уровня, чтобы открыть награду.'}
                </p>
                {detail.claimed && (
                  <Button
                    full
                    onClick={async () => {
                      try {
                        if (detail.kind === 'title') {
                          await update.mutateAsync({ title: detail.name });
                          setDetail(null);
                          navigate('/profile');
                          notify('Титул выбран');
                        } else if (detail.kind === 'theme') {
                          const applied = await applyReward.mutateAsync({ rewardId: detail.id });
                          if (applied.theme) setTheme(applied.theme);
                          setDetail(null);
                          notify('Тёмная тема включена');
                        } else {
                          setDetail(null);
                          navigate('/profile');
                          notify('Награда в коллекции. Внешний вид — демонстрационный');
                        }
                      } catch {
                        /* Mutation error is displayed below. */
                      }
                    }}
                  >
                    {detail.kind === 'theme'
                      ? 'Применить тему'
                      : detail.kind === 'title'
                        ? 'Выбрать титул'
                        : 'Посмотреть в профиле'}
                  </Button>
                )}
              </>
            )}
            {(update.error || claim.error || applyReward.error) && (
              <QueryError error={update.error || claim.error || applyReward.error} />
            )}
          </>
        )}
      </Modal>
      {element}
    </div>
  );
}
