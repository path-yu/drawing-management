import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { RoleManagementPage } from './pages/RoleManagementPage';
import { ShareManagementPage } from './pages/ShareManagementPage';
import { ExternalShareView } from './pages/ExternalShareView';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute permission="drawing:view">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute permission="user:manage">
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute permission="role:manage">
                  <RoleManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shares"
              element={
                <ProtectedRoute permission="share:manage">
                  <ShareManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="/share/internal/:id" element={
              <ProtectedRoute permission="drawing:view">
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/share/:token" element={<ExternalShareView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
