export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function niceTicks(min, max, count = 5) {
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const niceStep = mult * step;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const ticks = [];
  for (let x = niceMin; x <= niceMax + 1e-9; x += niceStep) ticks.push(+x.toFixed(12));
  return ticks;
}

export function percentile(values, p) {
  const a = [...values].filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return 0;
  const idx = (p / 100) * (a.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  const t = idx - lo;
  return lo === hi ? a[lo] : lerp(a[lo], a[hi], t);
}
