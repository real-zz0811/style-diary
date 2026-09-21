interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

const colors = [
  { name: '黑', value: '#1A1A1A' },
  { name: '白', value: '#FAFAFA' },
  { name: '卡其', value: '#C4A77D' },
  { name: '牛仔蓝', value: '#6B8E9F' },
  { name: '红', value: '#B85C5C' },
  { name: '灰', value: '#8B8B8B' },
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`group flex flex-col items-center gap-1.5 ${
            value === color.value ? 'opacity-100' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full border-2 transition-all ${
              value === color.value
                ? 'border-[#2C2C2C] scale-110'
                : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: color.value }}
          />
          <span
            className={`text-xs ${
              value === color.value ? 'text-[#2C2C2C]' : 'text-[#2C2C2C]/50'
            }`}
          >
            {color.name}
          </span>
        </button>
      ))}
    </div>
  );
}
