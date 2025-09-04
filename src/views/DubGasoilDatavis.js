// src/pages/DubGasoilDatavis.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';

import ElectricityChart from '../components/ElectricityChart'; // generic, takes chartData + title
import ElectricityTable from '../components/ElectricityTable'; // generic, takes data + columns
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';

import { fetchDubGasoilData } from '../reducers/dubGasoilSlice';
import { makeFieldOptions } from '../utils/fieldOptions';

const colorPalette = [
  '#36A2EB', '#4BC0C0', '#FF6384', '#FF9F40',
  '#9966FF', '#FFCD56', '#8DD17E', '#B47CC7',
];

const DubGasoilDatavis = () => {
  // default: last 3 years window like other monthly series (adjust if you want)
  const [end,   setEnd]   = useState(() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; });
  const [start, setStart] = useState(() => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - 3, d.getUTCMonth(), d.getUTCDate()); d.setUTCHours(0,0,0,0); return d; });

  const [first, setFirst] = useState(0);
  const [rows,  setRows]  = useState(12);
  const [fields, setFields] = useState([]); // selected metrics

  const dispatch = useDispatch();
  const { data = [], loading = false, error = null } =
    useSelector((s) => s.dubGasoil || {});

  // Build day-boundary ISO strings (inclusive range)
  const isoDay = (d, endOfDay) =>
    d.toISOString().split('T')[0] + (endOfDay ? 'T23:59:59Z' : 'T00:00:00Z');

  const handleFetch = () => {
    dispatch(fetchDubGasoilData({
      startTime: isoDay(start, false),
      endTime  : isoDay(end,   true),
    }));
  };

  // Satellite map of Dublin (same coords as your Dublin Gas page)
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = { lat: 53.294333406031576, lng: -6.134340637034364 };
      const map = new g.maps.Map(document.getElementById('map-gasoil'), {
        center,
        zoom: 18,
        mapTypeId: g.maps.MapTypeId.SATELLITE,
      });
      new g.maps.Marker({ map, position: center, title: 'Dublin Gasoil' });
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

  // Multi-select options from first row (exclude meter_point & timestamp)
  const allOptions = data.length ? makeFieldOptions(data[0]) : [];
  const fieldOptions = allOptions.filter(o => o.value !== 'meter_point');

  // Default selected fields after first fetch (pick 2–3 sensible defaults)
  useEffect(() => {
    if (data.length && !fields.length) {
      const defaults = fieldOptions
        .map(o => o.value)
        .filter(v =>
          ['Average_Daily_Total_KWHS', 'Average_Daily_Carbon_KG', 'Average_Daily_Day_KWHS', 'Average_Daily_Night_KWHS'].includes(v)
        );
      setFields(defaults.length ? defaults : fieldOptions.slice(0, 3).map(o => o.value));
    }
  }, [data, fieldOptions, fields.length]);

  // Paging
  const paged = data.slice(first, first + rows);

  // Chart datasets from selected fields
  const chartData = {
    labels: paged.map(r => r.timestamp),
    datasets: fields.map((f, i) => {
      const c = colorPalette[i % colorPalette.length];
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
    <div className="data-visualizations">
      {/* breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/">Data Visualizations</a>
        <SlArrowRight /> <span>Dublin – Gasoil</span>
      </div>

      {/* map */}
      <div id="map-gasoil" style={{ height: 500, width: '100%' }} />

      {/* date pickers */}
      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box">
            <label>Start:</label>
            <DatePicker format="yyyy-MM-dd" value={start} onChange={setStart} />
          </div>
          <div className="select-box">
            <label>End:</label>
            <DatePicker format="yyyy-MM-dd" value={end} onChange={setEnd} />
          </div>
        </div>
        <button className="confirm-button" onClick={handleFetch}>Confirm</button>
      </div>

      {/* field selector */}
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
      {!loading && !error && data.length === 0 && <p>No measurements in the chosen time window.</p>}
      {loading && <p>Loading…</p>}
      {error   && <p>Error: {JSON.stringify(error)}</p>}

      {/* results */}
      {data.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <ElectricityTable data={paged} columns={fields} />
            <ElectricityChart chartData={chartData} title="Gasoil – Selected Metrics" />
          </div>
          <Paginator
            first={first}
            rows={rows}
            totalRecords={data.length}
            rowsPerPageOptions={[6, 12, 24]}
            onPageChange={(e) => { setFirst(e.first); setRows(e.rows); }}
          />
        </div>
      )}
    </div>
  );
};

export default DubGasoilDatavis;
