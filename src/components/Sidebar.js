import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaChartBar, FaAngleLeft, FaAngleRight, FaTools, FaCogs,} from 'react-icons/fa';


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
            <NavLink to="/messages">
            <i><FaTools/></i> {!isCollapsed && <span>Solutions Catalogue</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/notifications" >
            <i><FaCogs /></i>{!isCollapsed && <span>Decision Workflow</span>}
            </NavLink>
          </li>
          <li className="bottom-link">
            <li>
            <NavLink to="/data-visualizations">
            <i><FaChartBar /></i>{!isCollapsed && <span>Data Visualizations</span>}
            </NavLink>
          </li>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
