import { useState, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" strokeWidth={2} />
          </button>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F5F0E8] flex items-center justify-center">
            <ImagePlus className="w-6 h-6 text-[#2C2C2C]/40" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[#2C2C2C]/40">点击或拖拽上传图片</p>
        </div>
      )}
    </div>
  );
}
