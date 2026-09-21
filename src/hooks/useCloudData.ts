import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
 */
function useCloudCollection<T extends { id: string }>(
  table: CloudTable,
  mapRowToItem: (row: CloudRow) => T,
  mapItemToRow: (item: T, userId: string) => CloudRow
): CloudCollection<T> {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
      if (deleteError) throw new Error(toReadableError(deleteError.message, '删除失败'));

      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [table, user]
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
 * 三个业务 hook
 * ------------------------------------------------------------------ */

/** 衣橱单品 */
export function useClothingCloud(): CloudCollection<Clothing> {
  return useCloudCollection('clothing', mapClothingRow, mapClothingToRow);
}

/** 搭配记录（含合成长图地址） */
export function useOutfitsCloud(): CloudCollection<Outfit> {
  return useCloudCollection('outfits', mapOutfitRow, mapOutfitToRow);
}

/** 灵感墙 */
export function useInspirationsCloud(): CloudCollection<Inspiration> {
  return useCloudCollection('inspirations', mapInspirationRow, mapInspirationToRow);
}
