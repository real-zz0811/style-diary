import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { removeImageByUrl } from '../lib/imageStorage';
import { useAuth } from '../contexts/AuthContext';
import type {
  AccessoryPosition,
  Clothing,
  ClothingCategory,
  Inspiration,
  Outfit,
} from '../types';

type CloudTable = 'clothing' | 'outfits' | 'inspirations';
type CloudRow = Record<string, unknown>;

export interface CloudCollection<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  add: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

/** 把 Supabase 返回的英文报错转成用户看得懂的中文 */
function toReadableError(message: string, fallback: string): string {
  if (/failed to fetch|network/i.test(message)) {
    return '网络连接失败，请检查网络后重试';
  }
  if (/jwt expired|invalid claim|invalid token/i.test(message)) {
    return '登录状态已过期，请重新登录';
  }
  if (/row-level security|permission denied/i.test(message)) {
    return '没有权限访问这些数据';
  }
  return `${fallback}：${message}`;
}

/**
 * 通用云端集合 hook
 *
 * 读取当前登录用户的全部记录（行级安全策略保证只能拿到自己的数据），
 * 并支持新增与删除。写入采用"先落库、再更新界面"的顺序，
 * 避免出现本地显示成功、云端其实没存上的情况。
 *
 * 删除记录后会顺手清理该记录占用的云端图片（见 getImageUrls），
 * 失败只记警告，不影响记录本身已删除的事实。
 */
function useCloudCollection<T extends { id: string }>(
  table: CloudTable,
  mapRowToItem: (row: CloudRow) => T,
  mapItemToRow: (item: T, userId: string) => CloudRow,
  getImageUrls: (item: T) => string[]
): CloudCollection<T> {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 删除记录前要先读到它携带的图片地址，用 ref 存一份最新列表，
  // 这样不必把 items 写进 useCallback 依赖，回调保持稳定
  const itemsRef = useRef<T[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const reload = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(toReadableError(queryError.message, '读取失败'));
      setItems([]);
    } else {
      setItems((data ?? []).map((row) => mapRowToItem(row as CloudRow)));
    }

    setIsLoading(false);
  }, [table, user, mapRowToItem]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (item: T) => {
      if (!user) throw new Error('请先登录');

      const { error: insertError } = await supabase
        .from(table)
        .insert(mapItemToRow(item, user.id));

      if (insertError) throw new Error(toReadableError(insertError.message, '保存失败'));

      setItems((prev) => [item, ...prev]);
    },
    [table, user, mapItemToRow]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) throw new Error('请先登录');

      const target = itemsRef.current.find((item) => item.id === id);

      const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
      if (deleteError) throw new Error(toReadableError(deleteError.message, '删除失败'));

      setItems((prev) => prev.filter((item) => item.id !== id));

      // 记录已经删掉了，再顺手清理它占用的云端图片。
      // 故意不 await：图片删除失败不该让用户以为"记录没删掉"，
      // removeImageByUrl 内部也只记一条警告，不会抛错。
      if (target) {
        for (const url of getImageUrls(target)) {
          void removeImageByUrl(url);
        }
      }
    },
    [table, user, getImageUrls]
  );

  return { items, isLoading, error, add, remove, reload };
}

/* ------------------------------------------------------------------
 * 字段映射：数据库列名（snake_case） ↔ 前端类型（camelCase）
 * 放在模块级是为了保证函数引用稳定，避免触发 hook 重复请求
 * ------------------------------------------------------------------ */

const mapClothingRow = (row: CloudRow): Clothing => {
  const category = (row.category ?? 'top') as ClothingCategory;
  const item: Clothing = {
    id: String(row.id),
    name: String(row.name ?? ''),
    category,
    imageUrl: String(row.image_url ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };

  if (category === 'accessory' && row.accessory_position) {
    item.accessoryPosition = row.accessory_position as AccessoryPosition;
  }

  return item;
};

const mapClothingToRow = (item: Clothing, userId: string): CloudRow => ({
  id: item.id,
  user_id: userId,
  name: item.name,
  category: item.category,
  accessory_position:
    item.category === 'accessory' ? item.accessoryPosition ?? 'upper' : null,
  image_url: item.imageUrl,
  created_at: item.createdAt,
});

const mapOutfitRow = (row: CloudRow): Outfit => {
  const item: Outfit = {
    id: String(row.id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };

  if (row.top_id) item.topId = String(row.top_id);
  if (row.bottom_id) item.bottomId = String(row.bottom_id);
  if (row.shoe_id) item.shoeId = String(row.shoe_id);
  if (row.accessory_upper_id) item.accessoryUpperId = String(row.accessory_upper_id);
  if (row.accessory_lower_id) item.accessoryLowerId = String(row.accessory_lower_id);
  if (row.composite_image_url) item.compositeImageUrl = String(row.composite_image_url);

  return item;
};

const mapOutfitToRow = (item: Outfit, userId: string): CloudRow => ({
  id: item.id,
  user_id: userId,
  top_id: item.topId ?? null,
  bottom_id: item.bottomId ?? null,
  shoe_id: item.shoeId ?? null,
  accessory_upper_id: item.accessoryUpperId ?? null,
  accessory_lower_id: item.accessoryLowerId ?? null,
  composite_image_url: item.compositeImageUrl ?? null,
  created_at: item.createdAt,
});

const mapInspirationRow = (row: CloudRow): Inspiration => ({
  id: String(row.id),
  imageUrl: String(row.image_url ?? ''),
  note: String(row.note ?? ''),
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

const mapInspirationToRow = (item: Inspiration, userId: string): CloudRow => ({
  id: item.id,
  user_id: userId,
  image_url: item.imageUrl,
  note: item.note,
  created_at: item.createdAt,
});

/* ------------------------------------------------------------------
 * 每条记录占用了哪些云端图片：删除记录时按这里的返回结果清理
 *
 * 搭配记录只清理自己的合成长图 —— 长图是独立文件，里面出现的单品照片
 * 属于单品记录，绝不能跟着一起删。同样放在模块级保持引用稳定。
 * ------------------------------------------------------------------ */

const getClothingImageUrls = (item: Clothing): string[] => [item.imageUrl];

const getOutfitImageUrls = (item: Outfit): string[] =>
  item.compositeImageUrl ? [item.compositeImageUrl] : [];

const getInspirationImageUrls = (item: Inspiration): string[] => [item.imageUrl];

/* ------------------------------------------------------------------
 * 三个业务 hook
 * ------------------------------------------------------------------ */

/** 衣橱单品 */
export function useClothingCloud(): CloudCollection<Clothing> {
  return useCloudCollection('clothing', mapClothingRow, mapClothingToRow, getClothingImageUrls);
}

/** 搭配记录（含合成长图地址） */
export function useOutfitsCloud(): CloudCollection<Outfit> {
  return useCloudCollection('outfits', mapOutfitRow, mapOutfitToRow, getOutfitImageUrls);
}

/** 灵感墙 */
export function useInspirationsCloud(): CloudCollection<Inspiration> {
  return useCloudCollection(
    'inspirations',
    mapInspirationRow,
    mapInspirationToRow,
    getInspirationImageUrls
  );
}
