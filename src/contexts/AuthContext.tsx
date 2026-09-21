import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/authErrors';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** 首次读取本地会话期间为 true，避免登录页一闪而过 */
  isInitializing: boolean;
  /** 是否已完成 Supabase 配置（.env.local 中的两个变量） */
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isActive = true;

    // 1. 读取已持久化的会话：关掉浏览器再打开，仍然是登录状态
    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return;
      setSession(data.session);
      setIsInitializing(false);
    });

    // 2. 监听后续的登录 / 登出 / 令牌自动刷新
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);
      setIsInitializing(false);
    });

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(translateAuthError(error.message));

    // 没拿到会话说明还没真正登录，必须给出明确原因，
    // 否则用户点了"注册并登录"却什么都不发生。
    if (!data.session) {
      // 邮箱已注册过时，Supabase 为了防止探测账号，也会"成功"返回但不给会话，
      // 特征就是 identities 为空数组
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('这个邮箱已经注册过了，请切换到"登录"');
      }
      throw new Error(
        '注册成功，请先点邮箱里的确认链接再登录（或在 Supabase 控制台关闭 Confirm email 免去这一步）'
      );
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isInitializing,
      isConfigured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
    }),
    [session, isInitializing, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 <AuthProvider> 内部使用');
  }
  return context;
}
