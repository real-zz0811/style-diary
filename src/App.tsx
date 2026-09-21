import { useState } from 'react';
import { BottomNavigation, TabId } from './components/BottomNavigation';
import { WardrobePage } from './pages/WardrobePage';
import { OutfitWorkshopPage } from './pages/OutfitWorkshopPage';
import { InspirationWallPage } from './pages/InspirationWallPage';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('wardrobe');

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
        <div className="max-w-md mx-auto px-6 py-5">
          <h1 className="font-serif text-xl text-[#2C2C2C] tracking-widest text-center">
            STYLE DIARY
          </h1>
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

export default App;
