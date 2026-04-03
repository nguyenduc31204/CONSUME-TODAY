import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at?: string
}

const COOKIE_NAME = 'memoir_token'

/** Buffer time (ms) before actual expiry to trigger logout — gives 1-minute grace */
const EXPIRY_BUFFER_MS = 60 * 1000

function _setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; max-age=${60 * 60 * 8}; path=/; SameSite=Lax`
}

function _clearCookie() {
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  /** Unix timestamp (ms) when the access token expires — set on login / refresh */
  tokenExpiresAt: number | null
  /** Internal flag to skip expiry check after a deliberate logout */
  _logoutInProgress: boolean
  setUser: (user: User | null) => void
  /** Stores token AND computes its expiry from the JWT payload */
  setAccessToken: (token: string | null) => void
  /** Checks whether the stored token has expired (with buffer). Returns true if still valid. */
  isTokenValid: () => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      tokenExpiresAt: null,
      _logoutInProgress: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (token) => {
        if (token) {
          _setCookie(token)
          const expiresAt = _getTokenExpiry(token)
          set({ accessToken: token, tokenExpiresAt: expiresAt, isAuthenticated: true })
        } else {
          _clearCookie()
          set({ accessToken: null, tokenExpiresAt: null, isAuthenticated: false })
        }
      },

      isTokenValid: () => {
        const state = get()
        // No token stored
        if (!state.accessToken || !state.tokenExpiresAt) return false
        // Already logged out deliberately
        if (state._logoutInProgress) return false
        // Token has expired (with buffer)
        return Date.now() < state.tokenExpiresAt - EXPIRY_BUFFER_MS
      },

      logout: () => {
        _clearCookie()
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          tokenExpiresAt: null,
          _logoutInProgress: true,
        })
      },
    }),
    {
      name: 'memoir-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        tokenExpiresAt: state.tokenExpiresAt,
        // Do NOT persist _logoutInProgress — it should reset on page reload
      }),
    },
  ),
)

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Decode the `exp` claim from a JWT and return its expiry as a Unix timestamp (ms). */
function _getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // JWT `exp` is in seconds; convert to ms
    return (payload.exp as number) * 1000
  } catch {
    return 0
  }
}
