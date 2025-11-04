// src/utils/influxClient.js
const BASE = process.env.REACT_APP_INFLUX_BASE || '';
const TOKEN = process.env.REACT_APP_INFLUX_TOKEN || '';

function qstr(params) {
  const usp = new URLSearchParams(params);
  return usp.toString();
}

export async function influxQuery({ db, q, pretty = false }) {
  const qs = qstr({ db, q, ...(pretty ? { pretty: 'true' } : {}) });
  const url = `${BASE}/query?${qs}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${TOKEN}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Influx error ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

/** Extract a single series (common InfluxQL shape) */
export function firstSeries(json) {
  return json?.results?.[0]?.series?.[0] ?? null;
}
