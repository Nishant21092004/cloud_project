/**
 * India-wide delivery coverage model for the demo store.
 * -------------------------------------------------------
 * India's PIN code is hierarchical, and the hierarchy is public knowledge:
 *   digit 1   → postal circle (roughly a state group)
 *   digits 1-2→ region within the circle
 *   digits 1-3→ sorting & delivery district
 *
 * So this module can answer "do you deliver to 395007?" with something
 * better than a whitelist of twelve Delhi pincodes: the first three digits
 * look up a named city, otherwise the first digit gives the circle.
 *
 * IMPORTANT (and it is repeated in the UI for a reason): fees and day
 * estimates here are *classroom estimates*. This is not India Post or a
 * courier API, and it must never be presented to a real customer as
 * serviceability. Real fulfilment needs a carrier API (Delhivery, Blue
 * Dart, India Post's) checked against live serviceability data.
 */

export interface DeliveryEstimate {
  /** Delivery fee in paise. */
  feePaise: number;
  etaDaysMin: number;
  etaDaysMax: number;
  city: string;
  state: string;
  circle: string;
  /** Same-city dispatch hub exists → cheaper + faster. */
  hub: boolean;
  /** Far-north / island / hilly coverage → slower + costlier. */
  remote: boolean;
}

interface Circle {
  name: string;
  states: string;
  /** Base fee in rupees for this circle. */
  feeRupees: number;
  etaMin: number;
  etaMax: number;
}

/** First PIN digit → India Post circle (the coarse but reliable layer). */
const CIRCLES: Record<string, Circle> = {
  "1": { name: "Delhi & North", states: "Delhi, Haryana, Punjab, Chandigarh, Himachal Pradesh, J&K, Ladakh", feeRupees: 60, etaMin: 2, etaMax: 4 },
  "2": { name: "Uttar Pradesh & Uttarakhand", states: "Uttar Pradesh, Uttarakhand", feeRupees: 65, etaMin: 2, etaMax: 5 },
  "3": { name: "Rajasthan & Gujarat", states: "Rajasthan, Gujarat, Dadra & Nagar Haveli and Daman & Diu", feeRupees: 65, etaMin: 2, etaMax: 4 },
  "4": { name: "Maharashtra & Madhya Pradesh", states: "Maharashtra, Goa, Madhya Pradesh, Chhattisgarh", feeRupees: 70, etaMin: 2, etaMax: 4 },
  "5": { name: "South — Karnataka, Telangana & AP", states: "Karnataka, Telangana, Andhra Pradesh", feeRupees: 75, etaMin: 2, etaMax: 5 },
  "6": { name: "Deep South", states: "Tamil Nadu, Kerala, Puducherry, Lakshadweep", feeRupees: 75, etaMin: 2, etaMax: 5 },
  "7": { name: "East & North-East", states: "West Bengal, Odisha, Bihar (parts), Assam and the Seven Sisters, Andaman & Nicobar", feeRupees: 85, etaMin: 3, etaMax: 7 },
  "8": { name: "Bihar & Jharkhand", states: "Bihar, Jharkhand", feeRupees: 80, etaMin: 3, etaMax: 6 },
};

