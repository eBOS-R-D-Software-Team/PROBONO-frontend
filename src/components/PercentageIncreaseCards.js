import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'primereact/card';
import { FaArrowUp } from 'react-icons/fa';

const PercentageIncreaseCards = ({ data, property }) => {
  const calculateIncrease = (currentYear, previousYear) => ((currentYear - previousYear) / previousYear) * 100;

  const maxYear = Math.max(...data.map(item => item.year));
  const currentYearData = data.find(d => d.year === maxYear) || {};
  const previousYearData = data.find(d => d.year === maxYear - 1) || {};
  const fiveYearOldData = data.find(d => d.year === maxYear - 5) || currentYearData;

  const oneYearIncrease = calculateIncrease(currentYearData[property], previousYearData[property]).toFixed(1);
  const fiveYearIncrease = calculateIncrease(currentYearData[property], fiveYearOldData[property]).toFixed(1);

  return (
    <div className="percentage-increase-cards">
      <Card className="card">
        <FaArrowUp className="icon" />
        <div className="percentage">{oneYearIncrease}%</div>
        <div className="description">{`${property.replace(/_/g, ' ')} increase in a year`}</div>
      </Card>
      <Card className="card">
        <FaArrowUp className="icon" />
        <div className="percentage">{fiveYearIncrease}%</div>
        <div className="description">{`${property.replace(/_/g, ' ')} expected increase in 5 years`}</div>
      </Card>
    </div>
  );
};

PercentageIncreaseCards.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  property: PropTypes.string.isRequired,
};

export default PercentageIncreaseCards;
