import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Toast from './components/Toast';
import SideNav from './components/SideNav';

/* User pages */
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Upgrade        from './pages/Upgrade';
import PaymentMethod  from './pages/PaymentMethod';
import Deposit        from './pages/Deposit';
import History        from './pages/History';
import Withdraw       from './pages/Withdraw';
import Profile        from './pages/Profile';
import EditProfile    from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import BindWallet     from './pages/BindWallet';
import Referral       from './pages/Referral';
import Notifications  from './pages/Notifications';
import Tutorials      from './pages/Tutorials';

/* Admin pages */
import AdminLogin            from './admin/AdminLogin';
import AdminDashboard        from './admin/AdminDashboard';
import AdminUsers            from './admin/AdminUsers';
import AdminTransactions     from './admin/AdminTransactions';
import AdminTiers            from './admin/AdminTiers';
import AdminSettings         from './admin/AdminSettings';
import AdminActivity         from './admin/AdminActivity';
import AdminProtectedRoute   from './admin/AdminProtectedRoute';

/* ── Boot loader ── */
function BootLoader() {
  return (
    <div className="boot-loader">
      <div className="boot-logo">Grid<span>miner</span></div>
      <div className="boot-spinner" />
    </div>
  );
}

/* ── User route guard (wraps in .user-app scope + desktop layout) ── */
function UserRoute({ children }) {
  const { user, authLoading } = useApp();
  if (authLoading) return <BootLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return (
    <div className="user-app">
      {/* SideNav only renders on desktop via CSS (display:none on mobile) */}
      <SideNav />
      {/* app-layout shifts content right on desktop */}
      <div className="app-layout">
        <div className="page-wrap">{children}</div>
      </div>
    </div>
  );
}

/* ── Public user route (login/register) ── */
function PublicUserRoute({ children }) {
  return <div className="user-app">{children}</div>;
}

function AppRoutes() {
  const { user, authLoading } = useApp();
  if (authLoading) return <BootLoader />;

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={
        !user ? <Navigate to="/login" replace /> :
        user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
        <Navigate to="/dashboard" replace />
      } />

      {/* Public user pages — scoped in .user-app */}
      <Route path="/login"     element={<PublicUserRoute><Login /></PublicUserRoute>} />
      <Route path="/register"  element={<PublicUserRoute><Register /></PublicUserRoute>} />
      <Route path="/tutorials" element={<PublicUserRoute><Tutorials /></PublicUserRoute>} />

      {/* Protected user pages — scoped in .user-app */}
      <Route path="/dashboard"       element={<UserRoute><Dashboard /></UserRoute>} />
      <Route path="/upgrade"         element={<UserRoute><Upgrade /></UserRoute>} />
      <Route path="/payment-method"  element={<UserRoute><PaymentMethod /></UserRoute>} />
      <Route path="/deposit/:type"   element={<UserRoute><Deposit /></UserRoute>} />
      <Route path="/history"         element={<UserRoute><History /></UserRoute>} />
      <Route path="/withdraw"        element={<UserRoute><Withdraw /></UserRoute>} />
      <Route path="/profile"         element={<UserRoute><Profile /></UserRoute>} />
      <Route path="/edit-profile"    element={<UserRoute><EditProfile /></UserRoute>} />
      <Route path="/change-password" element={<UserRoute><ChangePassword /></UserRoute>} />
      <Route path="/bind-wallet"     element={<UserRoute><BindWallet /></UserRoute>} />
      <Route path="/referral"        element={<UserRoute><Referral /></UserRoute>} />
      <Route path="/notifications"   element={<UserRoute><Notifications /></UserRoute>} />

      {/* Admin routes — NO .user-app wrapper; admin.css is self-scoped under .admin-shell */}
      <Route path="/admin"              element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login"        element={<AdminLogin />} />
      <Route path="/admin/dashboard"    element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/users"        element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
      <Route path="/admin/transactions" element={<AdminProtectedRoute><AdminTransactions /></AdminProtectedRoute>} />
      <Route path="/admin/tiers"        element={<AdminProtectedRoute><AdminTiers /></AdminProtectedRoute>} />
      <Route path="/admin/settings"     element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
      <Route path="/admin/activity"     element={<AdminProtectedRoute><AdminActivity /></AdminProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toast />
      </BrowserRouter>
    </AppProvider>
  );
}
