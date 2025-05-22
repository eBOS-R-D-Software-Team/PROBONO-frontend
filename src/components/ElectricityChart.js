import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ElectricityChart = ({ data }) => {
  if (!data || !data.length) return <div>No data available</div>;

  const timestamps = data.map(d => d.timestamp);
  const dayValues = data.map(d => d.day);
  const nightValues = data.map(d => d.night);

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: 'Day kWh',
        data: dayValues,
        borderColor: '#36A2EB',
        backgroundColor: '#36A2EB',
        fill: false,
        pointRadius: 3,
        spanGaps: true,
      },
      {
        label: 'Night kWh',
        data: nightValues,
        borderColor: '#4BC0C0',
        backgroundColor: '#4BC0C0',
        fill: false,
        pointRadius: 3,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Electricity Usage Over Time (kWh)' },
    },
    scales: {
      x: {
        ticks: { autoSkip: true, maxTicksLimit: 10 },
      },
      y: { beginAtZero: false },
    },
  };

  return <div className="chart-container"><Line data={chartData} options={options} /></div>;
};

export default ElectricityChart;
