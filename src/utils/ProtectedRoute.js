// src/utils/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const ProtectedRoutes = () => {
  const { keycloak, initialized } = useKeycloak();

  // optional splash/loader while Keycloak initialises
  if (!initialized) return null;
  //console.log('KC', initialized, keycloak?.authenticated, keycloak.token);

  return keycloak?.authenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoutes;
