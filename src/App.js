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
import AurahusHeatmap from './views/AurahusHeatmap';
import DubElectricityDatavis from './views/DubElectricityDatavis';
import DubGasDatavis from './views/DubGasDatavis';
import PortoLot2Datavis from './views/PtLot2EnergyConsump';
import PortoLot4Production from './views/PortoLot4Production';
import Test from './views/test';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
       <ToastContainer position="top-center" autoClose={2000} hideProgressBar closeOnClick />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoutes />}>
          <Route
            path="/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route
            path="/"
            element={
              <MainLayout>
                <Home />
              </MainLayout>
            }
          />
          <Route
            path="/tools"
            element={
              <MainLayout>
                <ListOfTools />
              </MainLayout>
            }
          />
          <Route
            path="/data-visualizations"
            element={
              <MainLayout>
                <DataVisualizations />
              </MainLayout>
            }
          />
          <Route
            path="/dub-elec-visualizations"
            element={
              <MainLayout>
                <DubElectricityDatavis />
              </MainLayout>
            }
          />
          <Route
  path="/dub-gas-visualizations"
  element={
    <MainLayout>
      <DubGasDatavis />
    </MainLayout>
  }
/>
<Route
  path="/porto-lot2-consumption"
  element={
    <MainLayout>
      <PortoLot2Datavis />
    </MainLayout>
  }
/>

           <Route
            path="/test"
            element={
              <MainLayout>
                <Test />
              </MainLayout>
            }
          />
          <Route
            path="/data-aurahus"
            element={
              <MainLayout>
                <AurahusDataviz />
              </MainLayout>
            }
          />
          <Route
            path="/heatmap-aurahus"
            element={
              <MainLayout>
                <AurahusHeatmap />
              </MainLayout>
            }
          />
          <Route
  path="/porto-lot4-production"
  element={
    <MainLayout>
      <PortoLot4Production />
    </MainLayout>
  }
/>
          <Route
            path="/labs"
            element={
              <MainLayout>
                <ListOfLabs />
              </MainLayout>
            }
          />
          {/* updated: dynamic per-lab metrics route */}
          <Route
            path="/labs/:labId/metrics"
            element={
              <MainLayout>
                <EnvMetrics />
              </MainLayout>
            }
          />
          <Route
            path="/messages"
            element={
              <MainLayout>
                <Messages />
              </MainLayout>
            }
          />
          <Route
            path="/notifications"
            element={
              <MainLayout>
                <Notifications />
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout>
                <Settings />
              </MainLayout>
            }
          />

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <MainLayout>
                <h1>404 - Page Not Found</h1>
              </MainLayout>
            }
          />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
