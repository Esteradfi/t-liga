import { test, expect } from '@playwright/test';

test('заработанный титул доступен, будущий закрыт; приватность сохраняется и скрывает чужие активы', async ({
  page,
}) => {
  await page.goto('/season?reset=1');
  await expect(page.getByRole('heading', { name: 'Путь сезона', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page
    .locator('article')
    .filter({ has: page.getByText('Исследователь', { exact: true }) })
    .getByRole('button', { name: 'Посмотреть', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toContainText('Выбрать титул');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Забрать награду', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page
    .locator('article')
    .filter({ has: page.getByText('Первый заход', { exact: true }) })
    .getByRole('button', { name: 'В коллекции', exact: true })
    .click();
  await page.getByRole('button', { name: 'Выбрать титул', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/profile');
  await expect(page.getByText('Титул: Первый заход', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Редактировать профиль', exact: true }).click();
  await expect(page.getByLabel('Титул в профиле').locator('option')).toHaveText([
    'Без титула',
    'Первый заход',
  ]);
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Видимость', exact: true }).click();
  await page.getByRole('radio', { name: /^Только результаты/ }).check();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Видимость', exact: true }).click();
  await expect(page.getByRole('radio', { name: /^Только результаты/ })).toBeChecked();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.goto('/profiles/u2');
  await expect(page.getByRole('heading', { name: 'Портфель скрыт', exact: true })).toBeVisible();
});
