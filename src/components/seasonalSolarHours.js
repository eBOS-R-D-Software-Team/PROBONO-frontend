/**
 * seasonalSolarHours.js
 *
 * Seasonal solar-hours mapping per Sonae Sierra Facilities Management
 * Team feedback (April 2026):
 *
 *   Winter  Nov–Feb   09:00–17:00
 *   Spring  Mar–Apr   08:00–18:00
 *   Summer  May–Aug   07:00–19:00
 *   Autumn  Sep–Oct   08:00–18:00
 *
 * Shared by UC2RecommendationPanel and UC2EnergyReport.
 */

/** Get the solar-hour window for a given date. Returns { start, end, season }. */
export function getSolarHours(date) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getUTCMonth() + 1; // 1..12

  if (month === 11 || month === 12 || month === 1 || month === 2)
    return { start: 9, end: 17, season: "Winter" };
  if (month === 3 || month === 4)
    return { start: 8, end: 18, season: "Spring" };
  if (month >= 5 && month <= 8)
    return { start: 7, end: 19, season: "Summer" };
  // Sep–Oct
  return { start: 8, end: 18, season: "Autumn" };
}

/** Check whether a given date falls within its seasonal solar window. */
export function isSolarHour(date) {
  const d = date instanceof Date ? date : new Date(date);
  const { start, end } = getSolarHours(d);
  const h = d.getUTCHours();
  return h >= start && h < end;
}

/** Return a compact human summary of the solar-hour ranges present in a period. */
export function summariseSolarHours(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate), e = new Date(endDate);
  const seasons = new Set();
  const cur = new Date(s);
  while (cur <= e) {
    seasons.add(getSolarHours(cur).season);
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (seasons.size === 4) break;
  }
  return [...seasons];
}