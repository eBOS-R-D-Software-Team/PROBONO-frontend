import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import ElectricityChart from '../components/ElectricityChart';
import { fetchSmartCitizenData, setSCMeasure, setSCTimeRange, resetSCStatus } from '../reducers/smartcitizenSlice';
import { useLocation, useNavigate } from "react-router-dom";

/* ───────── shared UI helpers (Popup + LoadingOverlay) ───────── */

const Popup = ({ open, title, message, type = "info", onClose }) => {
  if (!open) return null;

  const typeColors = {
    info:    { dot: '#38bdf8', title: '#e5e7eb' },
    warning: { dot: '#facc15', title: '#fef9c3' },
    error:   { dot: '#f97373', title: '#fee2e2' },
  };

  const colors = typeColors[type] || typeColors.info;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: '#0b1120',
          borderRadius: 16,
          padding: '18px 22px',
          maxWidth: 420,
          width: '90%',
          boxShadow:
            '0 18px 45px rgba(15,23,42,0.7), 0 0 0 1px rgba(148,163,184,0.3)',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 10,
            gap: 10,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '999px',
              background: colors.dot,
              boxShadow: `0 0 12px ${colors.dot}`,
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: colors.title,
            }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            margin: '4px 0 16px',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#cbd5f5',
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              background:
                type === 'error'
                  ? 'linear-gradient(135deg,#f97373,#fb7185)'
                  : 'linear-gradient(135deg,#22c55e,#4ade80)',
              color: '#0b1120',
              boxShadow:
                '0 8px 18px rgba(15,23,42,0.5), 0 0 0 1px rgba(15,23,42,0.9)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingOverlay = ({ text = "Loading sensor data..." }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        backdropFilter: 'blur(1px)',
      }}
    >
      <div
        style={{
          background: '#020617',
          padding: '14px 18px',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow:
            '0 16px 40px rgba(15,23,42,0.8), 0 0 0 1px rgba(148,163,184,0.5)',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '999px',
            border: '2px solid rgba(148,163,184,0.4)',
            borderTopColor: '#38bdf8',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{text}</span>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/* ───────── main component ───────── */

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
];

const toISO = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(
    d.getUTCMinutes()
  ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}Z`;

const fromISO = (s) => {
  try { return new Date(s); } catch { return new Date(); }
};

export default function SmartCitizenDatavis() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;
  
  // Redux state
  const {
    startTime, endTime, interval,
    measure, label, unit,
    rows, loading, error, message
  } = useSelector((state) => state.smartcitizen || {});

  // Local UI state
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(48); 
  const [startDate, setStartDate] = useState(fromISO(startTime));
  const [endDate,   setEndDate]   = useState(fromISO(endTime));
  const [hasQueried, setHasQueried] = useState(false);

  // Popup state
  const [popupOpen, setPopupOpen]       = useState(false);
  const [popupTitle, setPopupTitle]     = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType]       = useState('info');

  const openPopup = (title, msg, type = 'info') => {
    setPopupTitle(title);
    setPopupMessage(msg);
    setPopupType(type);
    setPopupOpen(true);
  };

  // Keep pickers in sync
  useEffect(() => { setStartDate(fromISO(startTime)); }, [startTime]);
  useEffect(() => { setEndDate(fromISO(endTime)); }, [endTime]);

  // Handle Confirm
  const handleConfirm = () => {
    if (!startDate || !endDate) {
      openPopup('Missing date range', 'Please select both a start date and an end date.', 'warning');
      return;
    }
    if (startDate > endDate) {
      openPopup('Invalid date range', 'The start date cannot be after the end date.', 'warning');
      return;
    }

    setHasQueried(true);
    const sISO = toISO(startDate);
    const eISO = toISO(endDate);
    
    dispatch(setSCTimeRange({ startTime: sISO, endTime: eISO, interval }));
    
    dispatch(fetchSmartCitizenData({ startTime: sISO, endTime: eISO, measure, interval }))
      .unwrap?.()
      .then((res) => {
        const resultRows = res?.rows || res || [];
        if (!resultRows.length) {
          openPopup('No data found', 'No sensor readings found for this specific time range/measure.', 'info');
        }
      })
      .catch((err) => {
        console.error(err);
        openPopup('Request failed', 'Could not fetch SmartCitizen data.', 'error');
      });
  };

  // Auto fetch on mount
  useEffect(() => {
    if (!rows || rows.length === 0) {
      dispatch(fetchSmartCitizenData({ startTime, endTime, measure, interval }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination
  const tablePage = useMemo(() => rows.slice(first, first + rowsPerPage), [rows, first, rowsPerPage]);
  const onPageChange = (e) => { setFirst(e.first); setRowsPerPage(e.rows); };

  // Chart data
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

  // Map
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
    <div 
      className="data-visualizations"
      style={{
        padding: '16px 18px',
        borderRadius: 18,
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.09), transparent 55%), radial-gradient(circle at bottom right, rgba(52,211,153,0.08), transparent 55%)',
      }}
    >
      {/* global loading */}
      {loading && <LoadingOverlay />}

      {/* popup */}
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopupOpen(false)}
      />

      {/* breadcrumb */}
      <div className="breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 14,
          fontSize: 13,
        }}
      >
        <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</a>
        <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
        <a href="/labs" style={{ color: '#64748b', textDecoration: 'none' }}>Data Visualizations</a>
        {labName && (
          <>
            <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
            <span
              onClick={() => navigate(-1)}
              style={{ cursor: "pointer", color: '#0f766e', fontWeight: 500 }}
            >
              {labName}
            </span>
          </>
        )}
        <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Dublin SmartCitizen visualization</span>
      </div>

      {/* map */}
      <div 
        id="map-derv" 
        style={{ 
          height: 500, 
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.35)',
          marginBottom: 20,
        }} 
      />

      {/* selectors */}
      <div 
        className="selectors-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div className="selectors" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          
          <div className="select-box" style={{ minWidth: 200 }}>
             <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#475569' }}>
               Measure
             </label>
             <Select
               isClearable={false}
               options={MEASURE_OPTIONS}
               value={MEASURE_OPTIONS.find(o => o.value === measure)}
               onChange={(opt) => { 
                 dispatch(setSCMeasure(opt.value)); 
                 dispatch(resetSCStatus()); 
               }}
               styles={{ control: (base) => ({ ...base, minHeight: 38, borderRadius: 6, borderColor: '#e5e7eb' }) }}
             />
          </div>

          <div className="select-box">
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#475569' }}>
              Start Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={startDate}
              onChange={setStartDate}
              style={{ width: 220 }}
            />
          </div>

          <div className="select-box">
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#475569' }}>
              End Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={endDate}
              onChange={setEndDate}
              style={{ width: 220 }}
            />
          </div>

          <div className="select-box">
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#475569' }}>
              Interval
            </label>
            <select
              value={interval}
              onChange={(e) => dispatch(setSCTimeRange({ interval: e.target.value }))}
              style={{ 
                height: 38, 
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: 'white',
                color: '#333'
              }}
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>

        <button 
          className="confirm-button" 
          onClick={handleConfirm}
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a',
            background: 'linear-gradient(135deg, #22c55e, #4ade80, #22c55e)',
            boxShadow: '0 12px 25px rgba(34,197,94,0.45), 0 0 0 1px rgba(21,128,61,0.5)',
            whiteSpace: 'nowrap',
            height: 38,
          }}
        >
          Confirm
        </button>
      </div>

      {/* error banner */}
      {error && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.4)',
          color: '#b91c1c',
          fontSize: 13,
        }}>
          Error: {String(error)}
        </div>
      )}

      {/* friendly no-rows message */}
      {!loading && !error && !rows.length && (
        <div className="no-data-message"
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px dashed rgba(148,163,184,0.7)',
            background: 'rgba(248,250,252,0.9)',
            fontSize: 13,
            color: '#334155',
          }}
        >
          {message || 'No data available. Please select a time range and click Confirm.'}
        </div>
      )}

      {/* table + chart + paginator */}
      {rows.length > 0 && (
        <div className="visualization-container"
          style={{
            marginTop: 8,
            borderRadius: 18,
            padding: 16,
            background: 'rgba(248,250,252,0.96)',
            boxShadow: '0 18px 40px rgba(15,23,42,0.22), 0 0 0 1px rgba(148,163,184,0.4)',
          }}
        >
          <div className="table-graph-container" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', 
              gap: 16,
              marginBottom: 12,
            }}
          >
            <SmartCitizenTable
              data={tablePage}
              columns={[{ key: 'time', label: 'Timestamp' }, { key: 'value', label: `${label || measure}${unit ? ` (${unit})` : ''}` }]}
            />
            <div>
              <ElectricityChart chartData={chartData} title={`${label || measure}`} />
              {/* Contextual diagram for Particle Matter if relevant */}
              {(measure.includes('pm')) && (
                 <div style={{marginTop: 10, fontSize: 11, color: '#64748b', textAlign: 'center'}}>
                    

[Image of particle size comparison PM2.5 vs PM10 vs human hair]

                 </div>
              )}
            </div>
          </div>

          <div className="paginator-container" style={{ marginTop: 8 }}>
            <Paginator
              first={first}
              rows={rowsPerPage}
              totalRecords={rows.length}
              rowsPerPageOptions={[12, 24, 48]}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Simple table styled to match */
function SmartCitizenTable({ data, columns }) {
  return (
    <div className="table-wrapper" style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'sans-serif' }}>
        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.time} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>{row.time}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontWeight: 500 }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}