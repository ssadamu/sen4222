"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useNavigate } from "react-router-dom"

import { checkSession, refreshToken } from "./services/auth"

// Layout & Pages
import DashboardLayout from "./layouts/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import Accounts from "./pages/Accounts"
import PricingGroups from "./pages/PricingGroups"
import RegisteredAccounts from "./pages/RegisteredAccounts"
import RegisteredAccountDetail from "./pages/RegisteredAccountDetail"
import BulkSms from "./pages/BulkSms"
import MultiSms from "./pages/MultiSms"
import Login from "./pages/Login"
import Register from "./pages/Register"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 300000,
    },
  },
})

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 bg-red-50 text-red-700">
      <h2 className="text-lg font-semibold">Something went wrong:</h2>
      <p className="mt-2">{error.message}</p>
      <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
        Try Again
      </button>
    </div>
  )
}

function App() {
  const [authState, setAuthState] = useState({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const verifySession = async () => {
      try {
        const session = await checkSession()
        setAuthState({
          authenticated: session.authenticated,
          user: session.user || null,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error("Session verification error:", error)
        setAuthState({
          authenticated: false,
          user: null,
          loading: false,
          error: error.message,
        })
      }
    }

    verifySession()
  }, [])

  const handleLogin = (userData) => {
    setAuthState({
      authenticated: true,
      user: userData,
      loading: false,
      error: null,
    })
  }

  const handleLogout = () => {
    setAuthState({
      authenticated: false,
      user: null,
      loading: false,
      error: null,
    })
  }

  if (authState.loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes 
            authState={authState} 
            onLogin={handleLogin} 
            onLogout={handleLogout} 
          />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Separate component for routes that uses useNavigate
function AppRoutes({ authState, onLogin, onLogout }) {
  const navigate = useNavigate()

  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const session = await refreshToken()
        if (!session.authenticated) {
          navigate('/login')
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        navigate('/login')
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [navigate])

  const renderProtected = (PageComponent) => (
    <ProtectedRoute authState={authState}>
      <DashboardLayout user={authState.user} onLogout={onLogout}>
        <PageComponent />
      </DashboardLayout>
    </ProtectedRoute>
  )

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          !authState.authenticated ? (
            <Login onLogin={onLogin} error={authState.error} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/register"
        element={
          !authState.authenticated ? (
            <Register onSuccess={onLogin} error={authState.error} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Protected Routes */}
      <Route path="/dashboard" element={renderProtected(Dashboard)} />
      <Route path="/clients" element={renderProtected(Clients)} />
      <Route path="/accounts" element={renderProtected(Accounts)} />
      <Route path="/pricing-groups" element={renderProtected(PricingGroups)} />
      <Route path="/registered-accounts" element={renderProtected(RegisteredAccounts)} />
      <Route
        path="/registered-accounts/detailed/:accountNumber"
        element={renderProtected(RegisteredAccountDetail)}
      />
      <Route path="/bulk-sms" element={renderProtected(BulkSms)} />
      <Route path="/multi-sms" element={renderProtected(MultiSms)} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to={authState.authenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={authState.authenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

const ProtectedRoute = ({ authState, children }) => {
  if (!authState.authenticated) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }
  return children
}

export default App
