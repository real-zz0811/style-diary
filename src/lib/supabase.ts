import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

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
