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

const DataVisualizations = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [map, setMap] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
   const labName = location.state?.labName;
   

  // Pagination state
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(6); // Default to 6 rows per page

  const dispatch = useDispatch();
  // Use the CO2 slice from Redux Toolkit
  const { data, loading, error } = useSelector(state => state.co2);

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
    const startTimeFormatted = formatDateToISOWithoutMilliseconds(startTime);
    const endTimeFormatted = formatDateToISOWithoutMilliseconds(endTime);
    console.log('[handleFetchData] Sending request with startTime:', startTimeFormatted, 'and endTime:', endTimeFormatted);
    dispatch(fetchCO2Data({ startTime: startTimeFormatted, endTime: endTimeFormatted }))
      .unwrap()
      .then((result) => {
        console.log('[handleFetchData] Request succeeded. Result:', result);
      })
      .catch((error) => {
        console.error('[handleFetchData] Request failed:', error);
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
    <div className="data-visualizations">
      {/* Breadcrumb section */}
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
        <span>Porto CO2 emission</span>
      </div>

      {/* Filters and Selectors */}
      <div className="selectors-container">
        <div className="selectors">
          {/* Date/Time pickers */}
          <div className="select-box custom-datetime-picker animate-fade-in">
            <label>Start Time:</label>
            <DatePicker 
              format="yyyy-MM-dd HH:mm:ss"
              value={startTime} 
              onChange={(value) => {
                console.log('[DatePicker] Start time changed:', value);
                setStartTime(value);
              }}
              style={{ width: 260 }}
            />
          </div>
          <div className="select-box custom-datetime-picker animate-fade-in">
            <label>End Time:</label>
            <DatePicker 
              format="yyyy-MM-dd HH:mm:ss"
              value={endTime} 
              onChange={(value) => {
                console.log('[DatePicker] End time changed:', value);
                setEndTime(value);
              }}
              style={{ width: 260 }}
            />
          </div>
        </div>
        <button className="confirm-button animate-bounce" onClick={handleFetchData}>
          Confirm
        </button>
      </div>

      {/* Google Map Container */}
      <div id="map" style={{ height: "500px", width: "100%" }} className="animate-slide-up map-container"></div>

      {/* Data Visualizations */}
      {loading && <p>Loading data...</p>}
      {error && <p>Error: {error.message ? error.message : JSON.stringify(error)}</p>}
      {data.length > 0 && (
        <div className="visualization-container animate-fade-in">
          {/* Wrap Table and Graph */}
          <div className="table-graph-container">
            <TableComponent data={paginatedData} />
            <GraphComponent data={paginatedData} />
          </div>
          {/* Paginator */}
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

export default DataVisualizations;
