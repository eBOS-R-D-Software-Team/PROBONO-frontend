import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios'; // Import axios
import { fetchNeighbourhoods } from '../actions/neighbourhoodActions';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import DateTimePicker from 'react-datetime-picker';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css'; // Required for the calendar pop-up
import 'react-clock/dist/Clock.css'; // Required for the clock pop-up

const DataVisualizations = () => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedNeighbourhoods, setSelectedNeighbourhoods] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [data, setData] = useState(null); // Define data state variable
  
  const dispatch = useDispatch();
  const { neighbourhoods, loading } = useSelector((state) => state.neighbourhood);

  useEffect(() => {
    dispatch(fetchNeighbourhoods());
  }, [dispatch]);

  const properties = [
    { label: 'CO2 emissions', value: 'CO2 emissions' },
    { label: 'Energy consumption', value: 'Energy consumption' },
  ];

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
          console.log(`Fetching data for ID: ${id}, Start Time: ${startTimeFormatted}, End Time: ${endTimeFormatted}`);
          return axios.get(`http://168.119.15.247:3537/porto/report/neighbourhoods/${id}/${startTimeFormatted}/${endTimeFormatted}`, {
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json',
            },
          });
        })
      );
      const fetchedData = results.map(result => result.data);
      console.log(fetchedData);
      setData(fetchedData); // Set data state variable
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="data-visualizations">
      <div className="selectors">
        <div>
          <label>Select Neighbourhoods:</label>
          <MultiSelect
            value={selectedNeighbourhoods}
            options={neighbourhoods.map(n => ({ label: n.name, value: n.id }))}
            onChange={(e) => setSelectedNeighbourhoods(e.value)}
            placeholder="Select Neighbourhoods"
            disabled={loading}
          />
        </div>
        <div>
          <label>Start Time:</label>
          <div className="datetime-picker-container">
            <DateTimePicker value={startTime} onChange={setStartTime} />
          </div>
        </div>
        <div>
          <label>End Time:</label>
          <div className="datetime-picker-container">
            <DateTimePicker value={endTime} onChange={setEndTime} />
          </div>
        </div>
        <div>
          <label>Select Property:</label>
          <Dropdown value={selectedProperty} options={properties} onChange={(e) => setSelectedProperty(e.value)} placeholder="Select Property" />
        </div>
        <button className="confirm-button" onClick={handleFetchData}>Confirm</button>
      </div>
      {data && (
        <div>
          <h3>Data Visualization</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          {/* Add your visualization components here */}
        </div>
      )}
    </div>
  );
};

export default DataVisualizations;
