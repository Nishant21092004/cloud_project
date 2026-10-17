/**
 * Classroom/demo-wide domestic delivery estimate. This is NOT an India Post or
 * courier serviceability guarantee; real fulfilment needs a live carrier API.
 * Admin-configured PIN rows take priority and can be explicitly deactivated.
 */
export function estimateDemoDelivery(pincode: string): number | null {
  if (!/^[1-8]\d{5}$/.test(pincode)) return null;
  const zone = Number(pincode[0]);
  // Flat estimates per postal region. Rupees converted to integer paise.
  const rupees: Record<number, number> = {
    1: 60, 2: 65, 3: 75, 4: 80, 5: 85, 6: 90, 7: 95, 8: 90,
  };
  return rupees[zone] * 100;
}
