import React from 'react';
import PropTypes from 'prop-types';

const TableComponent = ({ data }) => {
  if (!data || !data.length) {
    return <div>No data available</div>;
  }

  // Get unique timestamps from the flat data array
  const uniqueTimestamps = Array.from(
    new Set(data.map(item => new Date(item.timestamp).toISOString()))
  ).sort();

  // Get unique lots (neighbourhoods)
  const uniqueLots = Array.from(new Set(data.map(item => item.lot))).sort();

  return (
    <div className="table-component">
      <div className="content-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              {uniqueLots.map(lot => (
                <th key={lot}>{lot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimestamps.map(timestamp => (
              <tr key={timestamp}>
                <td>{new Date(timestamp).toLocaleString()}</td>
                {uniqueLots.map(lot => {
                  // Find the record for this timestamp and lot
                  const record = data.find(
                    item =>
                      new Date(item.timestamp).toISOString() === timestamp &&
                      item.lot === lot
                  );
                  return (
                    <td key={lot}>
                      {record ? record.co2 : 'N/A'}
                    </td>
                  );
                })}
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
      lot: PropTypes.string.isRequired,
      unit: PropTypes.string,
      co2: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default TableComponent;