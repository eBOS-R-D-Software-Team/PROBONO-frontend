import React from 'react';
import { Link } from 'react-router-dom';
import { SlWrench, SlSettings, SlGraph, SlMagnifier } from 'react-icons/sl';

const Home = () => {
  const decisionWorkflowLink = `https://gbn-management.cds-probono.eu/?automatic_keycloak_login=true`;
  const solutionFinderLink = `https://solution-finder.cds-probono.eu`;

  return (
    <div className="home-container">
      <div className="cards-container">

        {/* 1. Solution Finder (External Link) */}
        <a href={solutionFinderLink} className="glass-card" target="_blank" rel="noopener noreferrer">
          <div className="icon-wrapper">
            <SlMagnifier />
          </div>
          <div className="card-content">
            <h3>Solution Finder</h3>
            <p>Describe your challenge and find the most relevant tools to help you.</p>
          </div>
        </a>

        {/* 2. Solutions Catalogue (Internal Link) */}
        <Link to="/tools" className="glass-card">
          <div className="icon-wrapper">
            <SlWrench />
          </div>
          <div className="card-content">
            <h3>Solutions Catalogue</h3>
            <p>Explore all available tools and solutions developed in the project.</p>
          </div>
        </Link>

        {/* 3. GBN Management (External Link) */}
        <a href={decisionWorkflowLink} className="glass-card" target="_blank" rel="noopener noreferrer">
          <div className="icon-wrapper">
            <SlSettings />
          </div>
          <div className="card-content">
            <h3>GBN Management</h3>
            <p>Manage decision workflows and governance processes.</p>
          </div>
        </a>

        {/* 4. Data Visualization (Internal Link) */}
        <Link to="/labs" className="glass-card">
          <div className="icon-wrapper">
            <SlGraph />
          </div>
          <div className="card-content">
            <h3>Data Visualization</h3>
            <p>Visualize and analyze data through interactive dashboards.</p>
          </div>
        </Link>

      </div>
    </div>
  );
};

export default Home;