/** Sorting-district level rows (first 3 PIN digits) we are confident about. */
interface CityRow { city: string; state: string }
const CITY_BY_PREFIX3: Record<string, CityRow> = {
  // 1 — Delhi & North
  "110": { city: "New Delhi", state: "Delhi" },
  "121": { city: "Faridabad", state: "Haryana" },
  "122": { city: "Gurugram", state: "Haryana" },
  "131": { city: "Sonipat", state: "Haryana" },
  "132": { city: "Karnal", state: "Haryana" },
  "141": { city: "Ludhiana", state: "Punjab" },
  "143": { city: "Amritsar", state: "Punjab" },
  "144": { city: "Jalandhar", state: "Punjab" },
  "147": { city: "Patiala", state: "Punjab" },
  "160": { city: "Chandigarh", state: "Chandigarh (UT)" },
  "171": { city: "Shimla", state: "Himachal Pradesh" },
  "176": { city: "Kangra / Dharamshala", state: "Himachal Pradesh" },
  "180": { city: "Jammu", state: "Jammu & Kashmir" },
  "190": { city: "Srinagar", state: "Jammu & Kashmir" },
  "194": { city: "Leh", state: "Ladakh (UT)" },
  // 2 — UP & Uttarakhand
  "201": { city: "Noida / Gautam Buddha Nagar", state: "Uttar Pradesh" },
  "208": { city: "Kanpur Nagar", state: "Uttar Pradesh" },
  "211": { city: "Prayagraj", state: "Uttar Pradesh" },
  "221": { city: "Varanasi", state: "Uttar Pradesh" },
  "226": { city: "Lucknow", state: "Uttar Pradesh" },
  "248": { city: "Dehradun", state: "Uttarakhand" },
  "249": { city: "Haridwar", state: "Uttarakhand" },
  "250": { city: "Meerut", state: "Uttar Pradesh" },
  "282": { city: "Agra", state: "Uttar Pradesh" },
  // 3 — Rajasthan & Gujarat
  "302": { city: "Jaipur", state: "Rajasthan" },
  "305": { city: "Ajmer", state: "Rajasthan" },
  "313": { city: "Udaipur", state: "Rajasthan" },
  "324": { city: "Kota", state: "Rajasthan" },
  "334": { city: "Bikaner", state: "Rajasthan" },
  "342": { city: "Jodhpur", state: "Rajasthan" },
  "360": { city: "Rajkot", state: "Gujarat" },
  "380": { city: "Ahmedabad", state: "Gujarat" },
  "382": { city: "Gandhinagar", state: "Gujarat" },
  "384": { city: "Mehsana", state: "Gujarat" },
  "390": { city: "Vadodara", state: "Gujarat" },
  "395": { city: "Surat", state: "Gujarat" },
  "396": { city: "Navsari / Valsad", state: "Gujarat" },
  // 4 — Maharashtra, Goa, MP, CG
  "400": { city: "Mumbai / Thane", state: "Maharashtra" },
  "403": { city: "Panaji (Goa)", state: "Goa" },
  "411": { city: "Pune", state: "Maharashtra" },
  "413": { city: "Solapur", state: "Maharashtra" },
  "414": { city: "Ahmednagar", state: "Maharashtra" },
  "422": { city: "Nashik", state: "Maharashtra" },
  "431": { city: "Chhatrapati Sambhajinagar (Aurangabad)", state: "Maharashtra" },
  "440": { city: "Nagpur", state: "Maharashtra" },
  "452": { city: "Indore", state: "Madhya Pradesh" },
  "462": { city: "Bhopal", state: "Madhya Pradesh" },
  "482": { city: "Jabalpur", state: "Madhya Pradesh" },
  "492": { city: "Raipur", state: "Chhattisgarh" },
  // 5 — Karnataka, Telangana, AP
  "500": { city: "Hyderabad", state: "Telangana" },
  "517": { city: "Tirupati", state: "Andhra Pradesh" },
  "520": { city: "Vijayawada", state: "Andhra Pradesh" },
  "522": { city: "Guntur", state: "Andhra Pradesh" },
  "530": { city: "Visakhapatnam", state: "Andhra Pradesh" },
  "560": { city: "Bengaluru", state: "Karnataka" },
  "570": { city: "Mysuru", state: "Karnataka" },
  "575": { city: "Mangaluru", state: "Karnataka" },
  "580": { city: "Hubballi-Dharwad", state: "Karnataka" },
  "590": { city: "Belagavi", state: "Karnataka" },
  // 6 — Tamil Nadu, Kerala, Puducherry
  "600": { city: "Chennai", state: "Tamil Nadu" },
  "605": { city: "Puducherry", state: "Puducherry (UT)" },
  "620": { city: "Tiruchirappalli", state: "Tamil Nadu" },
  "625": { city: "Madurai", state: "Tamil Nadu" },
  "632": { city: "Vellore", state: "Tamil Nadu" },
  "636": { city: "Salem", state: "Tamil Nadu" },
  "641": { city: "Coimbatore", state: "Tamil Nadu" },
  "673": { city: "Kozhikode", state: "Kerala" },
  "680": { city: "Thrissur", state: "Kerala" },
  "682": { city: "Ernakulam (Kochi)", state: "Kerala" },
  "691": { city: "Kollam", state: "Kerala" },
  "695": { city: "Thiruvananthapuram", state: "Kerala" },
  // 7 — East & North-East
  "700": { city: "Kolkata", state: "West Bengal" },
  "711": { city: "Howrah", state: "West Bengal" },
  "713": { city: "Durgapur / Asansol", state: "West Bengal" },
  "734": { city: "Siliguri / Darjeeling hills", state: "West Bengal" },
  "737": { city: "Gangtok", state: "Sikkim" },
  "744": { city: "Port Blair", state: "Andaman & Nicobar (UT)" },
  "751": { city: "Bhubaneswar", state: "Odisha" },
  "753": { city: "Cuttack", state: "Odisha" },
  "781": { city: "Guwahati", state: "Assam" },
  "793": { city: "Shillong", state: "Meghalaya" },
  "796": { city: "Aizawl", state: "Mizoram" },
  "797": { city: "Kohima", state: "Nagaland" },
  "799": { city: "Agartala", state: "Tripura" },
  // 8 — Bihar & Jharkhand
  "800": { city: "Patna", state: "Bihar" },
  "831": { city: "Jamshedpur (East Singhbhum)", state: "Jharkhand" },
  "834": { city: "Ranchi", state: "Jharkhand" },
};

