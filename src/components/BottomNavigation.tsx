import { Shirt, Sparkles, Palette } from 'lucide-react';

export type TabId = 'wardrobe' | 'outfit' | 'inspiration';

interface BottomNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs = [
  { id: 'wardrobe' as TabId, label: '衣橱', icon: Palette },
  { id: 'outfit' as TabId, label: '搭配工坊', icon: Shirt },
  { id: 'inspiration' as TabId, label: '灵感墙', icon: Sparkles },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#2C2C2C]/5 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition-all duration-200 ${
              activeTab === id
                ? 'text-[#2C2C2C]'
                : 'text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60'
            }`}
          >
            <Icon
              className="w-5 h-5 transition-transform duration-200"
              strokeWidth={activeTab === id ? 2 : 1.5}
            />
            <span className={`text-xs tracking-wide ${activeTab === id ? 'font-medium' : ''}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
