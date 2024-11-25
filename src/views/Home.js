// Home.js
import React from 'react';
import { FaTools, FaCogs, FaChartBar } from 'react-icons/fa';
import Card from '../components/cards';


const Home = () => {
  return (
    <div className="home-container">
      <div className="cards-container">
        <Card icon={FaTools} title="Solution Catalog" link="/tools" />
        <Card icon={FaCogs} title="Decision Workflow" link="/decision-support" />
        <Card icon={FaChartBar} title="Data Visualization" link="/data-visualizations" />
      </div>
    </div>
  );
};

export default Home;
