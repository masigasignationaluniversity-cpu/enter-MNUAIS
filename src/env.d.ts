/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTER_ANALYTICS_ENABLED?: string;
  readonly VITE_ENTER_ANALYTICS_TOKEN?: string;
  readonly VITE_ENTER_PROJECT_ID?: string;
  readonly VITE_ENTER_ANALYTICS_ENDPOINT?: string;
  readonly VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT?: string;
  readonly VITE_ENTER_ANALYTICS_DEBUG?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
