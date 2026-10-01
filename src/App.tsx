import React, { useState, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { BobMukJa } from './components/BobMukJa';
import { ReadNews } from './components/ReadNews';
import { SiteInfo } from './components/SiteInfo';
import { LottoQuote } from './components/LottoQuote';
import { FileTransfer } from './components/FileTransfer';
import { MemoAndJapanese } from './components/MemoAndJapanese';
import { PageType, ThinkTab } from './types';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [thinkTab, setThinkTab] = useState<ThinkTab>('memo');
  const lottoRefreshRef = useRef<(() => void) | null>(null);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterLottoRefresh = useCallback((fn: () => void) => {
    lottoRefreshRef.current = fn;
  }, []);

  const handleTriggerLottoRefresh = () => {
    if (lottoRefreshRef.current) {
      lottoRefreshRef.current();
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] flex flex-col font-sans selection:bg-[#cc785c] selection:text-white">
      {/* 50px Max Height Header with Floating Home Button & Controls */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        thinkTab={thinkTab}
        onThinkTabChange={setThinkTab}
        onLottoRefresh={handleTriggerLottoRefresh}
      />

      {/* Main Page View Area */}
      <main className="flex-1 w-full pb-6">
        {currentPage === 'home' && <Home onNavigate={handleNavigate} />}
        {currentPage === 'bob' && <BobMukJa />}
        {currentPage === 'news' && <ReadNews />}
        {currentPage === 'site' && <SiteInfo />}
        {currentPage === 'lotto' && (
          <LottoQuote onRegisterRefresh={handleRegisterLottoRefresh} />
        )}
        {currentPage === 'transfer' && <FileTransfer />}
        {currentPage === 'memo' && <MemoAndJapanese thinkTab={thinkTab} />}
      </main>

      {/* STRICT RULE: NO FOOTERS ON ANY PAGE */}
    </div>
  );
}

export default App;
