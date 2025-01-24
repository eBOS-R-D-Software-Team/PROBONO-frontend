import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DataVisualizations = () => {
  const [map, setMap] = useState(null); // State to hold map instance
  const [columns, setColumns] = useState([]); // State to hold column names
  const [xAxis, setXAxis] = useState(''); // Selected X-axis column
  const [yAxis, setYAxis] = useState(''); // Selected Y-axis column

  // Static data for plotting
  const staticData = [
    { Scenario_ID: 1, housing_length: 14, l_gap1: 0, l_gap2: 0, no_deck_width: 7, roof_area_housing: 901, total_added_GWP: 159965 },
    { Scenario_ID: 2, housing_length: 15, l_gap1: 0, l_gap2: 0, no_deck_width: 7, roof_area_housing: 966, total_added_GWP: 166581 },
    { Scenario_ID: 3, housing_length: 16, l_gap1: 0, l_gap2: 0, no_deck_width: 7, roof_area_housing: 1030, total_added_GWP: 173197 },
    { Scenario_ID: 4, housing_length: 14, l_gap1: 0, l_gap2: 0, no_deck_width: 8, roof_area_housing: 901, total_added_GWP: 158518 },
    { Scenario_ID: 5, housing_length: 15, l_gap1: 0, l_gap2: 0, no_deck_width: 8, roof_area_housing: 966, total_added_GWP: 165031 },
  ];

  // Google Maps Initialization
  useEffect(() => {
    if (!map) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const google = window.google;

        const targetCoordinates = { lat: 56.16608795224402, lng: 10.200139599559071 }; // Target coordinates

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

  // Fetch column names from the static data
  useEffect(() => {
    const columnNames = Object.keys(staticData[0]);
    setColumns(columnNames);
  }, [staticData]);

  // Generate data for the chart based on selected columns
  const generateChartData = () => {
    if (!xAxis || !yAxis) return null;

    return {
      labels: staticData.map((row) => row[xAxis]),
      datasets: [
        {
          label: `${yAxis} vs ${xAxis}`,
          data: staticData.map((row) => row[yAxis]),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
      ],
    };
  };

  const chartData = generateChartData();

  return (
    <div className="data-visualizations">
      {/* Google Map */}
      <div id="map" style={{ height: "500px", width: "100%" }} className="map-container"></div>

      {/* Column Selectors */}
      <div className="selectors-container">
        <div>
          <label htmlFor="x-axis-select">Select X-Axis:</label>
          <select
            id="x-axis-select"
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
          >
            <option value="">-- Select Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="y-axis-select">Select Y-Axis:</label>
          <select
            id="y-axis-select"
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
          >
            <option value="">-- Select Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Plot */}
      <div className="plot-container">
        {chartData ? (
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
        ) : (
          <p>Please select columns to plot data.</p>
        )}
      </div>
    </div>
  );
};

export default DataVisualizations;
