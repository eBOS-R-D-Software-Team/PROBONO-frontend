import React from 'react';
import { useSelector } from 'react-redux';
import { Outlet, Navigate } from 'react-router-dom';

const PublicRoutes = () => {
  const isLoggedIn = useSelector((state) => state.login.isLoggedIn);

  return isLoggedIn ? <Navigate to="/" /> : <Outlet />;
};

export default PublicRoutes;
