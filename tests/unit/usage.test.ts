import { beforeEach, describe, expect, it } from 'vitest';
import type { TradePreview } from '@/shared/api/contracts';
import { getMockDb, resetMockDb } from '@/mocks/db';
import { mutateResource } from '@/mocks/service';

describe('квота аналитических задач', () => {
  beforeEach(() => resetMockDb());
  it('исчерпанная квота не блокирует ручную сделку, настройки и остановку', () => {
    const db = getMockDb();
    db.usage = { period: new Date().toISOString().slice(0, 7), ordinary: 20 };
    db.chatPending = false;
    expect(() => mutateResource('sendMessage', { text: 'Новая инвестиционная идея' })).toThrow(
      'Лимит аналитических задач',
    );
    mutateResource('saveConfig', { paused: true });
    const preview = mutateResource('previewTrade', {
      instrumentId: 'TMON',
      lots: 1,
      side: 'buy',
    }) as TradePreview;
    mutateResource('confirmTrade', { previewId: preview.id });
    expect(db.cash).toBe('16765.71');
    expect(db.config.paused).toBe(true);
  });
  it('в новом месяце начинает счётчик заново', () => {
    getMockDb().usage = { period: '2000-01', ordinary: 20 };
    mutateResource('sendMessage', { text: 'Новая задача' });
    expect(getMockDb().usage).toEqual({
      period: new Date().toISOString().slice(0, 7),
      ordinary: 1,
    });
  });
});
