// src/layouts/MainLayout.js

import React from 'react';
import Navbar from '../components/navbar';
import Sidebar from '../components/Sidebar';

const MainLayout = ({ children, onPressSideMenuToggle }) => {
  return (
    <div id="wrapper">
      <Navbar onPressSideMenuToggle={onPressSideMenuToggle} />
      <Sidebar />
      <div id="main-content" style={{ marginLeft: '250px', marginTop: '67px' }}>
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
