import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import Packages from './pages/Packages';
import Leads from './pages/Leads';
import Sms from './pages/Sms';
import Monitoring from './pages/Monitoring';

function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/sms" element={<Sms />} />
        <Route path="/monitoring" element={<Monitoring />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
