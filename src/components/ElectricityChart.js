import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * chartData is now prepared in the page component
 * (so we can plot whichever fields the user selects).
 */
const ElectricityChart = ({ chartData, title = 'Electricity Usage Over Time (kWh)' }) => {
  if (!chartData || !chartData.labels?.length) {
    return <div>No data available</div>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: title },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
      y: { beginAtZero: false },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ElectricityChart;
