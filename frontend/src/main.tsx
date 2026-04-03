import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Sync token from persisted localStorage → cookie on app boot.
// Cookie is required for <img> tags to authenticate with the image proxy
// (img.src requests cannot send custom headers, but cookies work automatically).
const COOKIE_NAME = 'memoir_token'
const stored = localStorage.getItem('memoir-auth')
if (stored) {
  try {
    const parsed = JSON.parse(stored)
    if (parsed.state?.accessToken) {
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(parsed.state.accessToken)}; max-age=${60 * 60 * 8}; path=/; SameSite=Lax`
    }
  } catch {
    // ignore parse errors
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
