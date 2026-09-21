import { supabase } from './supabase';
import { uploadDataUrl } from './imageStorage';
import type { Clothing, Inspiration, Outfit } from '../types';

/** 旧版本（纯浏览器本地存储）使用过的键 */
const LEGACY_KEYS = {
  clothing: 'style-diary-clothing',
  outfits: 'style-diary-outfits',
  outfitsWithImages: 'style-diary-outfits-images',
  inspirations: 'style-diary-inspirations',
} as const;

type LegacyOutfit = Outfit & { compositeImage?: string };

export interface LegacySnapshot {
  clothing: Clothing[];
  outfits: LegacyOutfit[];
  inspirations: Inspiration[];
}

export interface MigrationResult {
  clothing: number;
  outfits: number;
  inspirations: number;
  failed: number;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/** 读取旧版本遗留在浏览器里的全部数据 */
export function readLegacyData(): LegacySnapshot {
  // 搭配有两份历史数据：带长图的那份才是完整的，优先使用
  const outfitsWithImages = readArray<LegacyOutfit>(LEGACY_KEYS.outfitsWithImages);
  const outfits = outfitsWithImages.length > 0
    ? outfitsWithImages
    : readArray<LegacyOutfit>(LEGACY_KEYS.outfits);

  return {
    clothing: readArray<Clothing>(LEGACY_KEYS.clothing),
    outfits,
    inspirations: readArray<Inspiration>(LEGACY_KEYS.inspirations),
  };
}

export function hasLegacyData(snapshot: LegacySnapshot): boolean {
  return (
    snapshot.clothing.length > 0 ||
    snapshot.outfits.length > 0 ||
    snapshot.inspirations.length > 0
  );
}

export function countLegacyData(snapshot: LegacySnapshot): number {
  return snapshot.clothing.length + snapshot.outfits.length + snapshot.inspirations.length;
}

/** 把 base64 图片换成云端网址；已经是网址的原样返回 */
async function resolveImageUrl(imageUrl: string, userId: string): Promise<string> {
  if (!imageUrl) return '';
  return imageUrl.startsWith('data:') ? uploadDataUrl(imageUrl, userId) : imageUrl;
}

/**
 * 把旧版本的浏览器本地数据迁移到云端账号下
 *
 * 图片会压缩后上传到 Storage 并替换成网址，记录写入数据库。
 * 全部成功后才清理本地残留，任何一条失败都会保留本地数据以便重试。
 */
export async function migrateLegacyData(userId: string): Promise<MigrationResult> {
  const snapshot = readLegacyData();
  const result: MigrationResult = { clothing: 0, outfits: 0, inspirations: 0, failed: 0 };

  for (const item of snapshot.clothing) {
    try {
      const imageUrl = await resolveImageUrl(item.imageUrl, userId);
      const { error } = await supabase.from('clothing').insert({
        id: item.id,
        user_id: userId,
        name: item.name,
        category: item.category,
        accessory_position:
          item.category === 'accessory' ? item.accessoryPosition ?? 'upper' : null,
        image_url: imageUrl,
        created_at: item.createdAt,
      });
      if (error) throw new Error(error.message);
      result.clothing += 1;
    } catch (error) {
      console.error('迁移单品失败：', item.name, error);
      result.failed += 1;
    }
  }

  for (const item of snapshot.outfits) {
    try {
      const compositeImageUrl = item.compositeImage
        ? await resolveImageUrl(item.compositeImage, userId)
        : item.compositeImageUrl ?? null;

      const { error } = await supabase.from('outfits').insert({
        id: item.id,
        user_id: userId,
        top_id: item.topId ?? null,
        bottom_id: item.bottomId ?? null,
        shoe_id: item.shoeId ?? null,
        accessory_upper_id: item.accessoryUpperId ?? null,
        accessory_lower_id: item.accessoryLowerId ?? null,
        composite_image_url: compositeImageUrl,
        created_at: item.createdAt,
      });
      if (error) throw new Error(error.message);
      result.outfits += 1;
    } catch (error) {
      console.error('迁移搭配失败：', item.id, error);
      result.failed += 1;
    }
  }

  for (const item of snapshot.inspirations) {
    try {
      const imageUrl = await resolveImageUrl(item.imageUrl, userId);
      const { error } = await supabase.from('inspirations').insert({
        id: item.id,
        user_id: userId,
        image_url: imageUrl,
        note: item.note ?? '',
        created_at: item.createdAt,
      });
      if (error) throw new Error(error.message);
      result.inspirations += 1;
    } catch (error) {
      console.error('迁移灵感失败：', item.id, error);
      result.failed += 1;
    }
  }

  if (result.failed === 0) {
    clearLegacyData();
  }

  return result;
}

/** 清理旧版本遗留在浏览器里的数据 */
export function clearLegacyData(): void {
  Object.values(LEGACY_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
