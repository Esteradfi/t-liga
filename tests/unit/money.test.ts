import { describe, expect, it } from 'vitest';
import { decimal, exact, money, percent } from '@/shared/lib/money';

describe('денежные значения', () => {
  it('сохраняет копейки при сложении дробных сумм и расчёте комиссии', () => {
    const gross = decimal('278.42').times(10);
    const fee = gross.times('0.003').toDecimalPlaces(2);
    expect(exact(gross.plus(fee))).toBe('2792.55');
    expect(exact(decimal('0.1').plus('0.2'))).toBe('0.30');
  });

  it('показывает отрицательный результат и копейки без потери знака', () => {
    expect(money('-8.35').replace(/\s/g, '')).toBe('-8,35₽');
    expect(percent('-2.1')).toBe('−2,10%');
    expect(percent('3.42')).toBe('+3,42%');
  });
});
