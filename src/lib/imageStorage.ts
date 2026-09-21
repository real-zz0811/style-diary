import { STORAGE_BUCKET, supabase } from './supabase';

/** 压缩目标：长边不超过该像素数 */
const MAX_IMAGE_SIZE = 1600;
/** JPEG 压缩质量 */
const JPEG_QUALITY = 0.85;

function translateStorageError(message: string): string {
  if (/row-level security|policy/i.test(message)) return '没有权限上传图片，请重新登录后再试';
  if (/already exists/i.test(message)) return '图片已存在，请重试';
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) {
    return '图片体积过大，建议换一张更小的图片';
  }
  if (/failed to fetch|network/i.test(message)) return '网络连接失败，请检查网络后重试';
  return `图片上传失败：${message}`;
}

function loadImageFromObjectUrl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败，请换一张图片试试'));
    };
    image.src = objectUrl;
  });
}

/**
 * 压缩图片
 *
 * 手机原图动辄 3~5MB，直接上传既慢又占存储，因此统一缩到长边 1600px、
 * 输出 JPEG。处理后可减少 90% 以上体积，而穿搭日记的显示尺寸完全够用。
 */
export async function compressImage(file: File): Promise<Blob> {
  const image = await loadImageFromObjectUrl(file);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_IMAGE_SIZE ? MAX_IMAGE_SIZE / longestSide : 1;

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return file; // 极少见：拿不到画布上下文时退回原图

  // 先铺白底，避免 PNG 透明区域转成 JPEG 后变黑
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });

  return blob ?? file;
}

/** 随机文件名：避免重名覆盖，也让图片地址不可被猜测 */
function createFileName(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}.jpg`;
}

/**
 * 上传图片文件到 Supabase Storage，返回可直接用于 <img src> 的公开网址
 *
 * 路径约定 `{user_id}/{随机名}.jpg`，与 supabase/schema.sql 中的
 * 存储写入策略一致 —— 每个用户只能写入自己 user_id 目录下。
 */
export async function uploadImageFile(file: File, userId: string): Promise<string> {
  const compressed = await compressImage(file);
  return uploadBlob(compressed, userId);
}

/**
 * 上传 dataURL（画布导出的搭配长图用）
 */
export async function uploadDataUrl(dataUrl: string, userId: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const compressed = await compressImage(
    new File([blob], 'composite.jpg', { type: blob.type || 'image/jpeg' })
  );
  return uploadBlob(compressed, userId);
}

async function uploadBlob(blob: Blob, userId: string): Promise<string> {
  const path = `${userId}/${createFileName()}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw new Error(translateStorageError(error.message));

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 从公开网址反推出存储路径，用于删除记录时一并清理图片。
 * 非本桶的网址（例如旧数据里的 base64）返回 null。
 */
export function getStoragePathFromUrl(url: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

/** 删除已上传的图片；失败不抛错（清理由记录删除主导，图片残留不影响使用） */
export async function removeImageByUrl(url: string): Promise<void> {
  const path = getStoragePathFromUrl(url);
  if (!path) return;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.error('删除图片失败：', error.message);
  }
}
