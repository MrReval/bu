import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken, getUser } from '../../shared/api';
import { ToastProvider } from './context/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Staff from './pages/Staff';
import Gallery from './pages/Gallery';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Notifications from './pages/Notifications';
import SmsSettings from './pages/SmsSettings';
import PaymentSettings from './pages/PaymentSettings';
import DepositReceipts from './pages/DepositReceipts';
import Accounting from './pages/Accounting';
import CustomerClub from './pages/CustomerClub';
import Surveys from './pages/Surveys';
import QrCode from './pages/QrCode';
import BaleReport from './pages/BaleReport';

function Private({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!user || !['super_admin', 'manager', 'staff'].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Private>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/club" element={<CustomerClub />} />
                  <Route path="/surveys" element={<Surveys />} />
                  <Route path="/qrcode" element={<QrCode />} />
                  <Route path="/sms" element={<SmsSettings />} />
                  <Route path="/payment" element={<PaymentSettings />} />
                  <Route path="/deposit-receipts" element={<DepositReceipts />} />
                  <Route path="/bale" element={<BaleReport />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </Private>
          }
        />
      </Routes>
    </ToastProvider>
  );
}
