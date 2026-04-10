import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Analytics from './pages/Analytics';
import Appeals from './pages/Appeals';
import CampusDrives from './pages/CampusDrives';
import CDCDashboard from './pages/CDCDashboard';
import CDCWorkspace from './pages/CDCWorkspace';
import CollegeSetup from './pages/CollegeSetup';
import Dashboard from './pages/Dashboard';
import DiscussionThread from './pages/DiscussionThread';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployerProfile from './pages/EmployerProfile';
import JobDetail from './pages/JobDetail';
import Jobs from './pages/Jobs';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyApplications from './pages/MyApplications';
import MyJobs from './pages/MyJobs';
import Notifications from './pages/Notifications';
import PostJob from './pages/PostJob';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StudentInvitations from './pages/StudentInvitations';
import StudentProfile from './pages/StudentProfile';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1e2d47',
              color: '#e2e8f0',
              borderRadius: '14px',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e2d47' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e2d47' },
            },
          }}
        />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['student', 'alumni']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute roles={['student', 'alumni']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/applications"
            element={
              <ProtectedRoute roles={['student', 'alumni']}>
                <MyApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/invitations"
            element={
              <ProtectedRoute roles={['student', 'alumni']}>
                <StudentInvitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/campus-drives"
            element={
              <ProtectedRoute roles={['student', 'alumni']}>
                <CampusDrives />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employer"
            element={
              <ProtectedRoute roles={['employer']}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/profile"
            element={
              <ProtectedRoute roles={['employer']}>
                <EmployerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/post-job"
            element={
              <ProtectedRoute roles={['employer']}>
                <PostJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs"
            element={
              <ProtectedRoute roles={['employer']}>
                <MyJobs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cdc"
            element={
              <ProtectedRoute roles={['cdc_admin']}>
                <CDCDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cdc/workspace"
            element={
              <ProtectedRoute roles={['cdc_admin']}>
                <CDCWorkspace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/colleges"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <CollegeSetup />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute roles={['student', 'alumni', 'employer', 'cdc_admin', 'super_admin']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appeals"
            element={
              <ProtectedRoute roles={['employer', 'super_admin']}>
                <Appeals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['student', 'alumni', 'cdc_admin', 'super_admin']}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id/discussion"
            element={
              <ProtectedRoute roles={['student', 'alumni', 'employer', 'cdc_admin', 'super_admin']}>
                <DiscussionThread />
              </ProtectedRoute>
            }
          />

          <Route path="/admin" element={<Navigate replace to="/dashboard" />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
