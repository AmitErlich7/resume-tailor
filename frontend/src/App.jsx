import { useAuth } from '@clerk/clerk-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './components/AuthGuard.jsx'
import Account from './pages/Account.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Tailor from './pages/Tailor.jsx'
import Versions from './pages/Versions.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/account/*"
          element={
            <AuthGuard>
              <Account />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          }
        />
        <Route
          path="/tailor"
          element={
            <AuthGuard>
              <Tailor />
            </AuthGuard>
          }
        />
        <Route
          path="/tailor/:id"
          element={
            <AuthGuard>
              <Tailor />
            </AuthGuard>
          }
        />
        <Route
          path="/versions"
          element={
            <AuthGuard>
              <Versions />
            </AuthGuard>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
