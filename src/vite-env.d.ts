/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** 老控制台的 anon key（eyJ 开头） */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** 新控制台的 publishable key（sb_publishable_ 开头），与 anon key 等价 */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

