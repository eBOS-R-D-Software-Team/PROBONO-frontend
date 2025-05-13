// src/components/Navbar.js
import React from "react";
import { Link } from "react-router-dom";
// import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import Logo from "../assets/images/PB_logo_org.png";
// import { onLogout } from "../actions/LoginAction";
import { useKeycloak } from "@react-keycloak/web";

const Navbar = ({ onPressSideMenuToggle }) => {
  // const dispatch = useDispatch();
  const { keycloak } = useKeycloak();

  const handleToggleSideMenu = () => {
    if (onPressSideMenuToggle) {
      // dispatch(onPressSideMenuToggle());
      onPressSideMenuToggle();
    }
  };

  const handleLogout = () => {
    // instead of dispatch(onLogout()) and navigate("/")
    // delegate to Keycloak’s logout endpoint
    keycloak.logout({
      redirectUri: window.location.origin + "/login"
    });
  };

  return (
    <nav className="navbar navbar-fixed-top">
      <div className="container-fluid">
        <div className="navbar-btn">
          <button
            className="btn-toggle-offcanvas"
            onClick={handleToggleSideMenu}
          >
            <i className="lnr lnr-menu fa fa-bars"></i>
          </button>
        </div>

        <div className="navbar-brand">
          <Link to="/dashboard">
            <img
              src={Logo}
              alt="Probono Logo"
              className="img-responsive logo"
            />
          </Link>
        </div>

        <div className="navbar-right">
          <form id="navbar-search" className="navbar-form search-form">
            <input
              className="form-control"
              placeholder="Search here..."
              type="text"
            />
            <button type="button" className="btn btn-default">
              <i className="icon-magnifier"></i>
            </button>
          </form>

          <div id="navbar-menu">
            <ul className="nav navbar-nav">
              <li>
                <Link to="/notifications" className="icon-menu">
                  <i className="icon-bell"></i>
                  <span className="notification-dot"></span>
                </Link>
              </li>
              <li>
                <Link to="/" className="icon-menu">
                  <i className="icon-home"></i>
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="icon-menu"
                  style={{ background: "none", border: "none" }}
                >
                  <i className="icon-login"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  onPressSideMenuToggle: PropTypes.func,
};

export default Navbar;
