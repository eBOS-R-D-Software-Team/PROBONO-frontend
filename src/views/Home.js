// Home.js
import React from 'react';
import { FaTools, FaCogs, FaChartBar } from 'react-icons/fa';
import Card from '../components/cards';


const Home = () => {
  return (
    <div className="home-container">
      <h1>Home</h1>
      <div className="cards-container">
        <Card icon={FaTools} title="List of Tools" link="/tools" />
        <Card icon={FaCogs} title="Decision Support System" link="/decision-support" />
        <Card icon={FaChartBar} title="Data Visualization" link="/data-visualizations" />
      </div>
    </div>
  );
};

export default Home;
