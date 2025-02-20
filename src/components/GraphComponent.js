import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraphComponent = ({ data }) => {
  if (!data || !data.length) {
    return <div>No data available</div>;
  }

  // Extract unique timestamps from the flat data and sort them
  const uniqueTimestamps = Array.from(
    new Set(data.map(item => new Date(item.timestamp).toISOString()))
  ).sort();

  // Extract unique lots from the data (used for datasets)
  const uniqueLots = Array.from(
    new Set(data.map(item => item.lot))
  ).sort();

  // Build a dataset for each lot
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
  const datasets = uniqueLots.map((lot, index) => {
    // For each timestamp, find the record corresponding to the current lot.
    // If not found, return null so ChartJS skips that data point.
    const dataForLot = uniqueTimestamps.map(ts => {
      const record = data.find(
        item =>
          new Date(item.timestamp).toISOString() === ts &&
          item.lot === lot
      );
      return record ? record.co2 : null;
    });

    return {
      label: lot,
      data: dataForLot,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length],
      fill: false,
    };
  });

  const chartData = {
    labels: uniqueTimestamps.map(ts => new Date(ts).toLocaleString()),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Ensures it fills the container properly
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'CO2 Emissions Operational Stage per ppm',
      },
    },
    scales: {
      x: {
        reverse: false,
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default GraphComponent;
