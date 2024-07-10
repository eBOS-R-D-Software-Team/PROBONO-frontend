import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'primereact/card';
import { FaArrowUp } from 'react-icons/fa';

const PercentageIncreaseCards = ({ data }) => {
  if (!data || !data.length || !data[0].neighbourhood || !data[0].neighbourhood.measurements || !data[0].neighbourhood.measurements.CO2 || !data[0].neighbourhood.measurements.CO2.data) {
    return <div>No data available</div>;
  }
  const calculateIncrease = (current, previous) => ((current - previous) / previous) * 100;

  const currentMeasurements = data[0].neighbourhood.measurements.CO2.data;
  const previousMeasurements = data[1]?.neighbourhood.measurements.CO2.data || currentMeasurements;

  const currentMeasurement = currentMeasurements[currentMeasurements.length - 1]?.measure || 0;
  const previousMeasurement = previousMeasurements[previousMeasurements.length - 1]?.measure || 0;
  const fiveYearOldMeasurement = previousMeasurements[previousMeasurements.length - 5]?.measure || currentMeasurement;

  const oneYearIncrease = calculateIncrease(currentMeasurement, previousMeasurement).toFixed(1);
  const fiveYearIncrease = calculateIncrease(currentMeasurement, fiveYearOldMeasurement).toFixed(1);

  return (
    <div className="percentage-increase-cards">
      <Card className="card">
        <FaArrowUp className="icon" />
        <div className="percentage">{oneYearIncrease}%</div>
        <div className="description">CO2 increase in a year</div>
      </Card>
      <Card className="card">
        <FaArrowUp className="icon" />
        <div className="percentage">{fiveYearIncrease}%</div>
        <div className="description">CO2 expected increase in 5 years</div>
      </Card>
    </div>
  );
};

PercentageIncreaseCards.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default PercentageIncreaseCards;
