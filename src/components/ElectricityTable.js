import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Array}  data     – array of rows
 * @param {Array}  columns  – array of column keys to show (e.g. ["Average_Daily_Day_KWHS", …])
 */
const ElectricityTable = ({ data, columns }) => {
  if (!data || !data.length) return <div>No data available</div>;

  // If no columns supplied yet (first paint), show everything except timestamp
  const cols =
    columns && columns.length
      ? columns
      : Object.keys(data[0]).filter((k) => k !== 'timestamp');

  return (
    <div className="table-component">
      <div className="content-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              {cols.map((c) => (
                <th key={c}>{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td>{row.timestamp}</td>
                {cols.map((c) => (
                  <td key={c}>
                    {row[c] != null && row[c].toFixed
                      ? row[c].toFixed(2)
                      : row[c] ?? 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ElectricityTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.string),
};

export default ElectricityTable;
