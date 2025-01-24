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
import ListOfTools from './views/ListOfTools';
import ListOfLabs from './views/ListOfLabs';
import EnvMetrics from './views/EnvMetrics';
import AurahusDataviz from './views/AurahusDataviz';


<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
  integrity="sha512-xwEVDtyg5Qnuq+v+8gqpd1RsvxaS6mHct9TfNUC9MRwO2R9MfTaeFzs4Bq6dd4HTV52TJPu6QAKHerc2trJQ=="
  crossorigin=""
/>

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
          <Route path="/tools" element={<MainLayout><ListOfTools /></MainLayout>} />
          <Route path="/data-visualizations" element={<MainLayout><DataVisualizations /></MainLayout>} />
          <Route path="/data-aurahus" element={<MainLayout><AurahusDataviz /></MainLayout>} />
          <Route path="/labs" element={<MainLayout><ListOfLabs/></MainLayout>} />
          <Route path="/metrics" element={<MainLayout><EnvMetrics/></MainLayout>} />
          <Route path="/messages" element={<MainLayout><Messages /></MainLayout>} />
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
