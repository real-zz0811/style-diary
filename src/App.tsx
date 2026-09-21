import { useState, type ReactNode } from 'react';
import { Loader2, LogOut, Settings } from 'lucide-react';
import { BottomNavigation, TabId } from './components/BottomNavigation';
import { WardrobePage } from './pages/WardrobePage';
import { OutfitWorkshopPage } from './pages/OutfitWorkshopPage';
import { InspirationWallPage } from './pages/InspirationWallPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans flex items-center justify-center px-8">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

/** 未配置 Supabase 环境变量时的说明页，避免白屏 */
function SetupNotice() {
  return (
    <CenteredMessage>
      <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#F5F0E8] flex items-center justify-center">
        <Settings className="w-6 h-6 text-[#2C2C2C]/50" strokeWidth={1.5} />
      </div>
      <h1 className="font-serif text-xl text-[#2C2C2C] tracking-widest mb-3">
        STYLE DIARY
      </h1>
      <p className="text-sm text-[#2C2C2C]/50 leading-relaxed">
        尚未接入云端账号
        <br />
        请在项目根目录创建{' '}
        <span className="text-[#2C2C2C]/70">.env.local</span>
        <br />
        填入 Supabase 的 Project URL 与 anon key 后重启
      </p>
    </CenteredMessage>
  );
}

function DiaryApp() {
  const { user, isInitializing, isConfigured, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('wardrobe');

  if (!isConfigured) return <SetupNotice />;

  if (isInitializing) {
    return (
      <CenteredMessage>
        <Loader2 className="w-6 h-6 mx-auto text-[#2C2C2C]/40 animate-spin" strokeWidth={1.5} />
      </CenteredMessage>
    );
  }

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activeTab) {
      case 'wardrobe':
        return <WardrobePage />;
      case 'outfit':
        return <OutfitWorkshopPage />;
      case 'inspiration':
        return <InspirationWallPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      <header className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/95 backdrop-blur-sm z-10">
        <div className="max-w-md mx-auto px-6 py-5 relative">
          <h1 className="font-serif text-xl text-[#2C2C2C] tracking-widest text-center">
            STYLE DIARY
          </h1>
          <button
            type="button"
            onClick={() => void signOut()}
            title={`退出登录（${user.email ?? ''}）`}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[#2C2C2C]/35 hover:text-[#2C2C2C] hover:bg-[#F5F0E8] transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="pt-16 pb-20 min-h-screen">
        <div className="max-w-md mx-auto">
          {renderPage()}
        </div>
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DiaryApp />
    </AuthProvider>
  );
}

export default App;
