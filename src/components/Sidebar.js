import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaChartBar, FaEnvelope, FaBell, FaCog, FaAngleLeft, FaAngleRight } from 'react-icons/fa';


const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div id="left-sidebar" className={isCollapsed ? 'collapsed' : ''}>
      <button onClick={toggleSidebar} className="collapse-btn">
        {isCollapsed ? <FaAngleRight /> : <FaAngleLeft />}
      </button>
      <div className="sidebar-nav">
        <ul className="metismenu">
          <li>
            <NavLink to="/">
             <i><FaHome /></i>  {!isCollapsed && <span>Home</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/data-visualizations">
            <i><FaChartBar /></i>{!isCollapsed && <span>Data Visualizations</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/messages">
            <i><FaEnvelope /></i> {!isCollapsed && <span>Messages</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/notifications" >
            <i><FaBell /></i>{!isCollapsed && <span>Notifications</span>}
            </NavLink>
          </li>
          <li className="bottom-link">
            <NavLink to="/settings" >
            <i><FaCog /></i> {!isCollapsed && <span>Settings</span>}
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
