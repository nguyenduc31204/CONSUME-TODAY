/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_R2_PUBLIC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