/** PINs we ship from — same-city next-day and a lower fee. */
const HUB_PREFIX3 = new Set(["110", "400", "411", "560", "500", "600", "700", "380", "395", "226", "302"]);

/** Where the hills and islands are — slower, costlier, still serviceable. */
const REMOTE_PREFIX3 = new Set(["171", "176", "180", "190", "194", "248", "249", "737", "744", "793", "796", "797", "799"]);

/**
 * Estimate delivery for any Indian PIN.
 * Returns null for: not six digits, leading 0, and the 9xxxxx series
 * (Army/APO/FPO mail, which a civilian courier cannot service).
 */
export function estimateIndiaDelivery(pincode: string): DeliveryEstimate | null {
  if (!/^\d{6}$/.test(pincode)) return null;
  const first = pincode[0];
  if (first === "0" || first === "9") return null;
  const circle = CIRCLES[first];
  if (!circle) return null;

  const prefix3 = pincode.slice(0, 3);
  const city = CITY_BY_PREFIX3[prefix3];
  const hub = HUB_PREFIX3.has(prefix3);
  const remote = REMOTE_PREFIX3.has(prefix3);

  let feeRupees = circle.feeRupees + (city ? 0 : 10) + (hub ? -20 : 0) + (remote ? 30 : 0);
  feeRupees = Math.max(39, feeRupees);

  let etaMin = hub ? 1 : circle.etaMin;
  let etaMax = hub ? 2 : circle.etaMax;
  if (remote) { etaMin += 2; etaMax += 2; }

  return {
    feePaise: Math.round(feeRupees * 100),
    etaDaysMin: etaMin,
    etaDaysMax: etaMax,
    city: city?.city ?? `${circle.name} circle (${prefix3}xx)`,
    state: city?.state ?? circle.states.split(",")[0].trim(),
    circle: circle.name,
    hub,
    remote,
  };
}

/** Kept for the old call sites & tests: fee only, paise or null. */
export function estimateDemoDelivery(pincode: string): number | null {
  return estimateIndiaDelivery(pincode)?.feePaise ?? null;
}

/** For the public "Delivery coverage" page and the checkout info card. */
export function listDeliveryCircles() {
  return Object.entries(CIRCLES).map(([firstDigit, c]) => ({
    firstDigit,
    name: c.name,
    states: c.states,
    feePaise: Math.round(c.feeRupees * 100),
    etaDaysMin: c.etaMin,
    etaDaysMax: c.etaMax,
    cities: Object.entries(CITY_BY_PREFIX3)
      .filter(([prefix]) => prefix[0] === firstDigit)
      .map(([prefix, row]) => ({ prefix, city: row.city, state: row.state })),
  }));
}

export const HUB_CITY_COUNT = HUB_PREFIX3.size;
