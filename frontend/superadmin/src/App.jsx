import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken, homePathForRole, isSuperAdmin } from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import Packages from './pages/Packages';
import Leads from './pages/Leads';
import Staff from './pages/Staff';
import Sms from './pages/Sms';
import Monitoring from './pages/Monitoring';

function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function RequireSuper({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!isSuperAdmin()) return <Navigate to="/leads" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequireSuper>
              <Dashboard />
            </RequireSuper>
          }
        />
        <Route
          path="/sites"
          element={
            <RequireSuper>
              <Sites />
            </RequireSuper>
          }
        />
        <Route
          path="/packages"
          element={
            <RequireSuper>
              <Packages />
            </RequireSuper>
          }
        />
        <Route path="/leads" element={<Leads />} />
        <Route
          path="/staff"
          element={
            <RequireSuper>
              <Staff />
            </RequireSuper>
          }
        />
        <Route
          path="/sms"
          element={
            <RequireSuper>
              <Sms />
            </RequireSuper>
          }
        />
        <Route
          path="/monitoring"
          element={
            <RequireSuper>
              <Monitoring />
            </RequireSuper>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={homePathForRole()} replace />} />
    </Routes>
  );
}
