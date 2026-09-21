import { createClient } from '@supabase/supabase-js';

/**
 * 读取环境变量，取第一个真正有值的（去掉首尾空白）。
 *
 * 这里不能直接用 `?? ` 兜底：在 `.env.local` 里写了 `VITE_SUPABASE_ANON_KEY=`（留空）
 * 拿到的是空字符串而不是 undefined，`??` 会让这个空值直接胜出，
 * 于是另一个变量永远读不到。空串/纯空格都当作"没配置"跳过。
 */
function readEnv(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

const supabaseUrl = readEnv(import.meta.env.VITE_SUPABASE_URL);

/**
 * 可公开的客户端密钥。
 * Supabase 新控制台叫 publishable key（sb_publishable_ 开头），
 * 老控制台叫 anon key（eyJ 开头），两者等价，这里两个变量名都认。
 */
const supabaseAnonKey = readEnv(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

/**
 * 是否已完成云端配置。
 * 未配置时不会抛异常导致白屏，而是由 App 显示一段配置说明。
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase 客户端（数据库 + 认证 + 图片存储）
 *
 * 未配置时用占位地址兜底，避免 createClient 抛错；
 * 此时 isSupabaseConfigured 为 false，界面会引导用户去配置。
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/** 图片存储桶名称，需与 supabase/schema.sql 中创建的一致 */
export const STORAGE_BUCKET = 'style-diary';
