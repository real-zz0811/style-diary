import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { useInspirations } from '../hooks/useStyleDiary';
import { generateId } from '../hooks/useStyleDiary';
import type { Inspiration } from '../types';

export function InspirationWallPage() {
  const [inspirations, setInspirations] = useInspirations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: '',
    note: '',
  });

  const handleSave = () => {
    if (!formData.imageUrl) return;

    const newItem: Inspiration = {
      id: generateId(),
      imageUrl: formData.imageUrl,
      note: formData.note.trim(),
      createdAt: new Date().toISOString(),
    };

    setInspirations((prev) => [newItem, ...prev]);
    setFormData({ imageUrl: '', note: '' });
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({ imageUrl: '', note: '' });
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
        <h2 className="font-serif text-2xl text-[#2C2C2C]">灵感墙</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C]/90 transition-colors"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>
      </div>

      {inspirations.length === 0 ? (
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
              <InspirationCard key={item.id} item={item} index={idx * 2} />
            ))}
          </div>
          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-3">
            {rightColumn.map((item, idx) => (
              <InspirationCard key={item.id} item={item} index={idx * 2 + 1} />
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

          <button
            onClick={handleSave}
            disabled={!formData.imageUrl}
            className="w-full py-3.5 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>
    </div>
  );
}

function InspirationCard({ item, index }: { item: Inspiration; index: number }) {
  // Alternate between different aspect ratios for masonry effect
  const aspectRatios = ['3/4', '4/5', '1/1', '4/3'];
  const aspectRatio = aspectRatios[index % aspectRatios.length];

  return (
    <div className="bg-[#F5F0E8] rounded-xl overflow-hidden">
      <div className={`overflow-hidden aspect-[${aspectRatio}]`} style={{ aspectRatio }}>
        <img
          src={item.imageUrl}
          alt={item.note || '灵感'}
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
