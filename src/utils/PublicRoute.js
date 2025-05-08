// src/utils/PublicRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const PublicRoutes = () => {
  const { keycloak, initialized } = useKeycloak();
  if (!initialized) return null;

  return keycloak?.authenticated ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoutes;
