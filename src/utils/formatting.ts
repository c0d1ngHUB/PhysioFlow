export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
}