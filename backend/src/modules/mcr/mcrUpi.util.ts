export function buildUpiLink(upiId: string, payeeName: string, amountPaise?: number): string {
  const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' });
  if (amountPaise && amountPaise > 0) params.set('am', (amountPaise / 100).toFixed(2));
  return `upi://pay?${params.toString()}`;
}
