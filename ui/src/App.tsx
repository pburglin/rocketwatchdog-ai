import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { useControlPlane } from './hooks/useControlPlane';
import { DashboardPage } from './pages/DashboardPage';
import { TrafficPage } from './pages/TrafficPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ReferencesPage } from './pages/ReferencesPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PerformancePage } from './pages/PerformancePage';

function AppShell() {
  const auth = useAuth();
  const controlPlane = useControlPlane();

  if (!auth.user) {
    return <LoginScreen />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage auth={auth} controlPlane={controlPlane} />} />
        <Route path="/traffic" element={<TrafficPage controlPlane={controlPlane} />} />
        <Route path="/performance" element={<PerformancePage controlPlane={controlPlane} />} />
        <Route
          path="/policies"
          element={<PoliciesPage auth={auth} controlPlane={controlPlane} />}
        />
        <Route
          path="/references"
          element={<ReferencesPage controlPlane={controlPlane} />}
        />
        <Route
          path="/integrations"
          element={<IntegrationsPage controlPlane={controlPlane} />}
        />
        <Route
          path="/settings"
          element={<SettingsPage auth={auth} controlPlane={controlPlane} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
