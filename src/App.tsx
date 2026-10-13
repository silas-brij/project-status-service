import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { Layout, LayoutSkeleton } from './components/Layout'
import { SetupNotice } from './components/SetupNotice'
import { isSupabaseConfigured } from './lib/supabase'
import { DashboardPage } from './pages/DashboardPage'
import { OverviewTab } from './pages/project/OverviewTab'
import { PaymentsTab } from './pages/project/PaymentsTab'
import { ProjectLayout } from './pages/project/ProjectLayout'
import { SprintsTab } from './pages/project/SprintsTab'
import { StandupsTab } from './pages/project/StandupsTab'
import { PageSkeleton } from './pages/skeletons'

export function App() {
  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth
                fallback={
                  <LayoutSkeleton>
                    <PageSkeleton />
                  </LayoutSkeleton>
                }
              >
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<OverviewTab />} />
              <Route path="standups" element={<StandupsTab />} />
              <Route path="sprints" element={<SprintsTab />} />
              <Route path="payments" element={<PaymentsTab />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
