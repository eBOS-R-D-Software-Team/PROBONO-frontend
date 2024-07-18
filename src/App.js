import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './views/Login';
import Home from './views/Home';
import DataVisualizations from './views/DataVisualizations';
import Messages from './views/Messages';
import Notifications from './views/Notifications';
import Settings from './views/Settings';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import ProtectedRoutes from './utils/ProtectedRoute';
import PublicRoutes from './utils/PublicRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoutes />}>
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/data-visualizations" element={<MainLayout><DataVisualizations /></MainLayout>} />
          <Route path="/messages" element={<MainLayout><Messages /></MainLayout>} />
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
