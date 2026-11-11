import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TradePreview } from '@/shared/api/contracts';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { mutateResource, portfolio } from '@/mocks/service';

const preview = (instrumentId = 'SBER', lots = 1, side = 'buy') =>
  mutateResource('previewTrade', { instrumentId, lots, side }) as TradePreview;

describe('исполнение виртуального поручения', () => {
  beforeEach(() => resetMockDb());

  it('не меняет средства и позиции при подготовке, даже если агент на паузе', () => {
    mutateResource('saveConfig', { paused: true });
    const before = portfolio();
    const quote = preview();
    expect(quote).toMatchObject({ quantity: 10, base: '2784.20', fee: '8.35', total: '2792.55' });
    expect(portfolio()).toEqual(before);
    mutateResource('confirmTrade', { previewId: quote.previewId });
    expect(getMockDb().cash).toBe('15407.45');
    expect(getMockDb().config.paused).toBe(true);
  });

  it('считает количество единиц в большом лоте и комиссию с копейками', () => {
    const before = portfolio();
    const quote = preview('TMON');
    expect(quote.quantity).toBe(1000);
    expect(quote.base).toBe('1430.00');
    expect(quote.fee).toBe('4.29');
    mutateResource('confirmTrade', { previewId: quote.previewId });
    const after = portfolio();
    const quantity = (p: typeof after) =>
      p.positions.find((x) => x.instrumentId === 'TMON')!.quantity;
    expect(quantity(after) - quantity(before)).toBe(1000);
    expect(after.cash).toBe('16765.71');
    expect(Number(before.value) - Number(after.value)).toBeCloseTo(4.29, 2);
  });

  it('не исполняет один preview дважды при повторном подтверждении', () => {
    const quote = preview();
    mutateResource('confirmTrade', { previewId: quote.previewId });
    const snapshot = structuredClone(getMockDb());
    const replay = mutateResource('confirmTrade', { previewId: quote.previewId });
    expect(replay).toMatchObject({ status: 'already-executed' });
    expect(getMockDb()).toEqual(snapshot);
  });

  it('отклоняет устаревшую версию настроек без изменения денег', () => {
    const quote = preview();
    mutateResource('saveConfig', { budget: '50000' });
    const before = portfolio();
    expect(() => mutateResource('confirmTrade', { previewId: quote.previewId })).toThrow(
      'План устарел',
    );
    expect(portfolio()).toEqual(before);
  });

  it('отклоняет истёкшую котировку', () => {
    const quote = preview();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(quote.expiresAt) + 1);
    expect(() => mutateResource('confirmTrade', { previewId: quote.previewId })).toThrow(
      'План устарел',
    );
    expect(quote.consumed).toBe(false);
  });

  it('перепроверяет средства при исполнении двух конкурирующих заявок', () => {
    const first = preview('GOLD', 2);
    const second = preview('GOLD', 2);
    mutateResource('confirmTrade', { previewId: first.previewId });
    const before = portfolio();
    expect(() => mutateResource('confirmTrade', { previewId: second.previewId })).toThrow(
      'Доступные средства изменились',
    );
    expect(portfolio()).toEqual(before);
  });

  it('не разрешает продать больше лотов, чем осталось', () => {
    const held = getMockDb().positions.SBER;
    const first = preview('SBER', held, 'sell');
    const second = preview('SBER', held, 'sell');
    mutateResource('confirmTrade', { previewId: first.previewId });
    expect(() => mutateResource('confirmTrade', { previewId: second.previewId })).toThrow(
      'Количество лотов изменилось',
    );
    expect(getMockDb().positions.SBER).toBe(0);
  });
});
