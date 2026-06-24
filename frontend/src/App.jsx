import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './component/ProtectedRoute'

import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import Report from './pages/Report'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { NotFoundComponent } from './pages/Root'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Semi-public: home visible to all, upload works best when logged in */}
          <Route path="/" element={<Home />} />

          {/* Protected routes: require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundComponent />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
