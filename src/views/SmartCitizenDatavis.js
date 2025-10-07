import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import ElectricityChart from '../components/ElectricityChart';   // reuse for visual homogeneity
import { fetchSmartCitizenData, setSCMeasure, setSCTimeRange, resetSCStatus } from '../reducers/smartcitizenSlice';

// Slugs with data in your DB right now
const MEASURE_OPTIONS = [
  { value: 'pm1_ugm3',      label: 'PM1 (µg/m³)' },
  { value: 'pm25_ugm3',     label: 'PM2.5 (µg/m³)' },
  { value: 'pm10_ugm3',     label: 'PM10 (µg/m³)' },
  { value: 'tvoc_ppb',      label: 'TVOC (ppb)' },
  { value: 'eco2_ppm',      label: 'eCO₂ (ppm)' },
  { value: 'noise_db',      label: 'Noise (dB)' },
  { value: 'temp_c',        label: 'Temperature (°C)' },
  { value: 'hum_pct',       label: 'Humidity (%)' },
  { value: 'light_lux',     label: 'Light (lux)' },
  { value: 'pressure_kpa',  label: 'Barometric Pressure (kPa)' },
  { value: 'battery_pct',   label: 'Battery (%)' }
  // no2_ugm3 intentionally omitted (no data)
];

// Helpers matching your electricity page UX
const toISO = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(
    d.getUTCMinutes()
  ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}Z`;

const fromISO = (s) => {
  // ISO with Z to Date (UTC-based)
  try { return new Date(s); } catch { return new Date(); }
};

export default function SmartCitizenDatavis() {
  const dispatch = useDispatch();

  // Redux state
  const {
    startTime, endTime, interval,
    measure, label, unit,
    rows, loading, error, message
  } = useSelector((state) => state.smartcitizen || {});

  // Local UI state for pagination (like electricity view)
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(48); // 48 points per page; tweak as you wish

  // Local UI state for DatePickers (they work with Date objects)
  const [startDate, setStartDate] = useState(fromISO(startTime));
  const [endDate,   setEndDate]   = useState(fromISO(endTime));

  // Keep pickers in sync if redux updates externally
  useEffect(() => { setStartDate(fromISO(startTime)); }, [startTime]);
  useEffect(() => { setEndDate(fromISO(endTime)); }, [endTime]);

  const handleConfirm = () => {
    const sISO = toISO(startDate);
    const eISO = toISO(endDate);
    dispatch(setSCTimeRange({ startTime: sISO, endTime: eISO, interval }));
    dispatch(fetchSmartCitizenData({ startTime: sISO, endTime: eISO, measure, interval }));
  };

  // Auto fetch on first mount (like your electricity flow)
  useEffect(() => {
    if (!rows || rows.length === 0) {
      dispatch(fetchSmartCitizenData({ startTime, endTime, measure, interval }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination
  const tablePage = useMemo(() => rows.slice(first, first + rowsPerPage), [rows, first, rowsPerPage]);
  const onPageChange = (e) => { setFirst(e.first); setRowsPerPage(e.rows); };

  // One-line dataset to reuse ElectricityChart
  const color = '#36A2EB';
  const chartData = useMemo(() => ({
    labels: tablePage.map(r => r.time),
    datasets: [
      {
        label: label || measure,
        data: tablePage.map(r => r.value),
        borderColor: color,
        backgroundColor: color,
        fill: false,
        pointRadius: 2,
        spanGaps: true
      }
    ]
  }), [tablePage, label, measure]);

  useEffect(() => {
      const init = () => {
        const g = window.google;
        const center = { lat: 53.294333406031576, lng: -6.134340637034364 };
        const map = new g.maps.Map(document.getElementById('map-derv'), {
          center,
          zoom: 18,
          mapTypeId: g.maps.MapTypeId.SATELLITE,
        });
        new g.maps.Marker({ map, position: center, title: 'Dublin – Road Diesel (DERV)' });
      };
  
      if (!window.google || !window.google.maps) {
        const s = document.createElement('script');
        s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places';
        s.async = true; s.defer = true; s.onload = init;
        document.head.appendChild(s);
      } else {
        init();
      }
    }, []);
  

  return (
    <div className="data-visualizations">
      {/* breadcrumb (like your electricity page) */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>{' '}
        <SlArrowRight /> <span>SmartCitizen (Dublin)</span>
      </div>
      <div id="map-derv" style={{ height: 500, width: '100%' }} />

      {/* selectors */}
      <div className="selectors-container">
        <div className="selectors" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="select-box" style={{ minWidth: 240 }}>
            <label>Measure:</label>
            <Select
              isClearable={false}
              options={MEASURE_OPTIONS}
              value={MEASURE_OPTIONS.find(o => o.value === measure)}
              onChange={(opt) => { 
                dispatch(setSCMeasure(opt.value)); 
                dispatch(resetSCStatus()); 
              }}
            />
          </div>

          <div className="select-box">
            <label>Start Time:</label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={startDate}
              onChange={setStartDate}
              style={{ width: 260 }}
            />
          </div>
          <div className="select-box">
            <label>End Time:</label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={endDate}
              onChange={setEndDate}
              style={{ width: 260 }}
            />
          </div>

          <div className="select-box">
            <label>Interval:</label>
            <select
              value={interval}
              onChange={(e) => dispatch(setSCTimeRange({ interval: e.target.value }))}
              style={{ height: 36, padding: '0 8px' }}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>

        <button className="confirm-button" onClick={handleConfirm}>
          Confirm
        </button>
      </div>

      {/* status messages (same tone) */}
      {loading && <p>Loading data…</p>}
      {error && <p>Error: {String(error)}</p>}
      {message && !rows.length && <p>{message}</p>}
      {!loading && !error && !rows.length && !message && (
        <p>Please select a time range to display metrics.</p>
      )}

      {/* table + chart + paginator */}
      {rows.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <SmartCitizenTable
              data={tablePage}
              columns={[{ key: 'time', label: 'Timestamp' }, { key: 'value', label: `${label || measure}${unit ? ` (${unit})` : ''}` }]}
            />
            <ElectricityChart chartData={chartData} />
          </div>

          <Paginator
            first={first}
            rows={rowsPerPage}
            totalRecords={rows.length}
            rowsPerPageOptions={[24, 48, 96]}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

/** Simple table matching your electricity table feel */
function SmartCitizenTable({ data, columns }) {
  return (
    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.time}>
              <td>{row.time}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
