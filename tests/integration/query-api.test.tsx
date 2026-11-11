import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from '@/mocks/handlers';
import { resetMockDb } from '@/mocks/db';
import { api } from '@/shared/api/client';
import {
  useConfig,
  useOverview,
  useSaveConfig,
  useConfirmTrade,
  usePreviewTrade,
} from '@/shared/api/hooks';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => resetMockDb());

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('HTTP API и серверное состояние TanStack Query', () => {
  it('сохраняет конфигурацию через MSW и обновляет связанные Query без локальной копии', async () => {
    const { result } = renderHook(
      () => ({ config: useConfig(), overview: useOverview(), save: useSaveConfig() }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.config.isSuccess).toBe(true));
    expect(result.current.config.data!.leverage).toBe(false);
    await act(() =>
      result.current.save.mutateAsync({ budget: '45000.00', goal: 'Накопить на квартиру' }),
    );
    await waitFor(() => expect(result.current.config.data!.budget).toBe('45000.00'));
    await waitFor(() =>
      expect(result.current.overview.data!.config.goal).toBe('Накопить на квартиру'),
    );
    expect((await api.config()).budget).toBe('45000.00');
  });

  it('показывает свежий денежный остаток после явного подтверждения котировки', async () => {
    const { result } = renderHook(
      () => ({ overview: useOverview(), preview: usePreviewTrade(), confirm: useConfirmTrade() }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));
    const quote = await act(() =>
      result.current.preview.mutateAsync({ instrumentId: 'TMON', lots: 1, side: 'buy' }),
    );
    expect(result.current.overview.data!.portfolio.cash).toBe('18200.00');
    await act(() => result.current.confirm.mutateAsync({ previewId: quote.previewId }));
    await waitFor(() => expect(result.current.overview.data!.portfolio.cash).toBe('16765.71'));
  });

  it('передает структурированную ошибку прав и редактирует приватные данные до UI', async () => {
    await expect(api.updateProfile({ title: 'Исследователь' })).rejects.toMatchObject({
      code: 'NOT_EARNED',
      status: 400,
    });
    expect(await api.publicProfile('u2')).toMatchObject({ holdings: null, trades: null });
    await expect(api.publicProfile('u4')).rejects.toMatchObject({
      code: 'PROFILE_CLOSED',
      status: 403,
    });
  });
});
