import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadImageFile } from '../lib/imageStorage';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  /** 上传失败时回调，由页面统一展示提示 */
  onError?: (message: string) => void;
}

export function ImageUpload({ value, onChange, onError }: ImageUploadProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    if (!user) {
      onError?.('登录状态已失效，请重新登录');
      return;
    }

    setIsUploading(true);
    try {
      // 压缩后上传到云端存储，返回可直接用于 <img src> 的网址
      const imageUrl = await uploadImageFile(file, user.id);
      onChange(imageUrl);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div
      className={`relative w-full aspect-[4/5] rounded-xl border-2 border-dashed transition-all overflow-hidden ${
        isDragging
          ? 'border-[#2C2C2C] bg-[#F5F0E8]'
          : 'border-[#2C2C2C]/20 hover:border-[#2C2C2C]/40'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!isUploading) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ''; // 清空以便重复选择同一张图片
        }}
      />

      {value ? (
        <>
          <img src={value} alt="预览" className="w-full h-full object-cover" />
          {isUploading ? (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#2C2C2C]/60 animate-spin" strokeWidth={1.5} />
              <p className="text-xs text-[#2C2C2C]/60">上传中…</p>
            </div>
          ) : (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" strokeWidth={2} />
            </button>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-[#2C2C2C]/40 animate-spin" strokeWidth={1.5} />
              <p className="text-sm text-[#2C2C2C]/40">上传中…</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-[#2C2C2C]/40" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-[#2C2C2C]/40">点击或拖拽上传图片</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
