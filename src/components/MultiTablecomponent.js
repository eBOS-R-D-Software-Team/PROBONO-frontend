import React from 'react';

const fmt = (x) => (typeof x === 'number' && isFinite(x) ? x.toFixed(2) : '—');

const MultiTableComponent = ({ data = [], label = 'Value' }) => {
  return (
    <div className="table-wrapper">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Timestamp (UTC)</th>
            <th>{label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.timestamp}</td>
              <td>{fmt(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p>No data for the selected range.</p>}
    </div>
  );
};

export default MultiTableComponent;
