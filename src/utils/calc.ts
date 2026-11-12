/**
 * Расчёт цены продажи из закупочной цены и наценки.
 * price = purchasePrice * (1 + markupPercent / 100)
 */
export function calcPrice(purchasePrice: number, markupPercent: number): number {
  const value = purchasePrice * (1 + markupPercent / 100);
  return Math.round(value * 100) / 100;
}

/** Возвращает true, если цена была переопределена вручную (отличается от расчётной). */
export function isManualPrice(price: number, purchasePrice: number, markupPercent: number): boolean {
  return Math.abs(price - calcPrice(purchasePrice, markupPercent)) > 0.01;
}
