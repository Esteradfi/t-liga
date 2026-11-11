import { test, expect, type Page } from '@playwright/test';

async function serverState(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/overview');
    return response.json() as Promise<{
      portfolio: { cash: string; value: string };
      config: {
        budget: string;
        goal: string;
        mode: string;
        paused: boolean;
        onboardingComplete: boolean;
        leverage: boolean;
        maxPositionPercent: string;
        costLimit: string;
      };
    }>;
  });
}

test('ручная сделка: просмотр и закрытие не списывают, подтверждение обновляет кошелёк один раз', async ({
  page,
}) => {
  await page.goto('/market/TMON?reset=1');
  await expect(page.getByRole('heading', { name: 'Денежный рынок', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  const before = await serverState(page);
  await page.getByRole('button', { name: 'Купить', exact: true }).click();
  await page.getByLabel('Количество лотов').fill('1');
  await page.getByRole('button', { name: 'Проверить заявку', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('1 лот. · 1000 паёв');
  expect((await serverState(page)).portfolio.cash).toBe(before.portfolio.cash);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  expect((await serverState(page)).portfolio.cash).toBe(before.portfolio.cash);
  await expect(page.getByRole('heading', { name: 'Покупка', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Проверить заявку', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить покупку', exact: true }).dblclick();
  await expect(page.getByRole('heading', { name: 'Денежный рынок', exact: true })).toBeVisible();
  expect((await serverState(page)).portfolio.cash).toBe('16765.71');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Денежный рынок', exact: true })).toBeVisible();
  expect((await serverState(page)).portfolio.cash).toBe('16765.71');
});

test('первый разговор с агентом применяет настройки только явной кнопкой', async ({ page }) => {
  await page.goto('/agent?reset=1');
  await expect(page.getByRole('heading', { name: 'Выбери напарника' })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page.getByRole('button', { name: /Лев.*Качество/ }).click();
  await page.getByRole('button', { name: 'Начать общение', exact: true }).click();
  await expect(page.getByText(/Чего хочешь добиться с этим портфелем/)).toBeVisible();
  const afterChoose = await serverState(page);
  expect(afterChoose.config.paused).toBe(true);
  await page.getByRole('button', { name: 'Накопить на цель', exact: true }).click();
  await page.getByRole('button', { name: 'Больше 3 лет', exact: true }).click();
  await page.getByRole('button', { name: 'Меньше колебаний', exact: true }).click();
  await expect(page.getByText(/Какой бюджет выделишь агенту/)).toBeVisible();
  await page.getByRole('button', { name: /50\s000/ }).click();
  await page.getByRole('button', { name: 'С подтверждением', exact: true }).click();
  await page.getByRole('button', { name: 'Настроить ограничения', exact: true }).click();
  await page.getByRole('button', { name: 'Нет', exact: true }).click();
  await page.getByRole('button', { name: 'Нет', exact: true }).click();
  await page.getByRole('button', { name: 'Нет', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '500', exact: true }).click();
  await page.getByRole('button', { name: 'Дружеское', exact: true }).click();
  await page.getByRole('button', { name: 'Отложить', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Настройка не завершена.*Продолжить/ }).click();
  expect((await serverState(page)).config.budget).toBe(afterChoose.config.budget);
  await page.getByLabel('Сообщение агенту').fill('Не применяй, я не согласен');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  expect((await serverState(page)).config.onboardingComplete).toBe(false);
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect.poll(async () => (await serverState(page)).config.onboardingComplete).toBe(true);
  expect((await serverState(page)).config.budget).toBe('50000');
  expect((await serverState(page)).config.leverage).toBe(false);
  expect((await serverState(page)).config.maxPositionPercent).toBe('10');
  expect((await serverState(page)).config.costLimit).toBe('500');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Лев', exact: true })).toBeVisible();
  await page.getByText('Текущие правила', { exact: false }).click();
  await expect(page.getByText(/50\s000 ₽/).first()).toBeVisible();
});
