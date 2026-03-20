/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AbsensiSiswa from './pages/AbsensiSiswa';
import RekapAbsensi from './pages/RekapAbsensi';
import DataSiswa from './pages/DataSiswa';
import DataKelas from './pages/DataKelas';
import UserManagement from './pages/UserManagement';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/app" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="absensi-siswa" element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <AbsensiSiswa />
              </ProtectedRoute>
            } />
            
            <Route path="rekap-absensi" element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <RekapAbsensi />
              </ProtectedRoute>
            } />
            
            <Route path="data-siswa" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataSiswa />
              </ProtectedRoute>
            } />
            
            <Route path="data-kelas" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataKelas />
              </ProtectedRoute>
            } />
            
            <Route path="user-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
