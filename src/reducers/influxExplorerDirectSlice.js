import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';


const INFLUX_BASE = process.env.REACT_APP_INFLUX_BASE;
const INFLUX_TOKEN = process.env.REACT_APP_INFLUX_TOKEN;

// Helper: turn Date -> ISO like 2025-01-01T00:00:00Z
export const toISO = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
};

// Fetch measurement names for a DB
export const fetchMeasurements = createAsyncThunk(
  'influx/fetchMeasurements',
  async ({ db }) => {
    const url = new URL(`${INFLUX_BASE}/query`);
    // SHOW MEASUREMENTS works on v1 InfluxQL
    url.searchParams.set('db', db);
    url.searchParams.set('q', 'SHOW MEASUREMENTS');
    const res = await fetch(url.toString(), { headers: { Authorization: `Token ${INFLUX_TOKEN}` }});
    if (!res.ok) throw new Error(`Influx error ${res.status}`);
    const json = await res.json();
    const series = json?.results?.[0]?.series?.[0];
    const names = series?.values?.map(v => v[0]) ?? [];
    return { db, measurements: names };
  }
);

// Fetch time series and normalize to {timestamp,value}
export const fetchSeries = createAsyncThunk(
  'influx/fetchSeries',
  async ({ db, measurement, startISO, endISO, groupInterval = '1h' }) => {
    // 1) Pull all fields for the measurement in range
    const base = new URL(`${INFLUX_BASE}/query`);
    base.searchParams.set('db', db);
    base.searchParams.set('q',
      `SELECT * FROM "${measurement}" ` +
      `WHERE time >= '${startISO}' AND time <= '${endISO}'`
    );
    const res = await fetch(base.toString(), { headers: { Authorization: `Token ${INFLUX_TOKEN}` }});
    if (!res.ok) throw new Error(`Influx error ${res.status}`);
    const json = await res.json();
    const s = json?.results?.[0]?.series?.[0];
    const cols = s?.columns ?? [];
    const vals = s?.values ?? [];

    // 2) Pick the first numeric column (excluding 'time')
    const timeIdx = cols.indexOf('time');
    let numIdx = -1;
    for (let i = 0; i < cols.length; i++) {
      if (i === timeIdx) continue;
      // find a row with a numeric value at this column
      const firstNonNull = vals.find(r => typeof r[i] === 'number');
      if (firstNonNull) { numIdx = i; break; }
    }
    if (numIdx === -1) {
      return { db, measurement, label: measurement, points: [] }; // nothing numeric
    }

    const valueKey = cols[numIdx]; // e.g., 'co2', 'Exported_Energy', etc.

    // 3) Optional: downsample by MEAN over a fixed interval on that valueKey
    const down = new URL(`${INFLUX_BASE}/query`);
    down.searchParams.set('db', db);
    down.searchParams.set('q',
      `SELECT MEAN("${valueKey}") AS v FROM "${measurement}" ` +
      `WHERE time >= '${startISO}' AND time <= '${endISO}' ` +
      `GROUP BY time(${groupInterval}) fill(none)`
    );
    const res2 = await fetch(down.toString(), { headers: { Authorization: `Token ${INFLUX_TOKEN}` }});
    if (!res2.ok) throw new Error(`Influx downsample error ${res2.status}`);
    const json2 = await res2.json();
    const s2 = json2?.results?.[0]?.series?.[0];
    const cols2 = s2?.columns ?? [];
    const vals2 = s2?.values ?? [];

    const tIdx = cols2.indexOf('time');
    const vIdx = cols2.indexOf('v');

    const points = (tIdx >= 0 && vIdx >= 0)
      ? vals2.map(r => ({ timestamp: r[tIdx], value: r[vIdx] }))
      : [];

    return { db, measurement, label: valueKey, points };
  }
);

const slice = createSlice({
  name: 'influx',
  initialState: {
    dbs: ['porto_lot_1', 'porto_lot_2', 'porto_lot_4'],
    measurementsByDb: {}, // { db: [m1, m2, ...] }
    series: [],           // normalized [{timestamp,value}]
    seriesLabel: '',      // which field was used
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMeasurements.pending, (st) => { st.loading = true; st.error = null; });
    b.addCase(fetchMeasurements.fulfilled, (st, { payload }) => {
      st.loading = false;
      st.measurementsByDb[payload.db] = payload.measurements;
    });
    b.addCase(fetchMeasurements.rejected, (st, a) => { st.loading = false; st.error = a.error; });

    b.addCase(fetchSeries.pending, (st) => { st.loading = true; st.error = null; st.series = []; });
    b.addCase(fetchSeries.fulfilled, (st, { payload }) => {
      st.loading = false;
      st.series = payload.points;
      st.seriesLabel = payload.label;
    });
    b.addCase(fetchSeries.rejected, (st, a) => { st.loading = false; st.error = a.error; st.series = []; });
  }
});

export default slice.reducer;
