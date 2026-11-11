import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight } from 'lucide-react';
import { usePublicProfile, useUpdateProfile, useFollow } from '../../../entities/profile';
import { useOverview } from '../../../entities/portfolio';
import { useRewards } from '../../../entities/season';
import { useSendMessage } from '../../../entities/agent';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Back,
  Button,
  ButtonLink,
  Tabs,
  Modal,
  Loading,
  QueryError,
  Empty,
  TrendChart,
  fmt,
  pct,
  s,
  useNotice,
} from '../../../shared/ui';
import { RankBadge, AgentAvatar } from '../../../widgets/investment-ui';
import css from './profile.module.css';
const formSchema = z.object({
  name: z.string().trim().min(1, 'Добавь имя').max(24, 'До 24 символов'),
  title: z.string(),
  privacy: z.enum(['open', 'results', 'closed']),
});
type Form = z.infer<typeof formSchema>;
export function ProfilePage() {
  const params = useParams(),
    location = useLocation(),
    id = params.userId || params.id || 'me',
    owner = id === 'me',
    query = usePublicProfile(id),
    overview = useOverview(),
    season = useRewards(),
    update = useUpdateProfile(),
    follow = useFollow(),
    send = useSendMessage(),
    navigate = useNavigate();
  const [tab, setTab] = useState('portfolio'),
    [editing, setEditing] = useState(false),
    [compare, setCompare] = useState(false),
    [avatar, setAvatar] = useState(''),
    [award, setAward] = useState<string | null>(null),
    [agentInfo, setAgentInfo] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false),
    [privacyDraft, setPrivacyDraft] = useState<Form['privacy']>('open');
  const { notify, element } = useNotice();
  const form = useForm<Form>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', title: '', privacy: 'open' },
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <>
        <Back
          to={
            owner
              ? '/more'
              : ['/arena', '/watchlist', '/watch'].includes(location.state?.from)
                ? location.state.from
                : '/arena'
          }
          label={
            owner
              ? 'Ещё'
              : location.state?.from === '/watchlist' || location.state?.from === '/watch'
                ? 'Наблюдаю'
                : 'Арена'
          }
        />
        <QueryError error={query.error} retry={() => query.refetch()} />
      </>
    );
  const d = query.data!,
    u = d.user,
    me = overview.data?.user;
  function edit() {
    form.reset({ name: u.name, title: u.title, privacy: u.privacy });
    setAvatar(u.avatar);
    setEditing(true);
  }
  async function submit(values: Form) {
    try {
      await update.mutateAsync({ ...values, avatar });
      setEditing(false);
      notify('Профиль обновлён');
    } catch {
      /* Mutation error is shown in the form. */
    }
  }
  async function image(file?: File) {
    if (!file) return;
    if (
      file.size > 2 * 1024 * 1024 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      notify('Выбери PNG, JPEG или WebP до 2 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }
  const ownedTitles = (season.data?.rewards || d.awards).filter(
    (r) => r.kind === 'title' && r.claimed,
  );
  async function analyze() {
    await send.mutateAsync({
      text: `Сравни опубликованные результаты ${u.name} с моими. Доходность ${u.returnPercent}%, просадка ${u.drawdownPercent}%. ${d.holdings ? 'Опубликованные позиции: ' + d.holdings.map((h) => h.symbol).join(', ') : 'Позиции закрыты, не делай предположений о скрытых сделках.'}`,
    });
    navigate('/agent');
  }
  return (
    <div className={css.page}>
      <Back
        to={
          owner
            ? '/more'
            : ['/arena', '/watchlist', '/watch'].includes(location.state?.from)
              ? location.state.from
              : '/arena'
        }
        label={
          owner
            ? 'Ещё'
            : location.state?.from === '/watchlist' || location.state?.from === '/watch'
              ? 'Наблюдаю'
              : 'Арена'
        }
      />
      <section>
        <div className={css.cover}>
          <span>НОВАЯ ВЫСОТА</span>
        </div>
        <div className={css.identity}>
          <div className={css.avatar}>
            {u.avatar ? <img src={u.avatar} alt={u.name} /> : u.name.slice(0, 2)}
          </div>
          <div className={css.nameRank}>
            <div>
              <h1>{u.name}</h1>
              {u.title && <p>Титул: {u.title}</p>}
            </div>
            <div className={css.rank}>
              <RankBadge name={u.rank} size={44} />
              <span>
                <b>{u.rank}</b>
                <small>#{u.place.toLocaleString('ru-RU')}</small>
              </span>
            </div>
          </div>
          <div className={css.actions}>
            {owner ? (
              <>
                <Button onClick={edit}>Редактировать профиль</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPrivacyDraft(u.privacy);
                    setPrivacyOpen(true);
                  }}
                >
                  Видимость
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => follow.mutate({ userId: u.id })}>
                  {u.following ? 'Ты следишь' : 'Следить'}
                </Button>
                <Button variant="secondary" onClick={() => setCompare(true)}>
                  Сравнить со мной
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
      <div className={css.grid}>
        <Card className={css.result}>
          <h2>Результат сезона</h2>
          <div className={s.three}>
            <div>
              <span className={s.label}>Место</span>
              <b className={css.metric}>#{u.place.toLocaleString('ru-RU')}</b>
            </div>
            <div>
              <span className={s.label}>Доходность</span>
              <b className={`${css.metric} ${s.green}`}>{pct(u.returnPercent)}</b>
            </div>
            <div>
              <span className={s.label}>Макс. просадка</span>
              <b className={css.metric}>{pct(u.drawdownPercent)}</b>
            </div>
          </div>
          <div className={css.resultChart}>
            <TrendChart data={d.history} color="#829fbd" height={105} />
          </div>
          {!owner && (
            <Button full onClick={analyze}>
              Разобраться с агентом
            </Button>
          )}
        </Card>
        <Card>
          <h2>Витрина наград</h2>
          {d.awards.length ? (
            <div className={css.awards}>
              {d.awards.map((r) => (
                <button key={r.id} onClick={() => setAward(r.name)}>
                  <span>◇</span>
                  <b>{r.name}</b>
                </button>
              ))}
            </div>
          ) : (
            <p className={s.muted}>Полученные награды появятся здесь.</p>
          )}
        </Card>
        <Card>
          <div
            className={`${s.flex} ${!owner ? css.publicAgent : ''}`}
            role={!owner ? 'button' : undefined}
            tabIndex={!owner ? 0 : undefined}
            onClick={!owner ? () => setAgentInfo(true) : undefined}
            onKeyDown={
              !owner
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setAgentInfo(true);
                    }
                  }
                : undefined
            }
          >
            <AgentAvatar index={['max', 'lev', 'chill'].indexOf(d.agent.id)} size={48} />
            <div className={s.grow}>
              <b>{d.agent.name}</b>
              <p className={s.muted} style={{ margin: '5px 0 0' }}>
                {owner ? 'Твой агент' : 'Агент игрока'}
              </p>
            </div>
            {owner && (
              <ButtonLink to="/agent" variant="ghost">
                <ChevronRight size={18} />
              </ButtonLink>
            )}
          </div>
        </Card>
        <Card className={css.content}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'portfolio', label: 'Портфель' },
              { value: 'trades', label: 'Сделки' },
              { value: 'seasons', label: 'Сезоны' },
            ]}
          />
          <div style={{ marginTop: 20 }}>
            {tab === 'seasons' ? (
              <>
                <h3>Сезон 01 · Новая высота</h3>
                <p className={s.muted}>
                  Текущее место #{u.place.toLocaleString('ru-RU')} · {u.rank}
                </p>
                <p className={s.muted}>Здесь появятся итоги сезона.</p>
              </>
            ) : tab === 'portfolio' ? (
              d.holdings === null ? (
                <Empty
                  title="Портфель скрыт"
                  text="Владелец опубликовал только результаты. Агент тоже не получает скрытые позиции."
                />
              ) : (
                <>
                  <h3 style={{ fontSize: 16, lineHeight: 1.35, margin: '0 0 10px' }}>
                    {owner ? 'Твой портфель' : 'Опубликованные позиции'}
                  </h3>
                  {owner && overview.data && (
                    <div className={s.two} style={{ marginBottom: 20 }}>
                      <div>
                        <span className={s.label}>Общая стоимость</span>
                        <b>{fmt(overview.data.portfolio.value)}</b>
                      </div>
                      <div>
                        <span className={s.label}>В активах</span>
                        <b>{fmt(overview.data.portfolio.invested)}</b>
                      </div>
                      <div>
                        <span className={s.label}>Свободные средства</span>
                        <b>{fmt(overview.data.portfolio.cash)}</b>
                      </div>
                    </div>
                  )}
                  {d.holdings.map((p) => (
                    <div key={p.instrumentId} className={s.listrow}>
                      <div className={s.grow}>
                        <b>{p.name}</b>
                        <small>{p.symbol}</small>
                      </div>
                      <b>{owner ? fmt(p.value) : `${p.quantity} шт.`}</b>
                    </div>
                  ))}
                  {!owner && (
                    <Button
                      variant="secondary"
                      full
                      onClick={() => {
                        notify('Сравни подходы в лаборатории. Портфель не копируется.');
                        navigate('/compare');
                      }}
                    >
                      Примерить в лаборатории
                    </Button>
                  )}
                </>
              )
            ) : d.trades === null ? (
              <Empty title="История сделок скрыта" text="Владелец ограничил доступ к операциям." />
            ) : d.trades.length ? (
              d.trades.map((t) => (
                <div className={s.listrow} key={t.id}>
                  <div>
                    <b>{t.title}</b>
                    <small>
                      {t.status} · {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty title="Пока нет сделок" />
            )}
          </div>
        </Card>
      </div>
      <Modal open={editing} onOpenChange={setEditing} title="Редактировать профиль">
        <form onSubmit={form.handleSubmit(submit)} className={css.editForm}>
          <div className={css.editPhoto}>
            <div className={s.avatar} style={{ height: 70, width: 70 }}>
              {avatar ? <img src={avatar} alt="Выбранное фото" /> : u.name.slice(0, 2)}
            </div>
            <label>
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => image(e.target.files?.[0])}
              />
              <span>Изменить фото</span>
            </label>
            <small>PNG, JPEG, WebP · до 2 МБ</small>
          </div>
          <div className={s.field}>
            <label htmlFor="profile-name">Имя или ник</label>
            <input id="profile-name" maxLength={24} {...form.register('name')} />
            {form.formState.errors.name && (
              <small className={s.red}>{form.formState.errors.name.message}</small>
            )}
          </div>
          <div className={s.field}>
            <label htmlFor="profile-title">Титул в профиле</label>
            {ownedTitles.length ? (
              <>
                <select id="profile-title" {...form.register('title')}>
                  <option value="">Без титула</option>
                  {ownedTitles.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <small>Из полученных наград</small>
              </>
            ) : (
              <p className={css.editEmpty}>Пока нет полученных титулов</p>
            )}
          </div>
          {update.error && <QueryError error={update.error} />}
          <div className={css.editActions}>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={update.isPending}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={privacyOpen} onOpenChange={setPrivacyOpen} title="Приватность">
        <div className={css.privacyChoices}>
          {(
            [
              ['open', 'Открытый профиль', 'Результаты и разрешённые тобой данные портфеля.'],
              [
                'results',
                'Только результаты',
                'Профиль и показатели видны, позиции и сделки скрыты.',
              ],
              [
                'closed',
                'Закрытый профиль',
                'В рейтинге остаются ник, ранг и результат. Кабинет закрыт.',
              ],
            ] as const
          ).map(([value, label, note]) => (
            <label key={value}>
              <input
                type="radio"
                name="profile-privacy"
                value={value}
                checked={privacyDraft === value}
                onChange={() => setPrivacyDraft(value)}
              />
              <span>
                <b>{label}</b>
                <small>{note}</small>
              </span>
            </label>
          ))}
        </div>
        {update.error && <QueryError error={update.error} />}
        <div className={css.editActions} style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setPrivacyOpen(false)}>
            Отмена
          </Button>
          <Button
            disabled={update.isPending}
            onClick={async () => {
              await update.mutateAsync({ privacy: privacyDraft });
              setPrivacyOpen(false);
            }}
          >
            Сохранить
          </Button>
        </div>
      </Modal>
      <Modal open={compare} onOpenChange={setCompare} title="Сравнение с тобой">
        <div className={css.compareTable} role="table" aria-label="Сравнение результатов">
          <div className={`${css.compareRow} ${css.compareHeader}`} role="row">
            <span role="columnheader">Показатель</span>
            <span role="columnheader" title={u.name}>
              {u.name}
            </span>
            <span role="columnheader" title={me?.name}>
              Ты
            </span>
          </div>
          {[
            [
              'Место',
              '#' + u.place.toLocaleString('ru-RU'),
              '#' + (me?.place || 0).toLocaleString('ru-RU'),
            ],
            ['За сезон', pct(u.returnPercent), pct(me?.returnPercent || 0)],
            ['Просадка', pct(u.drawdownPercent), pct(me?.drawdownPercent || 0)],
          ].map((row, i) => (
            <div className={css.compareRow} role="row" key={row[0]}>
              <span role="cell">{row[0]}</span>
              <span role="cell" className={i === 1 ? s.green : undefined}>
                {row[1]}
              </span>
              <span role="cell" className={i === 1 ? s.green : undefined}>
                {row[2]}
              </span>
            </div>
          ))}
        </div>
        <p className={css.compareExplanation}>
          {u.privacy === 'results'
            ? 'Портфель закрыт: сравниваем только опубликованные показатели.'
            : 'Доходность выше не означает, что стратегия подходит тебе. Сравни также просадку и свою цель.'}
        </p>
        <Button
          onClick={async () => {
            setCompare(false);
            await analyze();
          }}
        >
          Обсудить с агентом
        </Button>
      </Modal>
      <Modal open={Boolean(award)} onOpenChange={() => setAward(null)} title={award || 'Награда'}>
        <p className={s.muted}>
          Косметическая награда сезона. Не меняет торговые разрешения или место в рейтинге.
        </p>
      </Modal>
      <Modal open={agentInfo} onOpenChange={setAgentInfo} title="Агент игрока">
        <p className={s.muted}>Личные разрешения скрыты.</p>
      </Modal>
      {element}
    </div>
  );
}
