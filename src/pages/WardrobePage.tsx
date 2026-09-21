import { useState } from 'react';
import { Loader2, Plus, Palette } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useClothingCloud } from '../hooks/useCloudData';
import { generateId } from '../lib/id';
import {
  accessoryPositionLabels,
  categoryLabels,
  clothingCategoryOrder,
  getClothingLabel,
} from '../constants/categories';
import type { AccessoryPosition, Clothing, ClothingCategory } from '../types';

const accessoryPositionOrder: AccessoryPosition[] = ['upper', 'lower'];

const createEmptyForm = () => ({
  imageUrl: '',
  name: '',
  category: 'top' as ClothingCategory,
  accessoryPosition: 'upper' as AccessoryPosition,
});

export function WardrobePage() {
  const { items: clothing, isLoading, error, add } = useClothingCloud();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.imageUrl || !formData.name.trim() || isSaving) return;

    const newItem: Clothing = {
      id: generateId(),
      name: formData.name.trim(),
      category: formData.category,
      imageUrl: formData.imageUrl,
      createdAt: new Date().toISOString(),
    };

    if (formData.category === 'accessory') {
      newItem.accessoryPosition = formData.accessoryPosition;
    }

    setIsSaving(true);
    setUploadError('');
    try {
      // 先确认写入云端成功，再收起弹窗，避免"看着存上了其实没存上"
      await add(newItem);
      setFormData(createEmptyForm());
      setIsModalOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData(createEmptyForm());
    setUploadError('');
  };

  return (
    <div className="min-h-full">
      <div className="px-6 py-5 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[#2C2C2C]">我的衣橱</h2>
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
          <p className="text-sm text-[#2C2C2C]/40">正在读取衣橱…</p>
        </div>
      ) : error ? (
        <div className="px-8 py-16 text-center">
          <p className="text-sm text-[#B4553F] leading-relaxed">{error}</p>
        </div>
      ) : clothing.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-20">
          <div className="w-20 h-20 mb-8 rounded-full bg-[#F5F0E8] flex items-center justify-center">
            <Palette className="w-8 h-8 text-[#2C2C2C]/40" strokeWidth={1.5} />
          </div>
          <p className="text-[#2C2C2C]/50 text-center text-sm leading-relaxed max-w-xs">
            点击右上角添加你的第一件单品
          </p>
        </div>
      ) : (
        <div className="px-4 pb-6 grid grid-cols-2 gap-3">
          {clothing.map((item) => (
            <div
              key={item.id}
              className="bg-[#F5F0E8] rounded-xl overflow-hidden"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-3 py-2.5">
                <span className="text-xs text-[#2C2C2C]/60">
                  {getClothingLabel(item)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleClose} title="添加单品">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              图片
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              onError={setUploadError}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如：廓形西装"
              className="w-full px-4 py-3 rounded-lg border border-[#2C2C2C]/10 bg-transparent text-[#2C2C2C] placeholder:text-[#2C2C2C]/30 focus:outline-none focus:border-[#2C2C2C]/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              分类
            </label>
            <div className="grid grid-cols-4 gap-2">
              {clothingCategoryOrder.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category }))}
                  className={`py-2.5 rounded-full border text-sm font-medium transition-all ${
                    formData.category === category
                      ? 'border-[#2C2C2C] bg-[#2C2C2C] text-white'
                      : 'border-[#2C2C2C]/20 text-[#2C2C2C]/60 hover:border-[#2C2C2C]/40'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>

            {formData.category === 'accessory' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
                  佩戴位置
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {accessoryPositionOrder.map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, accessoryPosition: position }))
                      }
                      className={`py-2.5 rounded-full border text-sm font-medium transition-all ${
                        formData.accessoryPosition === position
                          ? 'border-[#2C2C2C] bg-[#2C2C2C] text-white'
                          : 'border-[#2C2C2C]/20 text-[#2C2C2C]/60 hover:border-[#2C2C2C]/40'
                      }`}
                    >
                      {accessoryPositionLabels[position]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#2C2C2C]/40 leading-relaxed">
                  上身配饰会出现在搭配长图左侧，下身配饰出现在右侧
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="px-4 py-3 rounded-lg bg-[#F5F0E8] text-sm text-[#B4553F] leading-relaxed">
              {uploadError}
            </p>
          )}

          <button
            onClick={() => void handleSave()}
            disabled={!formData.imageUrl || !formData.name.trim() || isSaving}
            className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
