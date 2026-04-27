export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function getSingleQueryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
