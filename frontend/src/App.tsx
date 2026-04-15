import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationsPage from './pages/ApplicationsPage';
import NewApplicationPage from './pages/NewApplicationPage';
import QuestionnairePage from './pages/QuestionnairePage';
import ApprovalQueuePage from './pages/ApprovalQueuePage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import UsersPage from './pages/admin/UsersPage';
import MasterDataPage from './pages/admin/MasterDataPage';
import ApprovalMatrixPage from './pages/admin/ApprovalMatrixPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.primaryRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="applications/:id/questionnaire" element={<QuestionnairePage />} />
        <Route path="approval-queue" element={<ApprovalQueuePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Admin routes */}
        <Route path="admin">
          <Route path="users" element={
            <RoleRoute roles={['ADMIN']}><UsersPage /></RoleRoute>
          } />
          <Route path="master-data" element={
            <RoleRoute roles={['ADMIN']}><MasterDataPage /></RoleRoute>
          } />
          <Route path="approval-matrix" element={
            <RoleRoute roles={['ADMIN']}><ApprovalMatrixPage /></RoleRoute>
          } />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
