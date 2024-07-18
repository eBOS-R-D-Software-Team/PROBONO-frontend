import React from 'react';
import { useSelector } from 'react-redux';
import { Outlet, Navigate } from 'react-router-dom';

const ProtectedRoutes = () => {
  const isLoggedIn = useSelector((state) => state.login.isLoggedIn);

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoutes;
