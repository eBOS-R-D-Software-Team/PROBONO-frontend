import React from 'react';
import PropTypes from 'prop-types';

const TableComponent = ({ data }) => {
  if (!data || !data.length) {
    return <div>No data available</div>;
  }

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
