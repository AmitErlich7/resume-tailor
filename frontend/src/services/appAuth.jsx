import {
  ClerkProvider,
  SignIn,
  UserButton,
  UserProfile,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from '@clerk/clerk-react'
import { createContext, useContext, useMemo, useState } from 'react'

export const TEST_AUTH_ENABLED = import.meta.env.VITE_E2E_BYPASS_AUTH === 'true'

const TEST_AUTH_STORAGE_KEY = 'resume-tailor-e2e-auth'

const TEST_USER = {
  id: 'user_test_123',
  firstName: 'Test',
  fullName: 'Test User',
  imageUrl: '',
  primaryEmailAddress: {
    emailAddress: 'test.user@example.com',
  },
  externalAccounts: [{ provider: 'google' }],
}

const TestAuthContext = createContext(null)

function getStoredSignedIn() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(TEST_AUTH_STORAGE_KEY) === 'signed-in'
}

function setStoredSignedIn(signedIn) {
  if (typeof window === 'undefined') return
  if (signedIn) {
    window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, 'signed-in')
  } else {
    window.localStorage.removeItem(TEST_AUTH_STORAGE_KEY)
  }
}

function TestAuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(getStoredSignedIn)

  const value = useMemo(
    () => ({
      isLoaded: true,
      isSignedIn,
      user: isSignedIn ? TEST_USER : null,
      getToken: async () => (isSignedIn ? 'test-token' : null),
      signIn: () => {
        setStoredSignedIn(true)
        setIsSignedIn(true)
      },
      signOut: () => {
        setStoredSignedIn(false)
        setIsSignedIn(false)
      },
    }),
    [isSignedIn],
  )

  return (
    <TestAuthContext.Provider value={value}>
      {children}
    </TestAuthContext.Provider>
  )
}

function useTestAuthContext() {
  const value = useContext(TestAuthContext)
  if (!value) {
    throw new Error('Test auth context is missing.')
  }
  return value
}

export function AppAuthProvider({ publishableKey, children }) {
  if (TEST_AUTH_ENABLED) {
    return <TestAuthProvider>{children}</TestAuthProvider>
  }

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/login">
      {children}
    </ClerkProvider>
  )
}

export function useAppUser() {
  if (TEST_AUTH_ENABLED) {
    const { isLoaded, isSignedIn, user } = useTestAuthContext()
    return { isLoaded, isSignedIn, user }
  }

  return useClerkUser()
}

export function useAppAuth() {
  if (TEST_AUTH_ENABLED) {
    const { getToken } = useTestAuthContext()
    return { getToken }
  }

  return useClerkAuth()
}

export function AppSignIn(props) {
  if (TEST_AUTH_ENABLED) {
    const { signIn } = useTestAuthContext()
    return (
      <button
        type="button"
        onClick={signIn}
        data-testid="test-sign-in"
        style={{
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          padding: '12px 16px',
          background: '#2563eb',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Continue as Test User
      </button>
    )
  }

  return <SignIn {...props} />
}

export function AppUserButton({ afterSignOutUrl }) {
  if (TEST_AUTH_ENABLED) {
    const { user, signOut } = useTestAuthContext()
    return (
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '999px',
          padding: '8px 12px',
          background: '#fff',
          color: '#0f172a',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Sign out {user?.firstName || ''}
      </button>
    )
  }

  return <UserButton afterSignOutUrl={afterSignOutUrl} />
}

export function AppUserProfile(props) {
  if (TEST_AUTH_ENABLED) {
    return (
      <div
        data-testid="test-user-profile"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          background: '#fff',
          padding: '24px',
          color: '#475569',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        Account settings are bypassed in end-to-end test mode.
      </div>
    )
  }

  return <UserProfile {...props} />
}
