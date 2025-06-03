import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';
import ElectricityChart   from '../components/ElectricityChart';
import ElectricityTable   from '../components/ElectricityTable';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import { fetchLot2Consumption } from '../reducers/portoLot2ConsumptionSlice'; // ← unchanged
import { makeFieldOptions } from '../utils/fieldOptions';

const colors = [
  '#36A2EB', '#FF9F40', '#4BC0C0', '#FF6384',
  '#9966FF', '#8DD17E', '#B47CC7', '#FFCD56',
];

const PortoLot2Datavis = () => {
  /* ─────────────── default range = last 30 calendar days ─────────────── */
  const [end,   setEnd]   = useState(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);          // today at 00:00 UTC
    return d;
  });
  const [start, setStart] = useState(() =>
    new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  );

  const [first,  setFirst]  = useState(0);
  const [rows,   setRows]   = useState(12);
  const [fields, setFields] = useState([]);

  /* ─────────────── redux ─────────────── */
  const dispatch = useDispatch();
  const { data = [], loading = false, error = null } =
    useSelector((s) => s.lot2Consumption || {});

  /* ─────────────── helpers ─────────────── */
  const toDayStartIso = (d) => {
    const t = new Date(d); t.setUTCHours(0, 0, 0, 0); return t.toISOString();
  };
  const toDayEndIso = (d) => {
    const t = new Date(d); t.setUTCHours(23, 59, 59, 999); return t.toISOString();
  };

  const fetchData = () => {
    const startIso = toDayStartIso(start);
    const endIso   = toDayEndIso(end);
    console.log('[Lot2] fetching', startIso, '→', endIso);
    dispatch(fetchLot2Consumption({ startTime: startIso, endTime: endIso }));
  };

  const paged        = data.slice(first, first + rows);
  const fieldOptions = data.length ? makeFieldOptions(data[0]) : [];

  useEffect(() => {
    if (data.length && !fields.length) {
      const def = fieldOptions[0]?.value;
      if (def) setFields([def]);
    }
  }, [data, fieldOptions, fields.length]);

  const chartData = {
    labels: paged.map((r) => r.timestamp),
    datasets: fields.map((f, i) => ({
      label: f.replace(/_/g, ' '),
      data:  paged.map((r) => r[f]),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length],
      fill: false,
      pointRadius: 3,
      spanGaps: true,
    })),
  };

  /* ─────────────── Google Map ─────────────── */
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = { lat: 41.23629363691908, lng: -8.640874989443377 };
      new g.maps.Map(document.getElementById('map-lot2'), {
        center, zoom: 18, mapTypeId: g.maps.MapTypeId.SATELLITE,
      });
      new g.maps.Marker({ map: g.maps.Map, position: center, title: 'Porto Lot 2' });
    };

    if (!window.google || !window.google.maps) {
      const s = document.createElement('script');
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places';
      s.async = true; s.defer = true; s.onload = init; document.head.appendChild(s);
    } else { init(); }
  }, []);

  /* ─────────────── JSX ─────────────── */
  return (
    <div className="data-visualizations">
      {/* breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>{' '}
        <SlArrowRight /> <span>Porto Lot 2 – Energy</span>
      </div>

      {/* map */}
      <div id="map-lot2" style={{ height: 500, width: '100%' }} />

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
        <button className="confirm-button" onClick={fetchData}>Confirm</button>
      </div>

      {/* field selector */}
      {data.length > 0 && (
        <div style={{ maxWidth: 420, margin: '12px 0' }}>
          <Select
            isMulti
            options={fieldOptions}
            placeholder="Select field(s)…"
            value={fieldOptions.filter(o => fields.includes(o.value))}
            onChange={(vals) => setFields(vals.map(v => v.value))}
          />
        </div>
      )}

      {/* status */}
      {loading && <p>Loading…</p>}
      {error   && <p>Error: {JSON.stringify(error)}</p>}

      {/* table + chart + paginator */}
      {data.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <ElectricityTable data={paged} columns={fields} />
            <ElectricityChart chartData={chartData} title="Total Consumption (kW)" />
          </div>
          <Paginator
            first={first}
            rows={rows}
            totalRecords={data.length}
            onPageChange={(e) => { setFirst(e.first); setRows(e.rows); }}
          />
        </div>
      )}
    </div>
  );
};

export default PortoLot2Datavis;
