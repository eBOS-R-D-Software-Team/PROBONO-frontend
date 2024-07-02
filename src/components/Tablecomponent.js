import React from 'react';
import PropTypes from 'prop-types';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';

const TableComponent = ({ years, buildings, property, data }) => {
  return (
    <div className="table-component">
      {years.length > 0 && buildings.length > 0 && property && (
        <div className="content-container">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                {buildings.map(building => (
                  <th key={building}>{building}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map(year => (
                <tr key={year}>
                  <td>{year}</td>
                  {buildings.map(building => (
                    <td key={building}>{data[year]?.[building]?.[property] || 'N/A'}</td>
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
  years: PropTypes.array.isRequired,
  buildings: PropTypes.array.isRequired,
  property: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
};

export default TableComponent;
