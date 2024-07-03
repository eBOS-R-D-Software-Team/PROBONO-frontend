import React, { useState } from 'react';
import TableComponent from "../components/Tablecomponent";
import GraphComponent from "../components/GraphComponent";
import PercentageIncreaseCards from "../components/PercentageIncreaseCards";
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import labo from "../assets/images/lobe21.png";
import data from "../data/data";

const transformData = (data, selectedYears, selectedBuildings, property) => {
  const transformed = [];
  if (selectedYears.length > 0 && selectedBuildings.length > 0 && property) {
    selectedYears.forEach(year => {
      selectedBuildings.forEach(building => {
        transformed.push({
          year: parseInt(year),
          building,
          [property]: data[year][building][property]
        });
      });
    });
  }
  return transformed;
};

const DataVisualizations = () => {
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');

  const years = Object.keys(data).map(year => ({ label: year, value: year }));
  const buildings = ["Building A", "Building B", "Building C", "Building D"].map(building => ({ label: building, value: building }));
  const properties = [{ label: 'CO2 emissions', value: 'CO2 emissions' }, { label: 'Energy consumption', value: 'Energy consumption' }];

  const transformedData = transformData(data, selectedYears, selectedBuildings, selectedProperty);

  return (
    <div className="data-visualizations">
      <div className="selectors">
        <div>
          <label>Select Year:</label>
          <MultiSelect value={selectedYears} options={years} onChange={(e) => setSelectedYears(e.value)} placeholder="Select Years" />
        </div>
        <div>
          <label>Select Building:</label>
          <MultiSelect value={selectedBuildings} options={buildings} onChange={(e) => setSelectedBuildings(e.value)} placeholder="Select Buildings" />
        </div>
        <div>
          <label>Select Property:</label>
          <Dropdown value={selectedProperty} options={properties} onChange={(e) => setSelectedProperty(e.value)} placeholder="Select Property" />
        </div>
      </div>
      <div className="summary-and-image">
        <img src={labo} alt="Facility Layout" className="facility-image" />
        {selectedYears.length > 0 && selectedBuildings.length > 0 && selectedProperty && (
          <PercentageIncreaseCards data={transformedData} property={selectedProperty} />
        )}
      </div>
      {selectedYears.length > 0 && selectedBuildings.length > 0 && selectedProperty && (
        <div className="visualization-container">
          <TableComponent years={selectedYears} buildings={selectedBuildings} property={selectedProperty} data={data} />
          <GraphComponent data={data} selectedYears={selectedYears} selectedBuildings={selectedBuildings} selectedProperty={selectedProperty} />
        </div>
      )}
    </div>
  );
};

export default DataVisualizations;
