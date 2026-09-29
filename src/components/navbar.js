// src/components/Navbar.js

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useKeycloak } from "@react-keycloak/web";

import Logo from "../assets/images/PB_logo_org.png";
import searchIndex from "../config/searchIndex";


const Navbar = ({ onPressSideMenuToggle }) => {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  // =========================================================
  // SEARCH STATE
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Reference to the entire search form
  const searchRef = useRef(null);


  // =========================================================
  // SIDE MENU
  // =========================================================

  const handleToggleSideMenu = () => {
    if (onPressSideMenuToggle) {
      onPressSideMenuToggle();
    }
  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    keycloak.logout({
      redirectUri: window.location.origin + "/login"
    });
  };


  // =========================================================
  // CLOSE SEARCH WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the click happened outside the search form,
      // close the search results dropdown.
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup when component is unmounted
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  // =========================================================
  // SEARCH LOGIC
  // =========================================================

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return searchIndex
      .filter((item) => {
        const searchableText = [
          item.title,
          item.category,
          ...(item.keywords || [])
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 8);
  }, [searchTerm]);


  // =========================================================
  // SEARCH INPUT CHANGE
  // =========================================================

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setSearchTerm(value);

    // Only display results when there is something to search
    setShowResults(value.trim().length > 0);
  };


  // =========================================================
  // SEARCH INPUT FOCUS
  // =========================================================

  const handleSearchFocus = () => {
    // Reopen results when the user clicks back into
    // the search field and there is already a query.
    if (searchTerm.trim()) {
      setShowResults(true);
    }
  };


  // =========================================================
  // RESULT CLICK
  // =========================================================

  const handleResultClick = (item) => {
    // Clear and close the search
    setSearchTerm("");
    setShowResults(false);

    // Internal React route
    if (item.path) {
      navigate(item.path);
      return;
    }

    // External PROBONO tool
    if (item.link) {
      window.open(
        item.link,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };


  // =========================================================
  // SEARCH SUBMIT
  // =========================================================

  const handleSubmit = (event) => {
    event.preventDefault();

    // If there are results, pressing Enter
    // opens the first matching result.
    if (searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <nav className="navbar navbar-fixed-top">
      <div className="container-fluid">

        {/* ===================================================
            SIDE MENU BUTTON
            =================================================== */}

        <div className="navbar-btn">
          <button
            className="btn-toggle-offcanvas"
            onClick={handleToggleSideMenu}
            type="button"
          >
            <i className="lnr lnr-menu fa fa-bars"></i>
          </button>
        </div>


        {/* ===================================================
            LOGO
            =================================================== */}

        <div className="navbar-brand">
          <Link to="/">
            <img
              src={Logo}
              alt="Probono Logo"
              className="img-responsive logo"
            />
          </Link>
        </div>


        {/* ===================================================
            RIGHT SIDE
            =================================================== */}

        <div className="navbar-right">

          {/* =================================================
              SEARCH
              ================================================= */}

          <form
            id="navbar-search"
            className="navbar-form search-form"
            onSubmit={handleSubmit}
            ref={searchRef}
          >

            <input
              className="form-control"
              placeholder="Search here..."
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              autoComplete="off"
              aria-label="Search PROBONO"
            />

            <button
              type="submit"
              className="btn btn-default"
              aria-label="Search"
            >
              <i className="icon-magnifier"></i>
            </button>


            {/* ===============================================
                SEARCH RESULTS
                =============================================== */}

            {showResults && (
              <div className="navbar-search-results">

                {searchResults.length > 0 ? (

                  searchResults.map((item) => (

                    <button
                      type="button"
                      key={`${item.title}-${item.path || item.link}`}
                      className="navbar-search-result"
                      onClick={() => handleResultClick(item)}
                    >

                      {/* Result icon */}

                      <div className="navbar-search-result-icon">
                        <i className="icon-magnifier"></i>
                      </div>


                      {/* Result information */}

                      <div className="navbar-search-result-content">

                        <span className="navbar-search-result-title">
                          {item.title}
                        </span>

                        <span className="navbar-search-result-category">
                          {item.category}
                        </span>

                      </div>


                      {/* Result arrow */}

                      <div className="navbar-search-result-arrow">
                        ›
                      </div>

                    </button>

                  ))

                ) : (

                  <div className="navbar-search-no-results">
                    No results found for "{searchTerm}"
                  </div>

                )}

              </div>
            )}

          </form>


          {/* =================================================
              NAVBAR MENU
              ================================================= */}

          <div id="navbar-menu">

            <ul className="nav navbar-nav">

              {/* Home */}

              <li>
                <Link
                  to="/"
                  className="icon-menu"
                  aria-label="Home"
                >
                  <i className="icon-home"></i>
                </Link>
              </li>


              {/* Logout */}

              <li>
                <button
                  onClick={handleLogout}
                  className="icon-menu"
                  type="button"
                  aria-label="Logout"
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