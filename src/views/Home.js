import React from 'react';
import { Link } from 'react-router-dom';
// I swapped Fa icons for Sl (Simple Line) icons as they look much cleaner/sleeker
import { SlWrench, SlSettings, SlGraph } from 'react-icons/sl'; 


const Home = () => {
  // Your existing external link logic
  const decisionWorkflowLink = `https://gbn-management.cds-probono.eu/?automatic_keycloak_login=true`;

  return (
    <div className="home-container">
      {/* Added a Hero Section so the page isn't just floating cards */}
      <div className="hero-section">
        <h1>Welcome to <span className="highlight">PROBONO</span></h1>
      </div>

      <div className="cards-container">
        
        {/* 1. Solutions Catalogue (Internal Link) */}
        <Link to="/tools" className="glass-card">
          <div className="icon-wrapper">
            <SlWrench />
          </div>
          <div className="card-content">
            <h3>Solutions Catalogue</h3>
          </div>
        </Link>

        {/* 2. GBN Management (External Link - uses <a> tag) */}
        <a href={decisionWorkflowLink} className="glass-card">
          <div className="icon-wrapper">
            <SlSettings />
          </div>
          <div className="card-content">
            <h3>GBN Management</h3>
          </div>
        </a>

        {/* 3. Data Visualization (Internal Link) */}
        <Link to="/labs" className="glass-card">
          <div className="icon-wrapper">
            <SlGraph />
          </div>
          <div className="card-content">
            <h3>Data Visualization</h3>
          </div>
        </Link>

      </div>
    </div>
  );
};

export default Home;