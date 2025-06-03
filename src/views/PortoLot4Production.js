import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import ElectricityChart from '../components/ElectricityChart';
import ElectricityTable from '../components/ElectricityTable';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from 'react-icons/sl';
import { fetchLot4Production } from '../reducers/portoLot4ProductionSlice';
import Select from 'react-select';

const PortoLot4Production = () => {
  /* ───── default last 90 days ───── */
  const [end,   setEnd]   = useState(() => { const d=new Date(); d.setUTCHours(0,0,0,0); return d; });
  const [start, setStart] = useState(() => new Date(end.getTime() - 90*24*60*60*1000));
  const [first, setFirst] = useState(0);
  const [rows,  setRows]  = useState(12);
  const [fields,setFields]= useState(['kW']);

  const dispatch = useDispatch();
  const { data=[], loading=false, error=null } =
    useSelector((s) => s.lot4Production || {});

  /* ───── full-day ISO helpers ───── */
  const isoDay = (d, endOfDay) =>
    d.toISOString().split('T')[0] + (endOfDay ? 'T23:59:59Z' : 'T00:00:00Z');

  const handleFetch = () =>
    dispatch(fetchLot4Production({
      startTime: isoDay(start, false),
      endTime  : isoDay(end,   true),
    }));

  /* ───── Google Map (satellite) ───── */
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = { lat: 41.23629363691908, lng: -8.640874989443377 };
      const map   = new g.maps.Map(document.getElementById('map-lot4'), {
        center, zoom: 18, mapTypeId: g.maps.MapTypeId.SATELLITE,
      });
      new g.maps.Marker({ map, position: center, title: 'Porto Lot 4' });
    };

    if (!window.google || !window.google.maps) {
      const s = document.createElement('script');
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places';
      s.async = true; s.defer = true; s.onload = init;
      document.head.appendChild(s);
    } else { init(); }
  }, []);

  /* ───── chart data ───── */
  const paged = data.slice(first, first + rows);
  const chartData = {
    labels: paged.map(r => r.timestamp),
    datasets: fields.map((f) => ({
      label: f,
      data : paged.map(r => r[f]),
      borderColor:'#36A2EB',
      backgroundColor:'#36A2EB',
      fill:false, pointRadius:3, spanGaps:true,
    })),
  };

  return (
    <div className="data-visualizations">
      {/* breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>
        <SlArrowRight /> <span>Porto Lot 4 – Electricity Production</span>
      </div>

      {/* map */}
      <div id="map-lot4" style={{ height: 500, width: '100%' }} />

      {/* date pickers */}
      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box">
            <label>Start:</label>
            <DatePicker format="yyyy-MM-dd" value={start} onChange={setStart} />
          </div>
          <div className="select-box">
            <label>End:</label>
            <DatePicker format="yyyy-MM-dd" value={end}   onChange={setEnd} />
          </div>
        </div>
        <button className="confirm-button" onClick={handleFetch}>Confirm</button>
      </div>

      {/* status / no-rows */}
      {loading && <p>Loading…</p>}
      {error   && <p>Error: {JSON.stringify(error)}</p>}

      {/* results */}
      {data.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <ElectricityTable data={paged} columns={fields} />
            <ElectricityChart chartData={chartData} title="Electricity Production (kW)" />
          </div>
          <Paginator
            first={first} rows={rows} totalRecords={data.length}
            onPageChange={(e)=>{ setFirst(e.first); setRows(e.rows); }}
          />
        </div>
      )}
    </div>
  );
};

export default PortoLot4Production;
