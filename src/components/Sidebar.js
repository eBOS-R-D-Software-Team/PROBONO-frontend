import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaChartBar, FaAngleLeft, FaAngleRight, FaTools, FaCogs,} from 'react-icons/fa';


const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

   const username = process.env.REACT_APP_USERNAME;
  const password = process.env.REACT_APP_PASSWORD;

  const decisionWorkflowLink = `https://${username}:${password}@probono.irtsysx.fr/`;


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
            <NavLink to="/tools">
            <i><FaTools/></i> {!isCollapsed && <span>Solutions Catalogue</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to={decisionWorkflowLink} >
            <i><FaCogs /></i>{!isCollapsed && <span>Decision Workflow</span>}
            </NavLink>
          </li>
          <li className="bottom-link">
            <li>
            <NavLink to="/labs">
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
