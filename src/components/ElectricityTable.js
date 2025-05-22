import React from 'react';
import PropTypes from 'prop-types';

const ElectricityTable = ({ data }) => {
  if (!data || !data.length) return <div>No data available</div>;

  return (
    <div className="table-component">
      <div className="content-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Day kWh</th>
              <th>Night kWh</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.timestamp}</td>
                <td>{item.day !== null ? item.day.toFixed(2) : 'N/A'}</td>
                <td>{item.night !== null ? item.night.toFixed(2) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ElectricityTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      day: PropTypes.number,
      night: PropTypes.number,
    })
  ).isRequired,
};

export default ElectricityTable;
