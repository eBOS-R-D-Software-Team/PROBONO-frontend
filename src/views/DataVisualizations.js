import React, { useState, useEffect } from 'react'; 
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { fetchNeighbourhoods } from '../actions/neighbourhoodActions';
import { MultiSelect } from 'primereact/multiselect';
import { DatePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css'; // Import RSuite styles
import GraphComponent from '../components/GraphComponent';
import TableComponent from '../components/Tablecomponent';
import { Paginator } from 'primereact/paginator';
import { SlArrowRight } from "react-icons/sl";

const API_URL = process.env.REACT_APP_API_URL;

const DataVisualizations = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([]);
  const [data, setData] = useState([]);
  const [map, setMap] = useState(null);  // State to hold map instance

  // Pagination state
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(6); // Default to 6 rows per page

  const dispatch = useDispatch();
  const { neighbourhoods, loading } = useSelector((state) => state.neighbourhood);

  useEffect(() => {
    dispatch(fetchNeighbourhoods());
  }, [dispatch]);

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

  const handleFetchData = async () => {
    try {
      const results = await Promise.all(
        selectedNeighbourhoods.map(id => {
          const startTimeFormatted = formatDateToISOWithoutMilliseconds(startTime);
          const endTimeFormatted = formatDateToISOWithoutMilliseconds(endTime);
          return axios.get(`${API_URL}/neighbourhoods/${id}/${startTimeFormatted}/${endTimeFormatted}`, {
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json',
            },
          });
        })
      );
      const fetchedData = results.map(result => result.data);
      setData(fetchedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const neighbourhoodOptions = neighbourhoods.map((n, index) => ({
    label: n.name,
    value: n.id,
    disabled: index < 2,
  }));

  // Handle pagination change
  const onPageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // Slice the data based on pagination
  const paginatedData = data.map((neighbourhood) => {
    return {
      ...neighbourhood,
      neighbourhood: {
        ...neighbourhood.neighbourhood,
        measurements: {
          ...neighbourhood.neighbourhood.measurements,
          CO2: {
            ...neighbourhood.neighbourhood.measurements.CO2,
            data: neighbourhood.neighbourhood.measurements.CO2.data.slice(first, first + rows),
          },
        },
      },
    };
  });

    // Google Maps Initialization
    useEffect(() => {
      if (!map) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const google = window.google;
          const mapOptions = {
            center: { lat: 51.505, lng: -0.09 }, // Initial map center
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
          };
          const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
          
          // Add a marker
          new google.maps.Marker({
            position: { lat: 51.505, lng: -0.09 },
            map: mapInstance,
            title: "A marker!",
          });
  
          setMap(mapInstance); // Store the map instance in state
        };
        document.head.appendChild(script);
      }
    }, [map]);

  return (
    <div className="data-visualizations">
      {/* Breadcrumb section */}
      <div className="breadcrumb">
        <a href='/'>Home </a><SlArrowRight /> <a href='/'>Data Visualizations</a> <SlArrowRight /> <a href='/'>Porto LL</a>
      </div>

      {/* Filters and Selectors */}
      <div className="selectors-container">
        <div className="selectors">
          <div className="select-box custom-multiselect animate-fade-in">
            <label>Select Neighbourhoods:</label>
            <MultiSelect
              value={selectedNeighbourhoods}
              options={neighbourhoodOptions}
              onChange={(e) => setSelectedNeighbourhoods(e.value)}
              placeholder="Select Neighbourhoods"
              disabled={loading}
              panelClassName="custom-multiselect-panel"
            />
          </div>
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
        <button className="confirm-button animate-bounce" onClick={handleFetchData}>Confirm</button>
      </div>

      {/* Google Map */}
      <div id="map" style={{ height: "500px", width: "100%" }} className="animate-slide-up map-container"></div>

      {/* Data Visualizations */}
      {data.length > 0 && (
        <div className="visualization-container animate-fade-in">
          {/* Pass pagination state and paginated data to the Table and Graph components */}
          <TableComponent data={paginatedData} />
          <GraphComponent data={paginatedData} />

          {/* Paginator for both table and graph */}
          <Paginator
            first={first}
            rows={rows}
            totalRecords={data[0].neighbourhood.measurements.CO2.data.length} // Assuming all neighbourhoods have the same number of records
            rowsPerPageOptions={[6, 12, 24]}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default DataVisualizations;
