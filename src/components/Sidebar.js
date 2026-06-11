import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaChartBar, FaAngleLeft, FaAngleRight, FaTools, FaCogs, FaFileAlt, FaSearch, FaPlug } from 'react-icons/fa';
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const decisionWorkflowLink = `https://gbn-management.cds-probono.eu/?automatic_keycloak_login=true`;
  const solutionFinderLink = `https://solution-finder.cds-probono.eu`;
  const apiregistry = `https://data-platform.cds-probono.eu/api-registry/`;
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const isGbnActive = location.pathname.includes('gbn');
  return (
    <div id="left-sidebar" className={isCollapsed ? 'collapsed' : ''}>
      <button onClick={toggleSidebar} className="collapse-btn">
        {isCollapsed ? <FaAngleRight /> : <FaAngleLeft />}
      </button>
      <div className="sidebar-nav">
        <ul className="custom-sidebar-list">
          {/* 1. Home */}
          <li>
            <NavLink to="/" end>
              <FaHome />
              {!isCollapsed && <span>Home</span>}
            </NavLink>
          </li>
          {/* 2. Solution Finder (External) */}
          <li>
            <a href={solutionFinderLink} target="_blank" rel="noopener noreferrer">
              <FaSearch />
              {!isCollapsed && <span>Solution Finder</span>}
            </a>
          </li>
          {/* 3. Solutions Catalogue */}
          <li>
            <NavLink to="/tools">
              <FaTools />
              {!isCollapsed && <span>Solutions Catalogue</span>}
            </NavLink>
          </li>
          {/* 4. GBN Management (External) */}
          <li>
            <a href={decisionWorkflowLink} className={isGbnActive ? 'active' : ''}>
              <FaCogs />
              {!isCollapsed && <span>GBN management</span>}
            </a>
          </li>
          {/* 5. Data Visualizations */}
          <li>
            <NavLink to="/labs">
              <FaChartBar />
              {!isCollapsed && <span>Data Visualizations</span>}
            </NavLink>
          </li>
          {/* 6. Tools Description */}
          <li>
            <NavLink to="/tools-descriptions">
              <FaFileAlt />
              {!isCollapsed && <span>Tools Description</span>}
            </NavLink>
          </li>
          {/* 7. API Registry (External) */}
          <li>
            <a href={apiregistry} target="_blank" rel="noopener noreferrer">
              <FaPlug />
              {!isCollapsed && <span>API Registry</span>}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
export default Sidebar;