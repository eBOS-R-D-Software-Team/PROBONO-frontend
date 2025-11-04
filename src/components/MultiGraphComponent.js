import React from 'react';
import { Line } from 'react-chartjs-2';

const MultiGraphComponent = ({ data = [], label = 'Value' }) => {
  const chartData = {
    labels: data.map(d => d.timestamp),
    datasets: [{
      label,
      data: data.map(d => (typeof d.value === 'number' ? d.value : null)),
      borderWidth: 2,
      fill: false,
      pointRadius: 2,
    }]
  };
  const options = {
    responsive: true,
    interaction: { mode: 'nearest', intersect: false },
    scales: { x: { ticks: { maxRotation: 0 } }, y: { beginAtZero: false } }
  };
  return <Line data={chartData} options={options} />;
};

export default MultiGraphComponent;
