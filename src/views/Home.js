import React from 'react';
import { FaTools, FaCogs, FaChartBar } from 'react-icons/fa';
import Card from '../components/cards';

const Home = () => {
  const username = process.env.REACT_APP_USERNAME;
  const password = process.env.REACT_APP_PASSWORD;

  const decisionWorkflowLink = `https://gbn-management.cds-probono.eu/?automatic_keycloak_login=true`;

  return (
    <div className="home-container">
      <div className="cards-container">
        <Card icon={FaTools} title="Solutions Catalogue" link="/tools" />
        <Card icon={FaCogs} title="GBN Management" link={decisionWorkflowLink} />
        <Card icon={FaChartBar} title="Data Visualization" link="/labs" />
      </div>
    </div>
  );
};

export default Home;
