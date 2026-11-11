import { beforeEach, describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/shared/api/contracts';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { mutateResource, portfolio } from '@/mocks/service';

const send = (text: string) => mutateResource('sendMessage', { text }) as ChatMessage[];
const configure = () =>
  mutateResource('saveConfig', {
    onboardingComplete: true,
    budget: '200000',
    maxPositionPercent: '30',
  });

describe('агент торгует только в сохранённых разрешениях', () => {
  beforeEach(() => {
    resetMockDb();
    configure();
  });

  it('обсуждение изменения портфеля запрашивает уточнение без сделки', () => {
    const before = portfolio();
    const messages = send('Может поменять что-нибудь в портфеле?');
    expect(messages.at(-1)!.choices!.length).toBeGreaterThan(0);
    expect(messages.at(-1)!.plan).toBeUndefined();
    expect(portfolio()).toEqual(before);
  });

  it('в режиме подтверждения создаёт карточку и исполняет после отдельного согласия один раз', () => {
    const before = portfolio();
    const messages = send('Продай SBER 1 лот');
    const plan = messages.at(-1)!.plan!;
    expect(plan).toMatchObject({ source: 'agent', lots: 1, consumed: false });
    expect(portfolio()).toEqual(before);
    mutateResource('confirmTrade', { previewId: plan.previewId });
    const after = portfolio();
    expect(after.cash).toBe('20975.85');
    mutateResource('confirmTrade', { previewId: plan.previewId });
    expect(portfolio()).toEqual(after);
  });

  it('отменённый план нельзя впоследствии исполнить', () => {
    const plan = send('Продай SBER 1 лот').at(-1)!.plan!;
    const before = portfolio();
    mutateResource('rejectAgentPlan', { previewId: plan.previewId });
    expect(() => mutateResource('confirmTrade', { previewId: plan.previewId })).toThrow(
      'План отменён',
    );
    expect(portfolio()).toEqual(before);
  });

  it('пауза блокирует агента, но оставляет явную ручную заявку доступной', () => {
    mutateResource('saveConfig', { paused: true });
    const before = portfolio();
    expect(send('Продай SBER 1 лот').at(-1)!.plan).toBeUndefined();
    expect(portfolio()).toEqual(before);
    const preview = mutateResource('previewTrade', {
      instrumentId: 'SBER',
      lots: 1,
      side: 'sell',
      source: 'manual',
    }) as { id: string };
    mutateResource('confirmTrade', { previewId: preview.id });
    expect(portfolio().cash).toBe('20975.85');
  });

  it('не подменяет запрос с запрещённым плечом обычной покупкой', () => {
    const before = portfolio();
    expect(send('Купи GOLD 1 лот с плечом').at(-1)!.plan).toBeUndefined();
    expect(portfolio()).toEqual(before);
  });

  it('автономный режим исполняет явный запрос в пределах бюджета, но не обычный разговор', () => {
    mutateResource('saveConfig', { mode: 'autonomous' });
    const before = portfolio();
    send('Может изменить портфель?');
    expect(portfolio()).toEqual(before);
    const messages = send('Купи GOLD 1 лот');
    expect(messages.at(-1)!.plan!.consumed).toBe(true);
    expect(portfolio().cash).toBe('9935.28');
    const snapshot = portfolio();
    send('Купи GOLD 20 лотов');
    expect(portfolio()).toEqual(snapshot);
  });

  it('отрицательное сообщение не становится согласием на автономную сделку', () => {
    mutateResource('saveConfig', { mode: 'autonomous' });
    const before = portfolio();
    const messages = send('Не надо покупать. Не купи GOLD 1 лот');
    expect(messages.at(-1)!.plan).toBeUndefined();
    expect(portfolio()).toEqual(before);
  });

  it('смена правил после подготовки требует новой проверки', () => {
    const plan = send('Продай SBER 1 лот').at(-1)!.plan!;
    mutateResource('saveConfig', { paused: true });
    expect(() => mutateResource('confirmTrade', { previewId: plan.previewId })).toThrow(
      'План устарел',
    );
    expect(getMockDb().cash).toBe('18200.00');
  });
});
