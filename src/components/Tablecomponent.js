import React from 'react';
import PropTypes from 'prop-types';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';

const TableComponent = ({ data }) => {
  // Ensure data exists and has the expected structure
  if (!data || !data.length || !data[0].neighbourhood || !data[0].neighbourhood.measurements || !data[0].neighbourhood.measurements.CO2 || !data[0].neighbourhood.measurements.CO2.data) {
    return <div>No data available</div>;
  }

  // Extract and sort unique timestamps from the first neighbourhood's CO2 data
  const uniqueTimestamps = Array.from(
    new Set(data[0].neighbourhood.measurements.CO2.data.map(d => new Date(d.timestamp).toISOString()))
  ).sort();

  return (
    <div className="table-component">
      {data.length > 0 && (
        <div className="content-container">
          <table>
            <thead>
              <tr>
                <th>Measurement Time</th>
                {data.map(neighbourhood => (
                  <th key={neighbourhood.neighbourhood.id}>{neighbourhood.neighbourhood.neighourhoodname}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimestamps.map((timestamp, index) => (
                <tr key={timestamp}>
                  <td>{new Date(timestamp).toLocaleString()}</td>
                  {data.map(neighbourhood => (
                    <td key={neighbourhood.neighbourhood.id}>
                      {neighbourhood.neighbourhood.measurements.CO2?.data.find(d => new Date(d.timestamp).toISOString() === timestamp)?.measure || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

TableComponent.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default TableComponent;
