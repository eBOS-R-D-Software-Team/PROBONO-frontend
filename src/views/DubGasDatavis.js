import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Select from 'react-select';
import ElectricityChart   from '../components/ElectricityChart';   // reuse
import ElectricityTable   from '../components/ElectricityTable';   // reuse
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import { fetchDubGasData } from '../reducers/dubGasSlice';
import { makeFieldOptions } from '../utils/fieldOptions';

const colorPalette = [
  '#36A2EB', '#4BC0C0', '#FF6384', '#FF9F40',
  '#9966FF', '#FFCD56', '#8DD17E', '#B47CC7',
];

const DubGasDatavis = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime,   setEndTime]   = useState(new Date());
  const [first,     setFirst]     = useState(0);
  const [rows,      setRows]      = useState(6);
  const [map,       setMap]       = useState(null);
  const [fields,    setFields]    = useState([]);

  const dispatch = useDispatch();
  const {
    data    = [],
    loading = false,
    error   = null,
  } = useSelector((s) => s.dubGas || {});

  const toISO = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}T00:00:00Z`;

  const handleFetch = () =>
    dispatch(fetchDubGasData({ startTime: toISO(startTime), endTime: toISO(endTime) }));

  const paginatedData = data.slice(first, first + rows);
  const onPageChange = (e) => { setFirst(e.first); setRows(e.rows); };

  /* default columns once we have data */
  useEffect(() => {
    if (data.length && !fields.length) {
      setFields(['Average_Daily_Total_KWHS', 'Average_Daily_Carbon_KG']);
    }
  }, [data, fields.length]);

  const fieldOptions = data.length ? makeFieldOptions(data[0]) : [];

  const chartData = {
    labels: paginatedData.map((r) => r.timestamp),
    datasets: fields.map((f, i) => {
      const c = colorPalette[i % colorPalette.length];
      return {
        label: f.replace(/_/g, ' '),
        data:  paginatedData.map((r) => r[f]),
        borderColor: c,
        backgroundColor: c,
        fill: false,
        pointRadius: 3,
        spanGaps: true,
      };
    }),
  };

  /* load Google map once */
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

  return (
    <div className="data-visualizations">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/">Data Visualizations</a>{' '}
        <SlArrowRight /> <span>Dublin Gas</span>
      </div>

      {/* map */}
      <div id="map" style={{ height: 500, width: '100%' }} />

      {/* date pickers */}
      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box">
            <label>Start&nbsp;Date:</label>
            <DatePicker format="yyyy-MM-dd" value={startTime} onChange={setStartTime} />
          </div>
          <div className="select-box">
            <label>End&nbsp;Date:</label>
            <DatePicker format="yyyy-MM-dd" value={endTime} onChange={setEndTime} />
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
            placeholder="Select field(s)…"
            value={fieldOptions.filter((o) => fields.includes(o.value))}
            onChange={(vals) => setFields(vals.map((v) => v.value))}
          />
        </div>
      )}

    

      {/* status */}
      {loading && <p>Loading…</p>}
      {error && <p>Error: {JSON.stringify(error)}</p>}

      {/* results */}
      {data.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <ElectricityTable data={paginatedData} columns={fields} />
            <ElectricityChart chartData={chartData} title="Gas Usage Over Time (kWh)" />
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

export default DubGasDatavis;
