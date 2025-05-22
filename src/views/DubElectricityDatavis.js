// src/pages/DubElectricityDatavis.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import ElectricityChart from '../components/ElectricityChart';
import ElectricityTable from '../components/ElectricityTable';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from "react-icons/sl";
import { fetchDubElectricityData } from '../reducers/dubElectricitySlice';

const DubElectricityDatavis = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(6);
  const [map, setMap] = useState(null);

  const dispatch = useDispatch();
  const { data, loading, error } = useSelector(state => state.dubElectricity);

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

  const handleFetchData = () => {
    const startTimeFormatted = formatDateToISOWithoutMilliseconds(startTime);
    const endTimeFormatted = formatDateToISOWithoutMilliseconds(endTime);
    dispatch(fetchDubElectricityData({ startTime: startTimeFormatted, endTime: endTimeFormatted }))
      .unwrap()
      .then((result) => {
        console.log('[Electricity Fetch] Succeeded:', result);
      })
      .catch((error) => {
        console.error('[Electricity Fetch] Failed:', error);
      });
  };

  const onPageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const paginatedData = data.slice(first, first + rows);

  useEffect(() => {
    if (!map) {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const google = window.google;
          const targetCoordinates = { lat: 53.349805, lng: -6.26031 }; // Dublin coordinates
          const mapOptions = {
            center: targetCoordinates,
            zoom: 12,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
          };
          const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
          new google.maps.Marker({
            position: targetCoordinates,
            map: mapInstance,
            title: "Dublin"
          });
          setMap(mapInstance);
        };
        document.head.appendChild(script);
      } else {
        const google = window.google;
        const targetCoordinates = { lat: 53.349805, lng: -6.26031 };
        const mapOptions = {
          center: targetCoordinates,
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        };
        const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
        new google.maps.Marker({
          position: targetCoordinates,
          map: mapInstance,
          title: "Dublin"
        });
        setMap(mapInstance);
      }
    }
  }, [map]);

  return (
    <div className="data-visualizations">
      <div className="breadcrumb">
        <a href='/'>Home</a> <SlArrowRight /> <a href='/'>Data Visualizations</a> <SlArrowRight /> <span>Dublin Electricity</span>
      </div>

      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box custom-datetime-picker animate-fade-in">
            <label>Start Time:</label>
            <DatePicker 
              format="yyyy-MM-dd HH:mm:ss"
              value={startTime} 
              onChange={(value) => setStartTime(value)}
              style={{ width: 260 }}
            />
          </div>
          <div className="select-box custom-datetime-picker animate-fade-in">
            <label>End Time:</label>
            <DatePicker 
              format="yyyy-MM-dd HH:mm:ss"
              value={endTime} 
              onChange={(value) => setEndTime(value)}
              style={{ width: 260 }}
            />
          </div>
        </div>
        <button className="confirm-button animate-bounce" onClick={handleFetchData}>
          Confirm
        </button>
      </div>

      <div id="map" style={{ height: "500px", width: "100%" }} className="animate-slide-up map-container"></div>

      {loading && <p>Loading data...</p>}
      {error && <p>Error: {error.message ? error.message : JSON.stringify(error)}</p>}
      {data.length > 0 && (
        <div className="visualization-container animate-fade-in">
          <div className="table-graph-container">
            <ElectricityTable data={paginatedData} />
            <ElectricityChart data={paginatedData} />
          </div>
          <div className="paginator-container">
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

export default DubElectricityDatavis;
