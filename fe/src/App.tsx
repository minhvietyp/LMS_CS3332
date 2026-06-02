import { Navigate, Routes } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuth } from './context/AuthContext';
import { getDefaultRouteForRole } from './utils/authRedirect';
import { AdminRoutes } from './routes/adminRoutes';
import { AuthRoutes } from './routes/authRoutes';
import { ClientRoutes } from './routes/clientRoutes';
import { PublicRoutes } from './routes/publicRoutes';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

function App() {
  return (
    <Layout className="app-shell">
      <Routes>
        {PublicRoutes({ fallbackElement: <RootRedirect /> })}
        {AuthRoutes()}
        {ClientRoutes()}
        {AdminRoutes()}
      </Routes>
    </Layout>
  );
}

export default App;
