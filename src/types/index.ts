export type ClothingCategory = 'top' | 'bottom' | 'shoe' | 'accessory';

/** 配饰的佩戴位置：上身配饰位于搭配长图左侧，下身配饰位于长图右侧 */
export type AccessoryPosition = 'upper' | 'lower';

export interface Clothing {
  id: string;
  name: string;
  category: ClothingCategory;
  /** 仅配饰分类使用 */
  accessoryPosition?: AccessoryPosition;
  imageUrl: string;
  createdAt: string;
}

export interface Outfit {
  id: string;
  topId?: string;
  bottomId?: string;
  shoeId?: string;
  accessoryUpperId?: string;
  accessoryLowerId?: string;
  /** 合成长图的云端地址（生成搭配时上传到对象存储后写入） */
  compositeImageUrl?: string;
  createdAt: string;
}

export interface Inspiration {
  id: string;
  imageUrl: string;
  note: string;
  createdAt: string;
}
