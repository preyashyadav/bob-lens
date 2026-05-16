/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_SANDBOX_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Made with Bob
