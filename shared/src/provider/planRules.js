// What a partner plan still needs before it can be saved, in the partner's words; the same limits as the server (service-plan/plan.routes planBody).
export const PLAN_LIMITS = { nameMin: 3, itemsMax: 10, visitsMin: 1, visitsMax: 31, discountMax: 40, pausesMax: 10, priceMinPaise: 100, priceMaxPaise: 50000000 };

// Each problem is { key, en, p }: a translation key, the English text (with {x} placeholders) and its values.
// Service Pro translates by key; planProblems below keeps returning the plain English strings (mobile uses those).
export function planProblemList({ type, name, itemCount, pricePaise, visitsPerMonth, d3, d5, pauses }) {
  const L = PLAN_LIMITS;
  const out = [];
  if (String(name || '').trim().length < L.nameMin) out.push({ key: 'sp.pln.prName', en: 'Give the plan a name (at least {n} letters)', p: { n: L.nameMin } });
  if (!itemCount) out.push({ key: 'sp.pln.prItems', en: 'Tap at least one job below to put it in the plan', p: {} });
  if (itemCount > L.itemsMax) out.push({ key: 'sp.pln.prItemsMax', en: 'A plan can hold up to {n} jobs', p: { n: L.itemsMax } });
  if (!pricePaise || pricePaise < L.priceMinPaise) out.push({ key: 'sp.pln.prPrice', en: 'Set the price', p: {} });
  if (pricePaise > L.priceMaxPaise) out.push({ key: 'sp.pln.prPriceMax', en: 'The price can be up to ₹5,00,000', p: {} });
  if (type === 'monthly') {
    const v = Number(visitsPerMonth);
    if (!v || v < L.visitsMin || v > L.visitsMax) out.push({ key: 'sp.pln.prVisits', en: 'Visits a month must be from {a} to {b}', p: { a: L.visitsMin, b: L.visitsMax } });
    if (Number(d3) > L.discountMax || Number(d5) > L.discountMax) out.push({ key: 'sp.pln.prDiscount', en: 'A discount can be up to {n}%', p: { n: L.discountMax } });
    if (Number(pauses) > L.pausesMax) out.push({ key: 'sp.pln.prPauses', en: 'Pause days can be up to {n} a month', p: { n: L.pausesMax } });
  }
  return out;
}

export const fillParams = (s, p) => Object.entries(p || {}).reduce((a, [k, v]) => a.replace(`{${k}}`, v), s);

export function planProblems(args) {
  return planProblemList(args).map((x) => fillParams(x.en, x.p));
}
