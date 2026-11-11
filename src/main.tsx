import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers/AppProviders';
import { router } from './app/router';
async function bootstrap() {
  const { worker } = await import('./mocks/browser');
  if (new URLSearchParams(location.search).has('reset')) {
    const { resetMockDb } = await import('./mocks/db');
    resetMockDb();
  }
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </React.StrictMode>,
  );
}
bootstrap().catch((error) => {
  console.error(error);
  const root = document.getElementById('root')!;
  root.textContent = 'Не удалось запустить демо. Открой приложение через npm run dev на localhost.';
});
