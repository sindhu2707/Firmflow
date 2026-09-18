// Amounts throughout the billing API are in the smallest currency unit
// (paise for INR), matching what Razorpay itself uses.

export function formatMoney(
  amountInSubunits: number,
  currency: string,
): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountInSubunits % 100 === 0 ? 0 : 2,
  }).format(amountInSubunits / 100);
}

export function formatDate(
  iso: string | null | undefined,
): string {
  if (!iso) return '—';

  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
