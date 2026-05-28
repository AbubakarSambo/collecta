/**
 * Calculates the Collecta service charge for a given amount in Naira.
 *
 * Formula: ₦200 base + 2% of amount, capped at ₦3,000.
 * The member pays: amount + serviceCharge.
 * The organisation receives: amount (exactly, via Paystack subaccount split).
 * Collecta nets: serviceCharge minus Paystack processing fees.
 */
export function calculateServiceCharge(amountNaira: number): number {
  const base = 200;
  const percent = amountNaira * 0.02;
  const charge = Math.min(base + percent, 3000);
  return Math.round(charge * 100) / 100; // round to 2dp
}

/**
 * Returns the total amount the member will pay (amount + serviceCharge).
 */
export function calculateTotalAmount(amountNaira: number): number {
  const serviceCharge = calculateServiceCharge(amountNaira);
  return Math.round((amountNaira + serviceCharge) * 100) / 100;
}
