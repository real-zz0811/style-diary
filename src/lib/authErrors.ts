/**
 * Supabase 认证错误信息中文化
 *
 * Supabase 返回的都是英文提示，这里做一层映射，
 * 让登录/注册页直接显示用户看得懂的说明。
 */
const errorMessages: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码不正确',
  'Email not confirmed': '邮箱还没验证，请先去邮箱点确认链接',
  'User already registered': '这个邮箱已经注册过了，直接登录即可',
  'Password should be at least 6 characters': '密码至少需要 6 位',
  'Signups not allowed for this instance': '该站点未开放注册',
  'Email rate limit exceeded': '邮件发送过于频繁，请稍后再试',
  'Unable to validate email address: invalid format': '邮箱格式不正确',
  'Email address is invalid': '邮箱格式不正确',
  'New password should be different from the old password': '新密码不能和旧密码相同',
  'Auth session missing!': '登录状态已失效，请重新登录',
  'Database error saving new user': '注册失败，请稍后重试',
};

export function translateAuthError(message: string): string {
  const trimmed = message.trim();

  if (errorMessages[trimmed]) return errorMessages[trimmed];

  // 部分错误带前后缀，用包含匹配兜底
  const partial = Object.keys(errorMessages).find((key) => trimmed.includes(key));
  if (partial) return errorMessages[partial];

  if (/network|fetch|failed to fetch/i.test(trimmed)) {
    return '网络连接失败，请检查网络后重试';
  }

  return trimmed;
}
