import React from 'react';
import PropTypes from 'prop-types';

const TableComponent = ({ data }) => {
  if (!data || !data.length) {
    return <div>No data available</div>;
  }

  return (
    <div className="table-component">
      <div className="content-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Values (gCO₂)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.timestamp}</td>
                <td>{item.co2 !== "N/A" ? item.co2.toFixed(2) : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

TableComponent.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      co2: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    })
  ).isRequired,
};

export default TableComponent;
