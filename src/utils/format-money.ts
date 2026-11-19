import type { Money } from '../types/catalog.js';

const CURRENCY_LOCALE = 'ru-RU';
const MAXIMUM_FRACTION_DIGITS = 2;
const MINIMUM_FRACTION_DIGITS = 0;
const MINOR_UNITS_PER_MAJOR_UNIT = 100;

export function formatMoney(money: Money): string {
  const amountMajor: number = money.amountMinor / MINOR_UNITS_PER_MAJOR_UNIT;
  const formatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: MINIMUM_FRACTION_DIGITS,
    maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
  });

  return formatter.format(amountMajor);
}
