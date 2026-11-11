import { test, expect } from '@playwright/test';

test('черновики настроек отменяются; сохранённый бюджет и разрешения переживают перезагрузку', async ({
  page,
}) => {
  await page.goto('/settings?reset=1');
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  const config = () => page.evaluate(async () => (await fetch('/api/config')).json());
  const before = await config();
  await page.getByRole('button', { name: /^Цель/ }).click();
  await page.getByLabel('Что важно для твоего портфеля?').fill('Черновик, который отменяем');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  expect((await config()).goal).toBe(before.goal);
  await page.getByRole('button', { name: /^Бюджет/ }).click();
  await page.getByLabel('Выделенная сумма, ₽').fill('45000');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await config()).budget).toBe('45000');
  await page.getByRole('button', { name: /^Инструменты и лимиты/ }).click();
  await page.getByRole('switch', { name: 'Плечо', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Предел плеча/ })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  expect((await config()).leverage).toBe(false);
  await page.reload();
  await expect(page.getByRole('button', { name: /Бюджет.*45\s000/ })).toBeVisible();
  await page.getByRole('button', { name: /^Инструменты и лимиты/ }).click();
  await expect(page.getByRole('switch', { name: 'Плечо', exact: true })).not.toBeChecked();
});
