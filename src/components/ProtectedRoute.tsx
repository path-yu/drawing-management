import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { user, token } = useAuth();

  const hasToken = token || localStorage.getItem('token');

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
        <p className="mt-3 text-slate-500">加载中...</p>
      </div>
    );
  }

  if (permission && !user.permissions.includes(permission) && user.role_code !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">无权访问</h2>
        <p className="text-slate-500">您没有权限访问此页面</p>
      </div>
    );
  }

  return <>{children}</>;
}
