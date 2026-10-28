/**
 * Calculator formulas — one implementation shared by the public estimator and the
 * admin price preview. Pure functions, no React: the owner sees the exact number
 * a visitor sees, and changing a formula here changes it in both places.
 *
 * Both helpers tolerate partial/missing rates (a fresh install, or an item the
 * admin just deleted) and never throw.
 */

export const areaOf = (w, h) => Math.max(0, Number(w || 0) * Number(h || 0));

/** Is an add-on ticked? `sel` holds explicit user choices; otherwise the admin default wins. */
export const addonOn = (a, sel, k) => (k in (sel || {}) ? !!sel[k] : !!a?.on);

/**
 * Signage / booth estimate.
 * Line items carry `en`/`ar` so the caller can render them with the same `tx()` helper.
 */
export function signageQuote(rates, { mat, w = 0, h = 0, sel = {} } = {}) {
  const catalog = rates?.area || {};
  const matKey = catalog[mat] ? mat : Object.keys(catalog)[0];
  const m = catalog[matKey] || null;
  const area = areaOf(w, h);
  const lines = m ? [{ k: 'mat', en: m.en, ar: m.ar, m, v: area * Number(m.price || 0) }] : [];
  Object.entries(rates?.addons || {}).forEach(([k, a]) => {
    if (!addonOn(a, sel, k)) return;
    const v = a.unit === 'flat' ? Number(a.price || 0) : area * Number(a.price || 0);
    lines.push({ k, en: a.en, ar: a.ar, m: a, v });
  });
  return { matKey, mat: m, area, lines, total: lines.reduce((s, l) => s + l.v, 0) };
}

/**
 * Print estimate.
 * `unit` is already discounted by the quantity tier (what the website shows as the
 * unit price); `total` is unit × quantity.
 */
export function printQuote(rates, { item, size, paper, lam, sides, qty } = {}) {
  const catalog = rates?.print || {};
  const itemKey = catalog[item] ? item : Object.keys(catalog)[0];
  const it = catalog[itemKey] || null;
  const sizes = it?.sizes?.length ? it.sizes : ['A4'];
  const sizeKey = sizes.includes(size) ? size : sizes[0];
  const m = rates?.mult || {};
  const mult = {
    size: m.size?.[sizeKey] ?? 1,
    paper: m.paper?.[paper] ?? 1,
    lam: m.lam?.[lam] ?? 1,
    sides: m.sides?.[sides] ?? 1,
    qty: m.qty?.[qty] ?? 1,
  };
  if (!it) return { itemKey, it: null, sizes, size: sizeKey, mult, unit: 0, total: 0, base: 0, pieces: 0 };
  const base = Number(it.price || 0) * mult.size * mult.paper * mult.lam * mult.sides;
  const pieces = Number(qty) || 0;
  return { itemKey, it, sizes, size: sizeKey, mult, base, pieces, unit: base * mult.qty, total: base * pieces * mult.qty };
}
