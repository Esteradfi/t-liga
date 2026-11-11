import { test, expect } from '@playwright/test';

test('координатор исполняет общий план после согласий команды; личный портфель не меняется', async ({
  page,
}) => {
  await page.goto('/squads?reset=1');
  await expect(page.getByRole('heading', { name: 'Держим позицию', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  const state = () =>
    page.evaluate(async () => ({
      portfolio: (await (await fetch('/api/overview')).json()).portfolio,
      squad: await (await fetch('/api/squad?id=alpha')).json(),
    }));
  // Keep an older proposal: the chat must display the newest discussion, not the oldest card.
  await page.evaluate(async () => {
    await fetch('/api/saveSquadStrategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        squadId: 'alpha',
        goal: 'Предыдущая идея',
        strategy: 'Долгосрочный подход',
        mode: 'confirm',
      }),
    });
  });
  const before = await state();
  await page.getByRole('tab', { name: 'Чат', exact: true }).click();
  await page.getByLabel('Сообщение скваду').fill('@Макс, проверь общий портфель');
  await page.getByRole('button', { name: 'Отправить в сквад', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить за себя', exact: true }).click();
  await expect
    .poll(async () => (await state()).squad.decisions[0].approvals.includes('me'))
    .toBe(true);
  expect((await state()).squad.virtualOrders).toHaveLength(0);
  await page.getByRole('button', { name: 'Смоделировать ответы остальных', exact: true }).click();
  await page.getByRole('button', { name: 'Да, смоделировать', exact: true }).click();
  const latestTitle = (await state()).squad.decisions[0].title;
  await page.getByRole('dialog').getByRole('button').filter({ hasText: latestTitle }).click();
  await page.getByRole('button', { name: 'Исполнить демо-план', exact: true }).click();
  await expect.poll(async () => (await state()).squad.virtualOrders.length).toBe(1);
  expect((await state()).portfolio).toEqual(before.portfolio);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Держим позицию', exact: true })).toBeVisible();
  expect((await state()).squad.virtualOrders).toHaveLength(1);
  await expect(page.getByText('Исполнено · демо', { exact: true }).first()).toBeVisible();
});
