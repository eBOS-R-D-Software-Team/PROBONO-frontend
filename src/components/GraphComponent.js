import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraphComponent = ({ data }) => {
  if (!data || !data.length) {
    return <div>No data available</div>;
  }

  // Extract timestamps and CO₂ values
  const timestamps = data.map(item => item.timestamp);
  const co2Values = data.map(item => (item.co2 !== "N/A" ? item.co2 : null));

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: "CO₂ Emissions (gCO₂)",
        data: co2Values,
        borderColor: "#FF6384",
        backgroundColor: "#FF6384",
        fill: false,
        pointRadius: 3, // Ensures all points are visible
        spanGaps: true, // Prevents gaps from missing values
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Lot 1 CO₂ Emissions Over Time',
      },
    },
    scales: {
      x: {
        reverse: false,
        ticks: {
          autoSkip: true, // Prevents too many labels from overlapping
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: false, // Adjusts scale dynamically
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
