import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom'; // Added useLocation for manual active check
import { FaHome, FaChartBar, FaAngleLeft, FaAngleRight, FaTools, FaCogs, FaFileAlt } from 'react-icons/fa';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation(); // Hook to get current URL
  const decisionWorkflowLink = `https://gbn-management.cds-probono.eu/?automatic_keycloak_login=true`;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Helper to check if external link should look "active" (optional)
  const isGbnActive = location.pathname.includes('gbn'); 

  return (
    <div id="left-sidebar" className={isCollapsed ? 'collapsed' : ''}>
      <button onClick={toggleSidebar} className="collapse-btn">
        {isCollapsed ? <FaAngleRight /> : <FaAngleLeft />}
      </button>

      <div className="sidebar-nav">
        {/* CHANGED: Class name changed to avoid conflicts */}
        <ul className="custom-sidebar-list">
          
          {/* 1. Home */}
          <li>
            <NavLink to="/" end>
              <FaHome /> 
              {!isCollapsed && <span>Home</span>}
            </NavLink>
          </li>

          {/* 2. Solutions Catalogue */}
          <li>
            <NavLink to="/tools">
              <FaTools /> 
              {!isCollapsed && <span>Solutions Catalogue</span>}
            </NavLink>
          </li>

          {/* 3. GBN Management (External) */}
          <li>
            <a 
              href={decisionWorkflowLink} 
              className={isGbnActive ? 'active' : ''} // Manual active class if needed
            >
              <FaCogs />
              {!isCollapsed && <span>GBN management</span>}
            </a>
          </li>

          {/* 4. Data Visualizations */}
          <li>
            <NavLink to="/labs">
              <FaChartBar />
              {!isCollapsed && <span>Data Visualizations</span>}
            </NavLink>
          </li>

          {/* 5. Tools Description */}
          <li>
            <NavLink to="/tools-descriptions">
              <FaFileAlt />
              {!isCollapsed && <span>Tools Description</span>}
            </NavLink>
          </li>

        </ul>
      </div>
    </div>
  );
};

export default Sidebar;