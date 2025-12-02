import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
import { DatePicker } from 'rsuite';
import { SlArrowRight } from 'react-icons/sl';

import MultiTableComponent from '../components/MultiTablecomponent';
import MultiGraphComponent from '../components/MultiGraphComponent';

import influxReducer, {
  fetchMeasurements,
  fetchSeries,
  toISO,
} from '../reducers/influxExplorerDirectSlice';
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

const LoadingOverlay = ({ text = "Loading InfluxDB data..." }) => {
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

const InfluxExplorer = () => {
  const dispatch = useDispatch();
  const { dbs, measurementsByDb, series, seriesLabel, loading, error } =
    useSelector(s => s.influx);

  const [db, setDb] = useState('porto_lot_2');
  const [measurement, setMeasurement] = useState(null);
  const [start, setStart] = useState(new Date(Date.now() - 7*24*3600*1000));
  const [end, setEnd] = useState(new Date());
  const [hasQueried, setHasQueried] = useState(false);

  // popup state
  const [popupOpen, setPopupOpen]       = useState(false);
  const [popupTitle, setPopupTitle]     = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType]       = useState('info');

  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;

  const openPopup = (title, message, type = 'info') => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupOpen(true);
  };

  // load measurements when DB changes
  useEffect(() => {
    if (db) {
      dispatch(fetchMeasurements({ db }));
    }
  }, [db, dispatch]);

  const measOptions = (measurementsByDb[db] || []).map(m => ({
    value: m,
    label: m,
  }));

  const onConfirm = () => {
    if (!db) {
      openPopup(
        'Database required',
        'Please select a database before querying the measurements.',
        'warning'
      );
      return;
    }

    if (!measurement) {
      openPopup(
        'Measurement required',
        'Please select a measurement before querying data.',
        'warning'
      );
      return;
    }

    if (!start || !end) {
      openPopup(
        'Missing time range',
        'Please select both a start time and an end time before confirming.',
        'warning'
      );
      return;
    }

    if (start > end) {
      openPopup(
        'Invalid time range',
        'The start time cannot be after the end time. Please correct the range and try again.',
        'warning'
      );
      return;
    }

    setHasQueried(true);

    const payload = {
      db,
      measurement: measurement.value,
      startISO: toISO(start),
      endISO: toISO(end),
      groupInterval: '1h',
    };

    console.log('[InfluxExplorer] Fetch series payload:', payload);

    dispatch(fetchSeries(payload))
      .unwrap()
      .then((result) => {
        console.log('[InfluxExplorer] Series request succeeded:', result);

        const points = Array.isArray(result)
          ? result
          : Array.isArray(result?.series)
          ? result.series
          : [];

        if (points.length === 0) {
          openPopup(
            'No data for this period',
            'No time-series points were found for the selected measurement and time range.\n\nTry a wider period or another measurement.',
            'info'
          );
        }
      })
      .catch((err) => {
        console.error('[InfluxExplorer] Series request failed:', err);
        openPopup(
          'Failed to load data',
          'Something went wrong while loading the series from InfluxDB.\n\nPlease try again in a moment. If the problem persists, contact the administrator.',
          'error'
        );
      });
  };

  // map init (Porto Lot 4)
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = { lat: 41.23629363691908, lng: -8.640874989443377 };
      const map   = new g.maps.Map(document.getElementById('map-lot4'), {
        center,
        zoom: 18,
        mapTypeId: g.maps.MapTypeId.SATELLITE,
      });
      new g.maps.Marker({ map, position: center, title: 'Porto Lot 4' });
    };

    if (!window.google || !window.google.maps) {
      const s = document.createElement('script');
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places';
      s.async = true;
      s.defer = true;
      s.onload = init;
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
      {/* global loading overlay */}
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
          Porto all lots data
        </span>
      </div>

      {/* map */}
      <div
        id="map-lot4"
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
        <div
          className="selectors"
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
        >
          <div className="select-box" style={{ minWidth: 260 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: '#475569',
              }}
            >
              Database
            </label>
            <Select
              value={db ? { value: db, label: db } : null}
              onChange={opt => {
                setDb(opt.value);
                setMeasurement(null);
              }}
              options={dbs.map(d => ({ value: d, label: d }))}
              placeholder="Select a database…"
            />
          </div>

          <div className="select-box" style={{ minWidth: 300 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: '#475569',
              }}
            >
              Measurement
            </label>
            <Select
              value={measurement}
              onChange={setMeasurement}
              options={measOptions}
              isLoading={loading && !measurementsByDb[db]}
              placeholder="Choose a measurement…"
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
              Start Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={start}
              onChange={(value) => value && setStart(value)}
              style={{ width: 220 }}
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
              End Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={end}
              onChange={(value) => value && setEnd(value)}
              style={{ width: 220 }}
            />
          </div>
        </div>

        <button
          className="confirm-button"
          onClick={onConfirm}
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

      {/* error banner */}
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
          Error: {error.message ? error.message : String(error)}
        </div>
      )}

      {/* friendly no-data message */}
      {!loading && !error && hasQueried && series.length === 0 && (
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
          <strong style={{ fontWeight: 600 }}>No time-series points</strong>{' '}
          were returned for this measurement and time range. Try expanding the
          window or choosing a different measurement.
        </div>
      )}

      {/* results */}
      {series.length > 0 && (
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
            {/* you can plug MultiTableComponent here later if you like */}
            <MultiGraphComponent
              data={series}
              label={`${measurement?.value ?? ''} — ${seriesLabel}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluxExplorer;
