import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaChartBar, FaEnvelope, FaBell, FaCog, FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import userPhoto from '../assets/images/user.png'; // Import the image

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
            <NavLink to="/home" activeClassName="active">
             <icon><FaHome /></icon>  {!isCollapsed && <span>Home</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/data-visualizations" activeClassName="active">
            <icon><FaChartBar /></icon>{!isCollapsed && <span>Data Visualizations</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/messages" activeClassName="active">
            <icon><FaEnvelope /></icon> {!isCollapsed && <span>Messages</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/notifications" activeClassName="active">
            <icon><FaBell /></icon> {!isCollapsed && <span>Notifications</span>}
            </NavLink>
          </li>
          <li className="bottom-link">
            <NavLink to="/settings" activeClassName="active">
            <icon><FaCog /></icon> {!isCollapsed && <span>Settings</span>}
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
