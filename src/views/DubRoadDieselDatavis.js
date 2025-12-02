// src/pages/DubRoadDieselDatavis.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';

import ElectricityChart from '../components/ElectricityChart';  // generic: { chartData, title? }
import ElectricityTable from '../components/ElectricityTable';  // generic: { data, columns }
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';

import { fetchDubRoadDieselData } from '../reducers/dubRoadDieselSlice';
import { makeFieldOptions } from '../utils/fieldOptions';
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

const LoadingOverlay = ({ text = "Loading road diesel data..." }) => {
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

const colors = [
  '#36A2EB', '#4BC0C0', '#FF6384', '#FF9F40',
  '#9966FF', '#FFCD56', '#8DD17E', '#B47CC7',
];

const DubRoadDieselDatavis = () => {
  // default range: last 3 years (date-only)
  const [end,   setEnd]   = useState(() => { const d=new Date(); d.setUTCHours(0,0,0,0); return d; });
  const [start, setStart] = useState(() => { const d=new Date(); d.setUTCFullYear(d.getUTCFullYear()-3, d.getUTCMonth(), d.getUTCDate()); d.setUTCHours(0,0,0,0); return d; });

  const [first,  setFirst]  = useState(0);
  const [rows,   setRows]   = useState(12);
  const [fields, setFields] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);

  // popup state
  const [popupOpen, setPopupOpen]       = useState(false);
  const [popupTitle, setPopupTitle]     = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType]       = useState('info');

  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;

  const dispatch = useDispatch();
  const { data = [], loading = false, error = null } =
    useSelector((s) => s.dubRoadDiesel || {});

  const openPopup = (title, message, type = 'info') => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupOpen(true);
  };

  const isoDay = (d, endOfDay) =>
    d.toISOString().split('T')[0] + (endOfDay ? 'T23:59:59Z' : 'T00:00:00Z');

  const handleFetch = () => {
    if (!start || !end) {
      openPopup(
        'Missing date range',
        'Please select both a start date and an end date before confirming.',
        'warning'
      );
      return;
    }

    if (start > end) {
      openPopup(
        'Invalid date range',
        'The start date cannot be after the end date. Please correct the range and try again.',
        'warning'
      );
      return;
    }

    setHasQueried(true);

    const payload = {
      startTime: isoDay(start, false),
      endTime  : isoDay(end,   true),
    };
    console.log('[DubRoadDieselDatavis] Fetch payload:', payload);

    dispatch(fetchDubRoadDieselData(payload))
      .unwrap()
      .then((result) => {
        console.log('[DubRoadDieselDatavis] Request succeeded. Result:', result);

        const rowsArray = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];

        if (rowsArray.length === 0) {
          openPopup(
            'No data for this period',
            'No road diesel measurements were found for the selected date range.\n\nTry a wider period or a different date range.',
            'info'
          );
        }
      })
      .catch((err) => {
        console.error('[DubRoadDieselDatavis] Request failed:', err);
        openPopup(
          'Failed to load data',
          'Something went wrong while loading the road diesel data.\n\nPlease try again in a moment. If the problem persists, contact the administrator.',
          'error'
        );
      });
  };

  // Google Map (Dublin; satellite)
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

  // multi-select options (exclude meter_point)
  const allOptions   = data.length ? makeFieldOptions(data[0]) : [];
  const fieldOptions = allOptions.filter(o => o.value !== 'meter_point');

  // defaults when data arrives
  useEffect(() => {
    if (data.length && !fields.length) {
      const preferred = ['Average_Daily_Total_KWHS', 'Average_Daily_Carbon_KG'];
      const picked = fieldOptions.map(o => o.value).filter(v => preferred.includes(v));
      setFields(picked.length ? picked : fieldOptions.slice(0, 2).map(o => o.value));
    }
  }, [data, fieldOptions, fields.length]);

  // pagination + chart
  const paged = data.slice(first, first + rows);
  const chartData = {
    labels: paged.map(r => r.timestamp),
    datasets: fields.map((f, i) => {
      const c = colors[i % colors.length];
      return {
        label: f.replace(/_/g, ' '),
        data : paged.map(r => r[f] ?? null),
        borderColor: c,
        backgroundColor: c,
        fill: false,
        pointRadius: 3,
        spanGaps: true,
      };
    }),
  };

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
      <div
        className="breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 14,
          fontSize: 13,
        }}
      >
        <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
          Home
        </a>
        <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
        <a href="/labs" style={{ color: '#64748b', textDecoration: 'none' }}>
          Data Visualizations
        </a>
        {labName && (
          <>
            <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
            <span
              onClick={() => navigate(-1)}
              style={{
                cursor: 'pointer',
                color: '#0f766e',
                fontWeight: 500,
              }}
            >
              {labName}
            </span>
          </>
        )}
        <SlArrowRight style={{ fontSize: 10, color: '#94a3b8' }} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>
          Dublin Road Diesel visualization
        </span>
      </div>

      {/* map */}
      <div
        id="map-derv"
        style={{
          height: 500,
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow:
            '0 18px 40px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.35)',
          marginBottom: 20,
        }}
      />

      {/* date pickers */}
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
          <div className="select-box">
            <label
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: '#475569',
              }}
            >
              Start
            </label>
            <DatePicker
              format="yyyy-MM-dd"
              value={start}
              onChange={(value) => value && setStart(value)}
              style={{ width: 200 }}
            />
          </div>
          <div className="select-box">
            <label
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: '#475569',
              }}
            >
              End
            </label>
            <DatePicker
              format="yyyy-MM-dd"
              value={end}
              onChange={(value) => value && setEnd(value)}
              style={{ width: 200 }}
            />
          </div>
        </div>
        <button
          className="confirm-button"
          onClick={handleFetch}
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a',
            background:
              'linear-gradient(135deg, #22c55e, #4ade80, #22c55e)',
            boxShadow:
              '0 12px 25px rgba(34,197,94,0.45), 0 0 0 1px rgba(21,128,61,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          Confirm
        </button>
      </div>

      {/* metric selector */}
      {data.length > 0 && (
        <div style={{ maxWidth: 420, margin: '12px 0' }}>
          <Select
            isMulti
            options={fieldOptions}
            placeholder="Select metric(s)…"
            value={fieldOptions.filter(o => fields.includes(o.value))}
            onChange={(vals) => setFields(vals.map(v => v.value))}
          />
        </div>
      )}

      {/* statuses */}
      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          Error: {error.message ? error.message : JSON.stringify(error)}
        </div>
      )}

      {!loading && !error && hasQueried && data.length === 0 && (
        <div
          className="no-data-message"
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px dashed rgba(148,163,184,0.7)',
            background: 'rgba(248,250,252,0.9)',
            fontSize: 13,
            color: '#334155',
          }}
        >
          <strong style={{ fontWeight: 600 }}>No road diesel measurements</strong>{' '}
          are available for the selected date range. Please adjust the dates and
          click <strong>Confirm</strong> again.
        </div>
      )}

      {/* results */}
      {data.length > 0 && (
        <div
          className="visualization-container"
          style={{
            marginTop: 8,
            borderRadius: 18,
            padding: 16,
            background: 'rgba(248,250,252,0.96)',
            boxShadow:
              '0 18px 40px rgba(15,23,42,0.22), 0 0 0 1px rgba(148,163,184,0.4)',
          }}
        >
          <div
            className="table-graph-container"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.4fr)',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <ElectricityTable data={paged} columns={fields} />
            <ElectricityChart
              chartData={chartData}
              title="Road Diesel (DERV) – Selected Metrics"
            />
          </div>
          <div className="paginator-container" style={{ marginTop: 8 }}>
            <Paginator
              first={first}
              rows={rows}
              totalRecords={data.length}
              rowsPerPageOptions={[6, 12, 24]}
              onPageChange={(e) => { setFirst(e.first); setRows(e.rows); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DubRoadDieselDatavis;
