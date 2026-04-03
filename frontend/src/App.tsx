import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import Home from '@/pages/Home'
import Journal from '@/pages/Journal'
import Reports from '@/pages/Reports'
import Profile from '@/pages/Profile'
import EditProfile from '@/pages/EditProfile'
import WalletManagement from '@/pages/WalletManagement'
import CategoryManagement from '@/pages/CategoryManagement'
import Settings from '@/pages/Settings'
import TransactionDetail from '@/pages/TransactionDetail'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/authStore'

/** Guard: redirects to /login if not authenticated or if token is expired */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isTokenValid = useAuthStore((s) => s.isTokenValid)

  if (!isAuthenticated || !isTokenValid()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Auth pages — no AppShell (no bottom nav, no overlays) */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>

      {/* Main app — wrapped in AppShell with bottom nav */}
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/wallets"
            element={
              <RequireAuth>
                <WalletManagement />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/categories"
            element={
              <RequireAuth>
                <CategoryManagement />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <RequireAuth>
                <EditProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <RequireAuth>
                <TransactionDetail />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
