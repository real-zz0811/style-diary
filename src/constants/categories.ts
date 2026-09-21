import type { AccessoryPosition, Clothing, ClothingCategory } from '../types';

/** 单品分类的中文名称 */
export const categoryLabels: Record<ClothingCategory, string> = {
  top: '上装',
  bottom: '下装',
  shoe: '鞋子',
  accessory: '配饰',
};

/** 配饰佩戴位置的中文名称 */
export const accessoryPositionLabels: Record<AccessoryPosition, string> = {
  upper: '上身',
  lower: '下身',
};

/** 衣橱表单中的分类选择顺序 */
export const clothingCategoryOrder: ClothingCategory[] = ['top', 'bottom', 'shoe', 'accessory'];

/** 搭配长图中主体单品的槽位顺序 */
export const mainSlotKeys = ['top', 'bottom', 'shoe'] as const;

/** 配饰槽位：上身配饰位于长图左侧中上，下身配饰位于右侧中下 */
export const accessorySlotKeys = ['accessoryUpper', 'accessoryLower'] as const;

export type MainSlotKey = (typeof mainSlotKeys)[number];
export type AccessorySlotKey = (typeof accessorySlotKeys)[number];
export type OutfitSlotKey = MainSlotKey | AccessorySlotKey;

/** 搭配工坊中的槽位顺序：先主体，再配饰 */
export const outfitSlotOrder: OutfitSlotKey[] = [...mainSlotKeys, ...accessorySlotKeys];

/** 搭配槽位的中文名称 */
export const outfitSlotLabels: Record<OutfitSlotKey, string> = {
  top: '上装',
  bottom: '下装',
  shoe: '鞋子',
  accessoryUpper: '配饰·上身',
  accessoryLower: '配饰·下身',
};

/** 单品在衣橱中的展示名称，配饰会附带佩戴位置 */
export function getClothingLabel(item: Clothing): string {
  if (item.category === 'accessory') {
    return `配饰·${accessoryPositionLabels[item.accessoryPosition ?? 'upper']}`;
  }

  return categoryLabels[item.category];
}

/** 该单品可以放入的搭配槽位 */
export function getSlotsForClothing(item: Clothing): OutfitSlotKey[] {
  if (item.category === 'accessory') {
    return item.accessoryPosition === 'lower' ? ['accessoryLower'] : ['accessoryUpper'];
  }

  return [item.category];
}
