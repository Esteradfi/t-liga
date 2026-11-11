import { createBrowserRouter, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AppShell } from '../widgets/app-shell';
import { DashboardPage, MorePage } from '../pages/dashboard';
import { Empty, ButtonLink } from '../shared/ui';
function NotFound() {
  return (
    <Empty
      title="Страница не найдена"
      text="Возможно, адрес изменился. Все разделы доступны через меню."
      action={<ButtonLink to="/">На главную</ButtonLink>}
    />
  );
}
function RouteError() {
  const e = useRouteError();
  return (
    <div style={{ padding: 35 }}>
      <Empty
        title="Не удалось открыть раздел"
        text={
          isRouteErrorResponse(e)
            ? `${e.status}: ${e.statusText}`
            : e instanceof Error
              ? e.message
              : 'Попробуй открыть главную страницу.'
        }
        action={<ButtonLink to="/">На главную</ButtonLink>}
      />
    </div>
  );
}
const market = async () => ({ Component: (await import('../pages/market')).MarketPage });
const instrument = async () => ({ Component: (await import('../pages/market')).InstrumentPage });
const agent = async () => ({ Component: (await import('../pages/agent')).AgentPage });
const profile = async () => ({ Component: (await import('../pages/profile')).ProfilePage });
const squad = async () => ({ Component: (await import('../pages/squads')).SquadsPage });
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/more', element: <MorePage /> },
      { path: '/market', lazy: market },
      { path: '/market/:instrumentId', lazy: instrument },
      { path: '/trade/:instrumentId', lazy: instrument },
      {
        path: '/arena',
        lazy: async () => ({ Component: (await import('../pages/arena')).ArenaPage }),
      },
      { path: '/profile', lazy: profile },
      { path: '/players/:userId', lazy: profile },
      { path: '/profiles/:userId', lazy: profile },
      { path: '/agent', lazy: agent },
      { path: '/agents', lazy: agent },
      { path: '/chat', lazy: agent },
      {
        path: '/settings',
        lazy: async () => ({ Component: (await import('../pages/settings')).SettingsPage }),
      },
      {
        path: '/season',
        lazy: async () => ({ Component: (await import('../pages/season')).SeasonPage }),
      },
      { path: '/squads', lazy: squad },
      { path: '/squads/:squadId', lazy: squad },
      { path: '/squads/:squadId/chat', lazy: squad },
      { path: '/squads/:squadId/decisions', lazy: squad },
      {
        path: '/journal',
        lazy: async () => ({ Component: (await import('../pages/journal')).JournalPage }),
      },
      {
        path: '/compare',
        lazy: async () => ({ Component: (await import('../pages/compare')).ComparePage }),
      },
      {
        path: '/watch',
        lazy: async () => ({ Component: (await import('../pages/watch')).WatchPage }),
      },
      {
        path: '/watchlist',
        lazy: async () => ({ Component: (await import('../pages/watch')).WatchPage }),
      },
      {
        path: '/plans',
        lazy: async () => ({ Component: (await import('../pages/plans')).PlansPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
