// src/pages/DubElectricityDatavis.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';
import ElectricityChart from '../components/ElectricityChart';
import ElectricityTable from '../components/ElectricityTable';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import { fetchDubElectricityData } from '../reducers/dubElectricitySlice'; // ← unchanged
import { makeFieldOptions } from '../utils/fieldOptions';
import { useLocation, useNavigate } from "react-router-dom";

const DubElectricityDatavis = () => {
  /* ───────── local UI state ───────── */
  const [startTime, setStartTime] = useState(new Date());
  const [endTime,   setEndTime]   = useState(new Date());
  const [first,     setFirst]     = useState(0);
  const [rows,      setRows]      = useState(6);
  const [map,       setMap]       = useState(null);
  const [fields,    setFields]    = useState([]);          // chosen columns
   const location = useLocation();
    const navigate = useNavigate();
     const labName = location.state?.labName;

  /* ───────── redux ───────── */
  const dispatch = useDispatch();
  const {
    data    = [],     // fallback so .slice never crashes
    loading = false,
    error   = null,
  } = useSelector((state) => state.dubElectricity || {});

  /* ───────── helpers ───────── */
  const toISO = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(
      d.getUTCMinutes()
    ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}Z`;

  const handleFetch = () =>
    dispatch(
      fetchDubElectricityData({ startTime: toISO(startTime), endTime: toISO(endTime) })
    );

  /* ───────── pagination ───────── */
  const paginatedData = data.slice(first, first + rows);
  const onPageChange  = (e) => {
    setFirst(e.first);
    setRows(e.rows);
  };

  /* ───────── default columns once data arrives ───────── */
  useEffect(() => {
    if (data.length && fields.length === 0) {
      setFields(['Average_Daily_Day_KWHS', 'Average_Daily_Night_KWHS']);
    }
  }, [data, fields.length]);

  /* ───────── select options + chart datasets ───────── */
  const fieldOptions = data.length ? makeFieldOptions(data[0]) : [];

  const colorPalette = [
  '#36A2EB', // blue
  '#4BC0C0', // teal
  '#FF6384', // pink
  '#FF9F40', // orange
  '#9966FF', // purple
  '#FFCD56', // yellow
  '#8DD17E', // green
  '#B47CC7', // violet
];

  const chartData = {
    labels: paginatedData.map((r) => r.timestamp),
    datasets: fields.map((f, i) => {
  const colour = colorPalette[i % colorPalette.length];
  return {
    label: f.replace(/_/g, ' '),
    data:  paginatedData.map(r => r[f]),
    borderColor: colour,
    backgroundColor: colour,
    fill: false,
    pointRadius: 3,
    spanGaps: true,
  };
}),
  };

  /* ───────── Google Map (runs once) ───────── */
  useEffect(() => {
    if (map) return;

    const initMap = () => {
      const google = window.google;
      const center = { lat: 53.294333406031576, lng:  -6.134340637034364 };
      const m = new google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 18,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
      });
      new google.maps.Marker({ map: m, position: center, title: 'Dublin' });
      setMap(m);
    };

    if (!window.google) {
      const s = document.createElement('script');
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places';
      s.async = true;
      s.defer = true;
      s.onload = initMap;
      document.head.appendChild(s);
    } else {
      initMap();
    }
  }, [map]);

  /* ───────── JSX ───────── */
  return (
    <div className="data-visualizations">
      {/* ▸ breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight />{" "}
                <a href="/labs">Data Visualizations</a> <SlArrowRight />{" "}
                {labName && (
                  <>
                    <span
                      onClick={() => navigate(-1)}
                      style={{ cursor: "pointer" }}
                    >
                      {labName}
                    </span>{" "}
                    <SlArrowRight />{" "}
                  </>
                )}
                <span>Dublin Electricity</span>
      </div>

      <div id="map" style={{ height: 500, width: '100%' }} />

      {/* ▸ date pickers + confirm */}
      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box">
            <label>Start Time:</label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={startTime}
              onChange={setStartTime}
              style={{ width: 260 }}
            />
          </div>
          <div className="select-box">
            <label>End Time:</label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={endTime}
              onChange={setEndTime}
              style={{ width: 260 }}
            />
          </div>
        </div>
        <button className="confirm-button" onClick={handleFetch}>
          Confirm
        </button>
      </div>

      {/* ▸ field selector (after data load) */}
      {data.length > 0 && (
        <div style={{ maxWidth: 420, margin: '12px 0' }}>
          <Select
            isMulti
            placeholder="Select field(s)…"
            options={fieldOptions}
            value={fieldOptions.filter((o) => fields.includes(o.value))}
            onChange={(vals) => setFields(vals.map((v) => v.value))}
          />
        </div>
      )}

      {/* ▸ Google map */}
      

      {/* ▸ status messages */}
      {loading && <p>Loading data…</p>}
      {error && <p>Error: {JSON.stringify(error)}</p>}

      {/* ▸ table + chart + paginator */}
      {data.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <ElectricityTable data={paginatedData} columns={fields} />
            <ElectricityChart chartData={chartData} />
          </div>
          <Paginator
            first={first}
            rows={rows}
            totalRecords={data.length}
            rowsPerPageOptions={[6, 12, 24]}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default DubElectricityDatavis;
