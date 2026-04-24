import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ClerkSetup from './pages/ClerkSetup.jsx'
import { setTokenProvider } from './services/api.js'
import {
  AppAuthProvider,
  TEST_AUTH_ENABLED,
  useAppAuth,
} from './services/appAuth.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

/**
 * TokenBridge wires the Clerk getToken function into the API service layer.
 * It re-runs whenever auth state changes so the token stays fresh.
 */
function TokenBridge({ children }) {
  const { getToken } = useAppAuth()

  useEffect(() => {
    setTokenProvider(() => getToken())
  }, [getToken])

  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {PUBLISHABLE_KEY || TEST_AUTH_ENABLED ? (
      <AppAuthProvider publishableKey={PUBLISHABLE_KEY}>
        <TokenBridge>
          <App />
        </TokenBridge>
      </AppAuthProvider>
    ) : (
      <ClerkSetup />
    )}
  </React.StrictMode>,
)
