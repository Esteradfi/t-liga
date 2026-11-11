import { test, expect } from '@playwright/test';

test('взнос сквада ждёт решения команды; полный выход требует подтверждения и не меняет личные деньги', async ({
  page,
}) => {
  await page.goto('/squads?reset=1');
  await expect(page.getByRole('heading', { name: 'Держим позицию', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  const state = () =>
    page.evaluate(async () => ({
      overview: await (await fetch('/api/overview')).json(),
      squad: await (await fetch('/api/squad?id=alpha')).json(),
    }));
  const before = await state();
  await page.getByRole('button', { name: 'Управление сквадом', exact: true }).click();
  await page.getByRole('button', { name: /^Дополнительный взнос/ }).click();
  await page.getByLabel('Сумма, ₽').fill('10000');
  await page.getByRole('button', { name: 'Отправить на согласование', exact: true }).click();
  await expect(page.getByText('На согласовании', { exact: true })).toBeVisible();
  expect((await state()).squad.value).toBe(before.squad.value);
  await page.getByRole('button', { name: 'Смоделировать одобрение команды', exact: true }).click();
  await expect.poll(async () => (await state()).squad.value).toBe('241000.00');
  expect((await state()).overview.portfolio.cash).toBe(before.overview.portfolio.cash);
  await page.getByRole('button', { name: 'Управление сквадом', exact: true }).click();
  await page.getByRole('button', { name: /^Выйти целиком/ }).click();
  await expect(
    page.getByRole('button', { name: 'Подтвердить полный выход', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Подтверждаю полный выход. Частичный вывод недоступен.').check();
  await page.getByRole('button', { name: 'Подтвердить полный выход', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Собери свой сквад', exact: true })).toBeVisible();
  const after = await state();
  expect(after.overview.portfolio.cash).toBe(before.overview.portfolio.cash);
  expect(after.squad.members.some((m: { userId: string }) => m.userId === 'me')).toBe(false);
  await page.getByRole('button', { name: 'Архив и прошлые сквады', exact: true }).click();
  await expect(page.locator('main')).toContainText('Твоё участие завершено');
});
