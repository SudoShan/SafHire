import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import PostJob from './pages/PostJob';
import EmployerProfile from './pages/EmployerProfile';
import MyJobs from './pages/MyJobs';
import MyApplications from './pages/MyApplications';
import StudentProfile from './pages/StudentProfile';
import AdminPanel from './pages/AdminPanel';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CDCDashboard from './pages/CDCDashboard';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />

          {/* Protected: Any authenticated user */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* Protected: Students */}
          <Route path="/profile" element={
            <ProtectedRoute roles={['student', 'alumni']}><StudentProfile /></ProtectedRoute>
          } />
          <Route path="/my-applications" element={
            <ProtectedRoute roles={['student', 'alumni']}><MyApplications /></ProtectedRoute>
          } />

          {/* Protected: Employers */}
          <Route path="/post-job" element={
            <ProtectedRoute roles={['employer']}><PostJob /></ProtectedRoute>
          } />
          <Route path="/my-jobs" element={
            <ProtectedRoute roles={['employer']}><MyJobs /></ProtectedRoute>
          } />
          <Route path="/employer-profile" element={
            <ProtectedRoute roles={['employer']}><EmployerProfile /></ProtectedRoute>
          } />

          {/* Protected: Super Admin */}
          <Route path="/super-admin" element={
            <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>
          } />

          {/* Protected: CDC Admin */}
          <Route path="/cdc" element={
            <ProtectedRoute roles={['cdc_admin']}><CDCDashboard /></ProtectedRoute>
          } />
          
          {/* Legacy generic admin redirect */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['super_admin', 'cdc_admin', 'admin']}><SuperAdminDashboard /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
