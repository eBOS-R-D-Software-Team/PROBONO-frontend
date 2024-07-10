import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraphComponent = ({ data }) => {
  if (!data || !data.length || !data[0].neighbourhood || !data[0].neighbourhood.measurements || !data[0].neighbourhood.measurements.CO2 || !data[0].neighbourhood.measurements.CO2.data) {
    return <div>No data available</div>;
  }else{
  console.log(data);
  }
  const chartData = {
    labels: data[0].neighbourhood.measurements.CO2.data.map(d => new Date(d.timestamp).toLocaleString()),
    datasets: data.map((neighbourhood, index) => ({
      label: neighbourhood.neighbourhood.neighourhoodname,
      data: neighbourhood.neighbourhood.measurements.CO2.data.map(d => d.measure),
      borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4],
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'CO2 Emissions Operational Stage per ppm',
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
