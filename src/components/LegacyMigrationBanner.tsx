import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  countLegacyData,
  hasLegacyData,
  migrateLegacyData,
  readLegacyData,
} from '../lib/migrateLocalData';

/**
 * 旧版本（纯浏览器本地存储）数据的一键上云横幅
 *
 * 登录后如果发现浏览器里还留着老数据，就在顶部提示一次。
 * 全部导入成功才清除本地数据，然后刷新页面让各页面读到云端数据；
 * 只要有一条失败就保留本地数据，方便再点一次重试。
 */
export function LegacyMigrationBanner() {
  const { user } = useAuth();
  // 启动时读一次即可：迁移成功后我们会直接刷新页面，
  // 不需要在导入过程中保持快照同步
  const [snapshot] = useState(readLegacyData);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user || isDismissed || !hasLegacyData(snapshot)) return null;

  const handleMigrate = async () => {
    if (isMigrating) return;

    setIsMigrating(true);
    setMessage('');
    setError('');
    try {
      const result = await migrateLegacyData(user.id);

      if (result.failed === 0) {
        // 本地数据已被自动清除，刷新一次让各页面读到云端数据
        window.location.reload();
        return;
      }

      setMessage(
        `已导入 ${result.clothing} 件单品、${result.outfits} 套搭配、${result.inspirations} 张灵感图`
      );
      setError(`有 ${result.failed} 条导入失败，本地数据已保留，可再点一次重试`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="mx-4 mt-4 px-4 py-4 rounded-xl bg-[#F5F0E8]">
      <div className="flex items-start gap-3">
        <Upload className="w-4 h-4 mt-0.5 text-[#2C2C2C]/50 shrink-0" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-sm text-[#2C2C2C] leading-relaxed">
            检测到本机有 {countLegacyData(snapshot)} 条旧记录尚未上云
          </p>
          <p className="mt-1 text-xs text-[#2C2C2C]/50 leading-relaxed">
            {snapshot.clothing.length} 件单品 · {snapshot.outfits.length} 套搭配 ·{' '}
            {snapshot.inspirations.length} 张灵感图
          </p>

          {message && (
            <p className="mt-2 text-xs text-[#2C2C2C]/60 leading-relaxed">{message}</p>
          )}
          {error && <p className="mt-2 text-xs text-[#B4553F] leading-relaxed">{error}</p>}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleMigrate()}
              disabled={isMigrating}
              className="px-4 py-2 rounded-full bg-[#2C2C2C] text-white text-xs font-medium tracking-wide flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
            >
              {isMigrating && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />}
              {isMigrating ? '导入中…' : '导入到云端'}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              disabled={isMigrating}
              className="px-3 py-2 text-xs text-[#2C2C2C]/50 hover:text-[#2C2C2C] disabled:opacity-40 transition-colors"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
