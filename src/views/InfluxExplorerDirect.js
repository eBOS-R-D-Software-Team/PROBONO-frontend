import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
import { DatePicker } from 'rsuite';
import { SlArrowRight } from 'react-icons/sl';

import MultiTableComponent from '../components/MultiTablecomponent';
import MultiGraphComponent from '../components/MultiGraphComponent';

import influxReducer, { fetchMeasurements, fetchSeries, toISO } from '../reducers/influxExplorerDirectSlice';

const InfluxExplorer = () => {
  const dispatch = useDispatch();
  const { dbs, measurementsByDb, series, seriesLabel, loading, error } = useSelector(s => s.influx);

  const [db, setDb] = useState('porto_lot_2');
  const [measurement, setMeasurement] = useState(null);
  const [start, setStart] = useState(new Date(Date.now() - 7*24*3600*1000));
  const [end, setEnd] = useState(new Date());

  // load measurements when DB changes
  useEffect(() => {
    if (db) dispatch(fetchMeasurements({ db }));
  }, [db, dispatch]);

  const measOptions = (measurementsByDb[db] || []).map(m => ({ value: m, label: m }));

  const onConfirm = () => {
    if (!db || !measurement) return;
    dispatch(fetchSeries({
      db,
      measurement: measurement.value,
      startISO: toISO(start),
      endISO: toISO(end),
      groupInterval: '1h'
    }));
  };

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

  return (
    <div className="data-visualizations">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a> <SlArrowRight /> <span>Porto Labs Data</span>
      </div>

      <div id="map-lot4" style={{ height: 500, width: '100%' }} />

      <div className="selectors-container">
        <div className="selectors">

          <div className="select-box" style={{ minWidth: 260 }}>
            <label>Database</label>
            <Select
              value={{ value: db, label: db }}
              onChange={opt => { setDb(opt.value); setMeasurement(null); }}
              options={dbs.map(d => ({ value: d, label: d }))}
            />
          </div>

          <div className="select-box" style={{ minWidth: 300 }}>
            <label>Measurement</label>
            <Select
              value={measurement}
              onChange={setMeasurement}
              options={measOptions}
              isLoading={loading && !measurementsByDb[db]}
              placeholder="Choose a measurement…"
            />
          </div>

          <div className="select-box">
            <label>Start Time</label>
            <DatePicker format="yyyy-MM-dd HH:mm:ss" value={start} onChange={setStart} style={{ width: 220 }} />
          </div>
          <div className="select-box">
            <label>End Time</label>
            <DatePicker format="yyyy-MM-dd HH:mm:ss" value={end} onChange={setEnd} style={{ width: 220 }} />
          </div>

        </div>
        <button className="confirm-button" onClick={onConfirm}>Confirm</button>
      </div>

      {/* your Google Map stays as-is */}

      {loading && <p>Loading…</p>}
      {error && <p style={{color:'crimson'}}>Error: {error.message || String(error)}</p>}

      {series.length > 0 && (
        <div className="visualization-container">
          <div className="table-graph-container">
            <MultiGraphComponent data={series} label={`${measurement?.value ?? ''} — ${seriesLabel}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluxExplorer;
