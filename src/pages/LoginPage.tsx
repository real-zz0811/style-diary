import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signIn' | 'signUp';

const inputClassName =
  'w-full px-4 py-3 rounded-lg border border-[#2C2C2C]/10 bg-transparent text-[#2C2C2C] placeholder:text-[#2C2C2C]/30 focus:outline-none focus:border-[#2C2C2C]/30';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');

    if (mode === 'signUp' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 位');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-9">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#F5F0E8] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#2C2C2C]/50" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl text-[#2C2C2C] tracking-widest">
            STYLE DIARY
          </h1>
          <p className="mt-2 text-sm text-[#2C2C2C]/40">记录你的每一套搭配</p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['signIn', 'signUp'] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={`flex-1 py-2.5 rounded-full border text-sm font-medium transition-all ${
                mode === item
                  ? 'border-[#2C2C2C] bg-[#2C2C2C] text-white'
                  : 'border-[#2C2C2C]/20 text-[#2C2C2C]/60 hover:border-[#2C2C2C]/40'
              }`}
            >
              {item === 'signIn' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            autoComplete="email"
            required
            className={inputClassName}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            required
            className={inputClassName}
          />

          {mode === 'signUp' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再输一次密码"
              autoComplete="new-password"
              required
              className={inputClassName}
            />
          )}

          {error && (
            <p className="px-4 py-3 rounded-lg bg-[#F5F0E8] text-sm text-[#B4553F] leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            {isSubmitting ? '处理中…' : mode === 'signIn' ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#2C2C2C]/35 leading-relaxed">
          内容保存在你的专属账号下
          <br />
          换设备登录同一个账号，记录依然都在
        </p>
      </div>
    </div>
  );
}
