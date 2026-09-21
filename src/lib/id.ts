/**
 * 生成一条记录的 id
 *
 * 用作数据库主键，同时作为云端图片路径之外的业务标识。
 * 时间戳 + 随机串，重复概率可忽略。
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
