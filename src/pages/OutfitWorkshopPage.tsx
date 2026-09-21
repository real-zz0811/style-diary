import { useState, useRef } from 'react';
import { Shirt, Eye, Download, X, Loader2 } from 'lucide-react';
import { useClothingCloud, useOutfitsCloud } from '../hooks/useCloudData';
import { generateId } from '../lib/id';
import { uploadDataUrl } from '../lib/imageStorage';
import { useAuth } from '../contexts/AuthContext';
import {
  getClothingLabel,
  getSlotsForClothing,
  mainSlotKeys,
  outfitSlotLabels,
  outfitSlotOrder,
} from '../constants/categories';
import type { OutfitSlotKey } from '../constants/categories';
import type { Clothing, Outfit } from '../types';

/** 长图中主体单品的绘制尺寸 */
const MAIN_IMAGE_WIDTH = 400;
const MAIN_IMAGE_HEIGHT = 500;
/** 长图内边距与边框 */
const CANVAS_PADDING = 20;
const CANVAS_BORDER = 4;
/** 配饰浮层尺寸、圆角与白色相框留白 */
const ACCESSORY_SIZE = 150;
const ACCESSORY_RADIUS = 18;
const ACCESSORY_FRAME = 8;
/** 配饰与主体图之间的间隙：配饰绘制在主体图外侧，不遮挡主体 */
const ACCESSORY_GAP = 24;
/** 配饰垂直位置：上身位于长图上部四分之一处，下身位于下部四分之三处 */
const ACCESSORY_UPPER_RATIO = 0.25;
const ACCESSORY_LOWER_RATIO = 0.75;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/** 以 cover 方式居中绘制图片，保证不变形 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  ctx.drawImage(
    image,
    x + (width - scaledWidth) / 2,
    y + (height - scaledHeight) / 2,
    scaledWidth,
    scaledHeight
  );
}

/** 圆角矩形路径，用于配饰浮层的白色相框与圆角裁剪 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function OutfitWorkshopPage() {
  const { user } = useAuth();
  const {
    items: clothing,
    isLoading: isClothingLoading,
    error: clothingError,
  } = useClothingCloud();
  const { items: outfits, add: addOutfit } = useOutfitsCloud();
  const [slots, setSlots] = useState<Record<OutfitSlotKey, Clothing | null>>({
    top: null,
    bottom: null,
    shoe: null,
    accessoryUpper: null,
    accessoryLower: null,
  });
  const [selectedItem, setSelectedItem] = useState<Clothing | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filledSlotCount = outfitSlotOrder.filter((key) => slots[key]).length;
  const hasMainItem = mainSlotKeys.some((key) => slots[key]);
  // 至少选择两件单品，且其中包含一件主体单品（上装 / 下装 / 鞋子）即可合成
  const canSave = filledSlotCount >= 2 && hasMainItem;
  const missingSlotCount = Math.max(0, 2 - filledSlotCount);

  const handleItemSelect = (item: Clothing) => {
    setSelectedItem(item);
  };

  const handleAssignSlot = (key: OutfitSlotKey) => {
    if (selectedItem) {
      setSlots((prev) => ({ ...prev, [key]: selectedItem }));
      setSelectedItem(null);
    }
  };

  const handleClearSlot = (key: OutfitSlotKey, e: React.MouseEvent) => {
    e.stopPropagation();
    setSlots((prev) => ({ ...prev, [key]: null }));
  };

  const renderSlot = (key: OutfitSlotKey, isAccessory = false) => (
    <div className="flex-1">
      <div
        className={`${isAccessory ? 'aspect-square' : 'aspect-[4/5]'} rounded-xl overflow-hidden relative ${
          slots[key] ? 'bg-white' : 'bg-white/50 border-2 border-dashed border-[#2C2C2C]/10'
        }`}
      >
        {slots[key] ? (
          <>
            <img
              src={slots[key]!.imageUrl}
              alt={outfitSlotLabels[key]}
              className="w-full h-full object-cover"
            />
            <button
              onClick={(e) => handleClearSlot(key, e)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center px-1">
            <span className="text-xs text-[#2C2C2C]/30 text-center leading-tight">
              {outfitSlotLabels[key]}
            </span>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-[#2C2C2C]/50 mt-2">{outfitSlotLabels[key]}</p>
    </div>
  );

  const handleSaveOutfit = async () => {
    if (!canSave || isSaving) return;

    if (!user) {
      setSaveError('登录状态已失效，请重新登录');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsSaving(true);
    setSaveError('');

    // 主体单品按固定顺序竖排，只绘制已选中的
    const mainItems = mainSlotKeys
      .map((key) => slots[key])
      .filter((item): item is Clothing => item !== null);

    // 配饰绘制在主体图外侧，因此按需在左右两侧预留出一条配饰列的宽度
    const accessoryColumnWidth = ACCESSORY_SIZE + ACCESSORY_GAP;
    const leftReserve = slots.accessoryUpper ? accessoryColumnWidth : 0;
    const rightReserve = slots.accessoryLower ? accessoryColumnWidth : 0;

    const contentX = CANVAS_PADDING + CANVAS_BORDER + leftReserve;
    const contentY = CANVAS_PADDING + CANVAS_BORDER;
    const contentWidth = MAIN_IMAGE_WIDTH;
    const contentHeight = MAIN_IMAGE_HEIGHT * mainItems.length;

    const totalWidth =
      contentWidth + leftReserve + rightReserve + (CANVAS_PADDING + CANVAS_BORDER) * 2;
    const totalHeight = contentHeight + (CANVAS_PADDING + CANVAS_BORDER) * 2;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // 白色背景与阴影
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 细边框
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = CANVAS_BORDER;
    ctx.strokeRect(
      CANVAS_BORDER / 2,
      CANVAS_BORDER / 2,
      totalWidth - CANVAS_BORDER,
      totalHeight - CANVAS_BORDER
    );

    try {
      const [mainImages, accessoryUpperImage, accessoryLowerImage] = await Promise.all([
        Promise.all(mainItems.map((item) => loadImage(item.imageUrl))),
        slots.accessoryUpper ? loadImage(slots.accessoryUpper.imageUrl) : Promise.resolve(null),
        slots.accessoryLower ? loadImage(slots.accessoryLower.imageUrl) : Promise.resolve(null),
      ]);

      // 1. 主体单品竖排绘制
      mainImages.forEach((image, index) => {
        const y = contentY + index * MAIN_IMAGE_HEIGHT;

        ctx.save();
        ctx.beginPath();
        ctx.rect(contentX, y, MAIN_IMAGE_WIDTH, MAIN_IMAGE_HEIGHT);
        ctx.clip();
        drawCoverImage(ctx, image, contentX, y, MAIN_IMAGE_WIDTH, MAIN_IMAGE_HEIGHT);
        ctx.restore();

        // 单品之间的分隔线
        if (index < mainImages.length - 1) {
          ctx.strokeStyle = '#F0F0F0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(contentX, y + MAIN_IMAGE_HEIGHT);
          ctx.lineTo(contentX + MAIN_IMAGE_WIDTH, y + MAIN_IMAGE_HEIGHT);
          ctx.stroke();
        }
      });

      // 2. 配饰浮层：绘制在主体图外侧，上身靠左中上，下身靠右中下
      const accessoryLayers = [
        {
          image: accessoryUpperImage,
          x: CANVAS_PADDING + CANVAS_BORDER,
          centerY: contentHeight * ACCESSORY_UPPER_RATIO,
        },
        {
          image: accessoryLowerImage,
          x: contentX + contentWidth + ACCESSORY_GAP,
          centerY: contentHeight * ACCESSORY_LOWER_RATIO,
        },
      ];

      accessoryLayers.forEach(({ image, x, centerY }) => {
        if (!image) return;

        const y = Math.round(contentY + centerY - ACCESSORY_SIZE / 2);

        // 白色相框与投影
        ctx.save();
        drawRoundRect(
          ctx,
          x - ACCESSORY_FRAME,
          y - ACCESSORY_FRAME,
          ACCESSORY_SIZE + ACCESSORY_FRAME * 2,
          ACCESSORY_SIZE + ACCESSORY_FRAME * 2,
          ACCESSORY_RADIUS + ACCESSORY_FRAME
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.restore();

        // 圆角裁剪绘制配饰图
        ctx.save();
        drawRoundRect(ctx, x, y, ACCESSORY_SIZE, ACCESSORY_SIZE, ACCESSORY_RADIUS);
        ctx.clip();
        drawCoverImage(ctx, image, x, y, ACCESSORY_SIZE, ACCESSORY_SIZE);
        ctx.restore();

        // 极细描边
        drawRoundRect(ctx, x, y, ACCESSORY_SIZE, ACCESSORY_SIZE, ACCESSORY_RADIUS);
        ctx.strokeStyle = 'rgba(44, 44, 44, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 长图上传到云端存储，数据库里只保存网址
      const compositeDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const compositeImageUrl = await uploadDataUrl(compositeDataUrl, user.id);

      const newOutfit: Outfit = {
        id: generateId(),
        compositeImageUrl,
        createdAt: new Date().toISOString(),
      };
      if (slots.top) newOutfit.topId = slots.top.id;
      if (slots.bottom) newOutfit.bottomId = slots.bottom.id;
      if (slots.shoe) newOutfit.shoeId = slots.shoe.id;
      if (slots.accessoryUpper) newOutfit.accessoryUpperId = slots.accessoryUpper.id;
      if (slots.accessoryLower) newOutfit.accessoryLowerId = slots.accessoryLower.id;

      await addOutfit(newOutfit);

      setSlots({
        top: null,
        bottom: null,
        shoe: null,
        accessoryUpper: null,
        accessoryLower: null,
      });
    } catch (error) {
      console.error('生成搭配长图失败：', error);
      setSaveError(error instanceof Error ? error.message : '生成长图失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 有长图的历史搭配（更早的数据可能只有记录没有图，这里自动过滤）
  const savedOutfits = outfits.filter((outfit) => outfit.compositeImageUrl);

  return (
    <div className="min-h-full">
      <div className="px-6 py-5">
        <h2 className="font-serif text-2xl text-[#2C2C2C]">搭配工坊</h2>
      </div>

      {/* Preview Area */}
      <div className="px-4 mb-6">
        <div className="bg-[#F5F0E8] rounded-2xl p-4">
          {/* 主体：上装 / 下装 / 鞋子 */}
          <div className="flex gap-3">
            {mainSlotKeys.map((key) => renderSlot(key))}
          </div>

          {/* 配饰：位于主体图外侧，上身靠左中上，下身靠右中下 */}
          <div className="flex gap-3 mt-4 items-stretch">
            {renderSlot('accessoryUpper', true)}
            <div className="flex-1 flex items-center justify-center px-1">
              <p className="text-[10px] text-[#2C2C2C]/30 text-center leading-relaxed">
                配饰位于
                <br />
                长图两侧
              </p>
            </div>
            {renderSlot('accessoryLower', true)}
          </div>

          <button
            onClick={() => void handleSaveOutfit()}
            disabled={!canSave || isSaving}
            className="w-full mt-4 py-3 bg-[#2C2C2C] text-white rounded-full text-sm font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2C2C2C]/90 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                正在生成并上传…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" strokeWidth={1.5} />
                保存这套搭配
              </>
            )}
          </button>

          {saveError && (
            <p className="mt-3 px-4 py-3 rounded-lg bg-white text-sm text-[#B4553F] leading-relaxed">
              {saveError}
            </p>
          )}

          {!canSave && (
            <p className="mt-3 text-center text-xs text-[#2C2C2C]/40 leading-relaxed">
              {missingSlotCount > 0
                ? `再选择 ${missingSlotCount} 件单品即可合成搭配长图`
                : '配饰需要搭配至少一件上装、下装或鞋子'}
            </p>
          )}
        </div>
      </div>

      {/* Material Area */}
      <div className="px-4">
        <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">选择单品</h3>
        {isClothingLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 text-[#2C2C2C]/30 animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-[#2C2C2C]/40">正在读取衣橱…</p>
          </div>
        ) : clothingError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#B4553F] leading-relaxed">{clothingError}</p>
          </div>
        ) : clothing.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 mb-4 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <Shirt className="w-6 h-6 text-[#2C2C2C]/40" strokeWidth={1.5} />
            </div>
            <p className="text-[#2C2C2C]/50 text-sm">先去衣橱添加一些单品吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {clothing.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item)}
                className="aspect-square rounded-lg overflow-hidden bg-[#F5F0E8] hover:ring-2 ring-[#2C2C2C]/30 transition-all"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {savedOutfits.length > 0 && (
        <div className="px-4 mt-8 pb-6">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">历史搭配记录</h3>
          <div className="grid grid-cols-3 gap-3">
            {savedOutfits.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => setLightboxImage(outfit.compositeImageUrl!)}
                className="aspect-[3/4] rounded-xl overflow-hidden bg-[#F5F0E8] relative group"
              >
                <img
                  src={outfit.compositeImageUrl}
                  alt="搭配"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection Popup */}
      {selectedItem && (
        <div className="fixed inset-x-0 bottom-20 px-4 z-40">
          <div className="bg-white rounded-2xl shadow-lg p-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F5F0E8]">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-[#2C2C2C] font-medium">{selectedItem.name}</p>
                <p className="text-sm text-[#2C2C2C]/50">{getClothingLabel(selectedItem)}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F0E8]"
              >
                <X className="w-4 h-4 text-[#2C2C2C]/60" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex gap-2">
              {getSlotsForClothing(selectedItem).map((key) => (
                <button
                  key={key}
                  onClick={() => handleAssignSlot(key)}
                  className="flex-1 py-2.5 rounded-full bg-[#2C2C2C] text-white text-sm font-medium hover:bg-[#2C2C2C]/90 transition-colors"
                >
                  设为{outfitSlotLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>
          <img
            src={lightboxImage}
            alt="搭配详情"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
