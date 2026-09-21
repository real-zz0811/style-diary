import { useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useInspirationsCloud } from '../hooks/useCloudData';
import { useLongPress } from '../hooks/useLongPress';
import { generateId } from '../lib/id';
import type { Inspiration } from '../types';

export function InspirationWallPage() {
  const {
    items: inspirations,
    isLoading,
    error: loadError,
    add,
    remove,
  } = useInspirationsCloud();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: '',
    note: '',
  });
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 长按 / 右键删除：先弹确认框，确认后再删记录并清理云端图片
  const [deleteTarget, setDeleteTarget] = useState<Inspiration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSave = async () => {
    if (!formData.imageUrl || isSaving) return;

    const newItem: Inspiration = {
      id: generateId(),
      imageUrl: formData.imageUrl,
      note: formData.note.trim(),
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setSaveError('');
    try {
      // 先确认写入云端成功，再收起弹窗
      await add(newItem);
      setFormData({ imageUrl: '', note: '' });
      setIsModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({ imageUrl: '', note: '' });
    setSaveError('');
  };

  const handleRequestDelete = (item: Inspiration) => {
    setDeleteError('');
    setDeleteTarget(item);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      // 先确认云端删除成功，再收起确认框
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // Split into two columns for masonry layout
  const leftColumn: Inspiration[] = [];
  const rightColumn: Inspiration[] = [];
  inspirations.forEach((item, index) => {
    if (index % 2 === 0) leftColumn.push(item);
    else rightColumn.push(item);
  });

  return (
    <div className="min-h-full">
      <div className="px-6 py-5 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#2C2C2C]">灵感墙</h2>
          {inspirations.length > 0 && (
            <p className="mt-1 text-xs text-[#2C2C2C]/35">长按图片（电脑上可右键）可删除</p>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C]/90 transition-colors"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center px-8 py-20 gap-3">
          <Loader2 className="w-6 h-6 text-[#2C2C2C]/30 animate-spin" strokeWidth={1.5} />
          <p className="text-sm text-[#2C2C2C]/40">正在读取灵感墙…</p>
        </div>
      ) : loadError ? (
        <div className="px-8 py-16 text-center">
          <p className="text-sm text-[#B4553F] leading-relaxed">{loadError}</p>
        </div>
      ) : inspirations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-20">
          <div className="w-20 h-20 mb-8 rounded-full bg-[#F5F0E8] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#2C2C2C]/40" strokeWidth={1.5} />
          </div>
          <p className="text-[#2C2C2C]/50 text-center text-sm leading-relaxed max-w-xs">
            点击右上角收藏你的第一份灵感
          </p>
        </div>
      ) : (
        <div className="px-4 pb-6 flex gap-3">
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-3">
            {leftColumn.map((item, idx) => (
              <InspirationCard
                key={item.id}
                item={item}
                index={idx * 2}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-3">
            {rightColumn.map((item, idx) => (
              <InspirationCard
                key={item.id}
                item={item}
                index={idx * 2 + 1}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleClose} title="添加灵感">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              图片
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              onError={setSaveError}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              备注
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="记录灵感来源，如《繁花》唐嫣的垫肩西装"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-[#2C2C2C]/10 bg-transparent text-[#2C2C2C] placeholder:text-[#2C2C2C]/30 focus:outline-none focus:border-[#2C2C2C]/30 resize-none"
            />
          </div>

          {saveError && (
            <p className="px-4 py-3 rounded-lg bg-[#F5F0E8] text-sm text-[#B4553F] leading-relaxed">
              {saveError}
            </p>
          )}

          <button
            onClick={() => void handleSave()}
            disabled={!formData.imageUrl || isSaving}
            className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={handleCloseDelete} title="删除灵感">
        <div className="space-y-5">
          <p className="text-sm text-[#2C2C2C]/70 leading-relaxed">
            确定删除这张灵感图吗？云端图片会一起清理，此操作不可撤销。
          </p>

          {deleteError && (
            <p className="px-4 py-3 rounded-lg bg-[#F5F0E8] text-sm text-[#B4553F] leading-relaxed">
              {deleteError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCloseDelete}
              disabled={isDeleting}
              className="flex-1 py-3.5 rounded-full border border-[#2C2C2C]/20 text-sm font-medium text-[#2C2C2C]/70 hover:border-[#2C2C2C]/40 disabled:opacity-40 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting}
              className="flex-1 py-3.5 rounded-full bg-[#B4553F] text-white text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#B4553F]/90 transition-colors"
            >
              {isDeleting ? '删除中…' : '删除'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InspirationCard({
  item,
  index,
  onRequestDelete,
}: {
  item: Inspiration;
  index: number;
  onRequestDelete: (item: Inspiration) => void;
}) {
  // Alternate between different aspect ratios for masonry effect
  const aspectRatios = ['3/4', '4/5', '1/1', '4/3'];
  const aspectRatio = aspectRatios[index % aspectRatios.length];

  // 手机长按图片、电脑右键图片，都会打开删除确认框
  const { longPressProps } = useLongPress({ onTrigger: () => onRequestDelete(item) });

  return (
    <div className="bg-[#F5F0E8] rounded-xl overflow-hidden">
      <div
        {...longPressProps}
        className={`longpress-area overflow-hidden aspect-[${aspectRatio}]`}
        style={{ aspectRatio }}
      >
        <img
          src={item.imageUrl}
          alt={item.note || '灵感'}
          draggable={false}
          className="w-full h-full object-cover"
        />
      </div>
      {item.note && (
        <div className="px-3 py-2.5">
          <p className="text-sm text-[#2C2C2C] leading-relaxed line-clamp-2">
            {item.note}
          </p>
        </div>
      )}
    </div>
  );
}
