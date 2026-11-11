import css from './compare.module.css';
import { personas } from '../../../widgets/investment-ui';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAgents, useSendMessage } from '../../../entities/agent';
import {
  useCompare,
  useSaveIdea,
  useObservation,
  useSetObservationPaused,
} from '../../../entities/comparison';
import {
  Card,
  Button,
  PageHeading,
  Loading,
  QueryError,
  Chip,
  s,
  fmt,
  useNotice,
} from '../../../shared/ui';
const schema = z
  .object({
    agentA: z.string(),
    agentB: z.string(),
    task: z.string().min(5, 'Добавь задачу от 5 символов'),
    budget: z
      .string()
      .refine(
        (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 1000,
        'Бюджет от 1 000 ₽',
      ),
  })
  .refine((v) => v.agentA !== v.agentB, {
    message: 'Выбери двух разных агентов',
    path: ['agentB'],
  });
type Form = z.infer<typeof schema>;
export function ComparePage() {
  const agents = useAgents(),
    compare = useCompare(),
    save = useSaveIdea(),
    observation = useObservation(),
    setPaused = useSetObservationPaused(),
    send = useSendMessage(),
    navigate = useNavigate(),
    notice = useNotice();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      agentA: 'max',
      agentB: 'chill',
      task: 'Собрать портфель на несколько лет',
      budget: '100000',
    },
  });
  const result = compare.data || observation.data?.comparison,
    saved = Boolean(result && observation.data?.comparison.id === result.id);
  async function discuss() {
    if (!result) return;
    const text = `Обсуди со мной сохранённое сравнение. Задача: ${result.task}. Бюджет: ${fmt(result.budget)}. ${result.results.map((r) => `${r.agent.name}: ${r.reasoning}. План: ${r.actions.join('; ')}`).join('\n')}`;
    try {
      await send.mutateAsync({ text });
      navigate('/agent');
    } catch {
      /* The send error is displayed with the comparison. */
    }
  }
  if (agents.isPending) return <Loading />;
  if (agents.error) return <QueryError error={agents.error} />;
  return (
    <div className={css.page}>
      <PageHeading
        title="Сравнить агентов"
        description="Одинаковая задача — разные подходы. Изменения своего портфеля обсуждай в чате."
      />
      <div className={s.grid}>
        <Card className={css.formCard}>
          <h2 style={{ fontSize: 17, lineHeight: 1.28, margin: 0 }}>Как бы они поступили?</h2>
          <p className={s.muted} style={{ fontSize: 12, lineHeight: 1.5, margin: '12px 0' }}>
            Два агента получают одинаковую задачу. Сравниваем логику решений, а не обещанную
            прибыль.
          </p>
          <form
            className={s.form}
            onSubmit={handleSubmit((v) => {
              compare.mutate(v);
            })}
          >
            <div className={s.field}>
              <label htmlFor="compare-task">Твоя задача</label>
              <select id="compare-task" {...register('task')}>
                {[
                  'Собрать портфель на несколько лет',
                  'Рынок резко упал — что делать?',
                  'Одна акция занимает половину портфеля',
                  'Рассмотреть покупку выбранного актива',
                ].map((task) => (
                  <option key={task}>{task}</option>
                ))}
              </select>
              {errors.task && <small role="alert">{errors.task.message}</small>}
            </div>
            <div className={s.two}>
              {(['agentA', 'agentB'] as const).map((name, i) => (
                <div key={name} className={s.field}>
                  <label htmlFor={name}>{i ? 'Второй' : 'Первый'} агент</label>
                  <select id={name} {...register(name)}>
                    {agents.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors[name] && <small role="alert">{errors[name]?.message}</small>}
                </div>
              ))}
            </div>
            <div className={s.field}>
              <label htmlFor="compare-budget">Одинаковый бюджет, ₽</label>
              <input id="compare-budget" inputMode="decimal" {...register('budget')} />
              {errors.budget && <small role="alert">{errors.budget.message}</small>}
            </div>
            <Button full disabled={compare.isPending}>
              {compare.isPending ? 'Сравниваем…' : 'Сравнить решения →'}
            </Button>
            {compare.error && <QueryError error={compare.error} />}
          </form>
        </Card>
        <div>
          {result && !saved ? (
            <div className={s.stack}>
              <Card>
                <Chip>Одинаковая задача · {fmt(result.budget)}</Chip>
                <h2 style={{ marginTop: 12 }}>{result.task}</h2>
                {result.results.map((r) => (
                  <div key={r.agent.id} className={css.resultBubble}>
                    <b>{r.agent.name}</b>
                    <p>{r.reasoning}</p>
                    <span className={s.muted}>
                      {personas[['max', 'lev', 'chill'].indexOf(r.agent.id)]?.style}
                    </span>
                  </div>
                ))}
                <p className={css.explanation}>
                  Это примеры поведения персонажей, а не рассчитанные торговые рекомендации.
                  Реальное решение потребует свежих данных, твоих целей и разрешений.
                </p>
                <Button
                  full
                  disabled={save.isPending || saved}
                  onClick={() =>
                    save.mutate(
                      {
                        text: `${result!.results.map((r) => r.agent.name).join(' и ')}: ${result!.task}`,
                        comparisonId: result!.id,
                      },
                      {
                        onSuccess: () => {
                          notice.notify('Идея сохранена в контексте агента');
                        },
                      },
                    )
                  }
                >
                  {saved ? 'Наблюдение сохранено' : 'Сохранить идею для агента'}
                </Button>
                <Button
                  full
                  variant="secondary"
                  style={{ marginTop: 9 }}
                  disabled={send.isPending}
                  onClick={discuss}
                >
                  Обсудить с моим агентом
                </Button>
                {(save.error || setPaused.error || send.error) && (
                  <QueryError error={save.error || setPaused.error || send.error} />
                )}
              </Card>
              <p className={s.muted}>
                Это сценарное сравнение поведения, не тест будущей доходности.
              </p>
            </div>
          ) : observation.data ? (
            <div>
              <section className={css.observation}>
                <h3>Сохранённая идея</h3>
                <p>
                  {observation.data.comparison.results.map((r) => r.agent.name).join(' и ')}:{' '}
                  {observation.data.comparison.task}
                  <br />
                  Агент видит эту запись. Фоновый мониторинг в HTML не подключён.
                </p>
                <button onClick={discuss} disabled={send.isPending}>
                  Обсудить в чате →
                </button>
              </section>
              <details className={css.observationControls}>
                <summary>
                  {observation.data.paused ? 'Наблюдение на паузе' : 'Наблюдение активно'}
                </summary>
                <Button
                  variant="ghost"
                  small
                  disabled={setPaused.isPending}
                  onClick={() => setPaused.mutate({ paused: !observation.data?.paused })}
                >
                  {observation.data.paused ? 'Продолжить наблюдение' : 'Приостановить наблюдение'}
                </Button>
              </details>
              {(setPaused.error || send.error) && (
                <QueryError error={setPaused.error || send.error} />
              )}
            </div>
          ) : observation.isPending ? (
            <Loading />
          ) : observation.error ? (
            <QueryError error={observation.error} />
          ) : (
            <div className={css.empty}>
              <h3>Идеи остаются в контексте агента</h3>
              <p>Проверяй варианты, сохраняй интересное и продолжай обсуждение в чате.</p>
            </div>
          )}
        </div>
      </div>
      {notice.element}
    </div>
  );
}
