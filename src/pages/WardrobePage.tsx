import { useState } from 'react';
import { Plus, Palette } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useClothing } from '../hooks/useStyleDiary';
import { generateId } from '../hooks/useStyleDiary';
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
  const [clothing, setClothing] = useClothing();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm);

  const handleSave = () => {
    if (!formData.imageUrl || !formData.name.trim()) return;

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

    setClothing((prev) => [newItem, ...prev]);
    setFormData(createEmptyForm());
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData(createEmptyForm());
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

      {clothing.length === 0 ? (
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

          <button
            onClick={handleSave}
            disabled={!formData.imageUrl || !formData.name.trim()}
            className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>
    </div>
  );
}
