import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AdminProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user)                return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}
