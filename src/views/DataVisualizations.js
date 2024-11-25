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
                        'Accept': 'application/json',
                    },
                });
            })
        );

        const fetchedData = results.map(result => result.data);

        // Check if any of the fetched data has CO2 measurements
        const hasCO2Data = fetchedData.some(neighbourhood => 
            neighbourhood?.neighbourhood?.measurements?.CO2?.data?.length > 0
        );

        if (!hasCO2Data) {
            alert('No CO2 data measured in the specified period.');
        } else {
            setData(fetchedData);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('An error occurred while fetching data. Please try again later.');
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
    const CO2Data = neighbourhood?.neighbourhood?.measurements?.CO2?.data || [];
    
    return {
      ...neighbourhood,
      neighbourhood: {
        ...neighbourhood.neighbourhood,
        measurements: {
          ...neighbourhood.neighbourhood.measurements,
          CO2: {
            ...neighbourhood.neighbourhood.measurements.CO2,
            data: CO2Data.slice(first, first + rows), // Slice only if CO2Data exists
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
  
              const targetCoordinates = { lat: 41.23629363691908, lng: -8.640874989443377 }; // Target coordinates
  
              const mapOptions = {
                  center: targetCoordinates, // Center the map on the coordinates
                  zoom: 16, // Set the zoom level closer to the target
                  mapTypeId: google.maps.MapTypeId.SATELLITE,
              };
  
              const mapInstance = new google.maps.Map(document.getElementById('map'), mapOptions);
  
              // Add a marker at the target coordinates
              new google.maps.Marker({
                  position: targetCoordinates,
                  map: mapInstance,
                  title: "Porto LL",
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
            totalRecords={data[0]?.neighbourhood?.measurements?.CO2?.data?.length || 0} // Ensuring safe access
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
