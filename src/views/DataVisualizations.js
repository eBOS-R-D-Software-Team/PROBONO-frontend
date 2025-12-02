import React, { useState, useEffect } from 'react';  
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import GraphComponent from '../components/GraphComponent';
import TableComponent from '../components/Tablecomponent';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from "react-icons/sl";
import { fetchCO2Data } from '../reducers/co2Reducer';
import { useLocation, useNavigate } from "react-router-dom";

const Popup = ({ open, title, message, type = "info", onClose }) => {
  if (!open) return null;

  const typeColors = {
    info:  { dot: '#38bdf8', title: '#e5e7eb' },
    warning: { dot: '#facc15', title: '#fef9c3' },
    error: { dot: '#f97373', title: '#fee2e2' },
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

const LoadingOverlay = ({ text = "Loading CO₂ data..." }) => {
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

      {/* Small inline keyframes so spinner actually spins */}
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

const DataVisualizations = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [map, setMap] = useState(null);
  const [hasQueried, setHasQueried] = useState(false); // track if user clicked Confirm at least once

  // popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('info');

  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;
   
  // Pagination state
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(6); // Default to 6 rows per page

  const dispatch = useDispatch();
  // Use the CO2 slice from Redux Toolkit
  const { data, loading, error } = useSelector(state => state.co2);

  const openPopup = (title, message, type = 'info') => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupOpen(true);
  };

  // Helper: Format date to ISO string (without milliseconds)
  const formatDateToISOWithoutMilliseconds = (date) => {
    const pad = (num) => num.toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  };

  // Fetch data using the redux thunk from our co2Reducer with logging
  const handleFetchData = () => {
    // Basic validation before sending the request
    if (!startTime || !endTime) {
      openPopup(
        'Missing time range',
        'Please select both a start time and an end time before confirming.',
        'warning'
      );
      return;
    }

    if (startTime > endTime) {
      openPopup(
        'Invalid time range',
        'The start time cannot be after the end time. Please correct the time range and try again.',
        'warning'
      );
      return;
    }

    setHasQueried(true);

    const startTimeFormatted = formatDateToISOWithoutMilliseconds(startTime);
    const endTimeFormatted = formatDateToISOWithoutMilliseconds(endTime);
    console.log(
      '[handleFetchData] Sending request with startTime:',
      startTimeFormatted,
      'and endTime:',
      endTimeFormatted
    );

    dispatch(fetchCO2Data({ startTime: startTimeFormatted, endTime: endTimeFormatted }))
      .unwrap()
      .then((result) => {
        console.log('[handleFetchData] Request succeeded. Result:', result);

        // Try to detect if we received no rows and inform the user nicely
        const rowsArray = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];

        if (rowsArray.length === 0) {
          openPopup(
            'No data for this period',
            'No CO₂ data was found for the selected time range.\n\nTry a wider period or a different date range.',
            'info'
          );
        }
      })
      .catch((error) => {
        console.error('[handleFetchData] Request failed:', error);
        openPopup(
          'Failed to load data',
          'Something went wrong while loading the CO₂ data.\n\nPlease try again in a moment. If the problem persists, contact the administrator.',
          'error'
        );
      });
  };

  // Handle pagination change with logging
  const onPageChange = (event) => {
    console.log('[onPageChange] Pagination changed:', event);
    setFirst(event.first);
    setRows(event.rows);
  };

  // Slice the flat data array based on pagination
  const paginatedData = data.slice(first, first + rows);

  // Initialize Google Maps
  useEffect(() => {
    if (!map) {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const google = window.google;
          const targetCoordinates = { lat: 41.23629363691908, lng: -8.640874989443377 };
          const mapOptions = {
            center: targetCoordinates,
            zoom: 16,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
          };
          const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
          new google.maps.Marker({
            position: targetCoordinates,
            map: mapInstance,
            title: "Porto LL",
          });
          console.log('[useEffect] Google Maps loaded successfully.');
          setMap(mapInstance);
        };
        document.head.appendChild(script);
      } else {
        const google = window.google;
        const targetCoordinates = { lat: 41.23629363691908, lng: -8.640874989443377 };
        const mapOptions = {
          center: targetCoordinates,
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
        };
        const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
        new google.maps.Marker({
          position: targetCoordinates,
          map: mapInstance,
          title: "Porto LL",
        });
        console.log('[useEffect] Google Maps already available, map loaded.');
        setMap(mapInstance);
      }
    }
  }, [map]);

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
      {/* Global loading overlay */}
      {loading && <LoadingOverlay />}

      {/* Popup for info/warning/error */}
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopupOpen(false)}
      />

      {/* Breadcrumb section */}
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
          Porto CO₂ emission
        </span>
      </div>

      {/* Filters and Selectors */}
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
          {/* Date/Time pickers */}
          <div className="select-box custom-datetime-picker animate-fade-in">
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
              value={startTime} 
              onChange={(value) => {
                console.log('[DatePicker] Start time changed:', value);
                if (value) {
                  setStartTime(value);
                }
              }}
              style={{ width: 260 }}
            />
          </div>
          <div className="select-box custom-datetime-picker animate-fade-in">
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
              value={endTime} 
              onChange={(value) => {
                console.log('[DatePicker] End time changed:', value);
                if (value) {
                  setEndTime(value);
                }
              }}
              style={{ width: 260 }}
            />
          </div>
        </div>
        <button
          className="confirm-button animate-bounce"
          onClick={handleFetchData}
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

      {/* Google Map Container */}
      <div
        id="map"
        style={{
          height: '500px',
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow:
            '0 18px 40px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.35)',
          marginBottom: 20,
        }}
        className="animate-slide-up map-container"
      ></div>

      {/* Data Visualizations & messages */}
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

      {/* Friendly message when user has queried but there is no data */}
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
          <strong style={{ fontWeight: 600 }}>No CO₂ data</strong> is available for the selected
          time range. Please adjust the dates and click <strong>Confirm</strong> again.
        </div>
      )}

      {data.length > 0 && (
        <div
          className="visualization-container animate-fade-in"
          style={{
            marginTop: 8,
            borderRadius: 18,
            padding: 16,
            background: 'rgba(248,250,252,0.96)',
            boxShadow:
              '0 18px 40px rgba(15,23,42,0.22), 0 0 0 1px rgba(148,163,184,0.4)',
          }}
        >
          {/* Wrap Table and Graph */}
          <div
            className="table-graph-container"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.4fr)',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <TableComponent data={paginatedData} />
            <GraphComponent data={paginatedData} />
          </div>
          {/* Paginator */}
          <div className="paginator-container" style={{ marginTop: 8 }}>
            <Paginator
              first={first}
              rows={rows}
              totalRecords={data.length}
              rowsPerPageOptions={[6, 12, 24]}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualizations;
