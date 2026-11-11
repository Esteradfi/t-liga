import { describe, expect, it } from 'vitest';
import { configSchema } from '@/features/agent-management/model/validation';
import { tradeSchema } from '@/features/trade/model/validation';
import { createSeedDb } from '@/mocks/db';

describe('ограничения поручений', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'отклоняет некорректное количество лотов %s',
    (lots) => {
      expect(tradeSchema.safeParse({ instrumentId: 'sber', side: 'buy', lots }).success).toBe(
        false,
      );
    },
  );
  it('не принимает произвольное действие вместо покупки/продажи', () => {
    expect(tradeSchema.safeParse({ instrumentId: 'sber', side: 'withdraw', lots: 1 }).success).toBe(
      false,
    );
  });
  it.each(['', 'NaN', 'Infinity', '-1', '999'])('не принимает недопустимый бюджет %s', (budget) => {
    expect(configSchema.safeParse({ ...createSeedDb().config, budget }).success).toBe(false);
  });
  it('сохраняет явный запрет плеча и допускает нулевой лимит расходов', () => {
    const parsed = configSchema.parse({
      ...createSeedDb().config,
      leverage: false,
      costLimit: '0',
    });
    expect(parsed.leverage).toBe(false);
    expect(parsed.costLimit).toBe('0');
  });
  it('не разрешает пустой набор инструментов и плечо за установленным пределом', () => {
    expect(configSchema.safeParse({ ...createSeedDb().config, instruments: [] }).success).toBe(
      false,
    );
    expect(configSchema.safeParse({ ...createSeedDb().config, maxLeverage: '6' }).success).toBe(
      false,
    );
  });
});
