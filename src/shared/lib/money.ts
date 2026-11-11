import Decimal from 'decimal.js';
export { Decimal };
export const decimal = (value: Decimal.Value) => new Decimal(value);
export const exact = (value: Decimal.Value) => new Decimal(value).toFixed(2);
export const money = (value: Decimal.Value) =>
  `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(new Decimal(value).toNumber())} ₽`;
export const percent = (value: Decimal.Value) =>
  `${new Decimal(value).gt(0) ? '+' : ''}${new Decimal(value).toFixed(2).replace('.', ',').replace('-', '−')}%`;
