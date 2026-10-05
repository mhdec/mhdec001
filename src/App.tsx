import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { BobMukJa } from './components/BobMukJa';
import { ReadNews } from './components/ReadNews';
import { SiteInfo } from './components/SiteInfo';
import { LottoQuote } from './components/LottoQuote';
import { FileTransfer } from './components/FileTransfer';
import { MemoAndJapanese } from './components/MemoAndJapanese';
import { ZipGaja } from './components/ZipGaja';
import { IgoeItNa } from './components/IgoeItNa';
import { PageType, ThinkTab } from './types';

const VALID_PAGES: PageType[] = ['home', 'bob', 'news', 'site', 'lotto', 'transfer', 'memo', 'zipgaja', 'igoeitna'];

function getInitialPage(): PageType {
  const hash = window.location.hash.replace('#', '') as PageType;
  if (VALID_PAGES.includes(hash)) return hash;

  const stored = sessionStorage.getItem('mhdec_active_page') as PageType;
  if (VALID_PAGES.includes(stored)) return stored;

  return 'home';
}

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>(getInitialPage);
  const [thinkTab, setThinkTab] = useState<ThinkTab>('memo');
  const lottoRefreshRef = useRef<(() => void) | null>(null);
  const transferRefreshRef = useRef<(() => void) | null>(null);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = page;
    sessionStorage.setItem('mhdec_active_page', page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const page = getInitialPage();
      setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleRegisterLottoRefresh = useCallback((fn: () => void) => {
    lottoRefreshRef.current = fn;
  }, []);

  const handleTriggerLottoRefresh = () => {
    if (lottoRefreshRef.current) {
      lottoRefreshRef.current();
    }
  };

  const handleRegisterTransferRefresh = useCallback((fn: () => void) => {
    transferRefreshRef.current = fn;
  }, []);

  const handleTriggerTransferRefresh = () => {
    if (transferRefreshRef.current) {
      transferRefreshRef.current();
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
        onTransferRefresh={handleTriggerTransferRefresh}
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
        {currentPage === 'transfer' && (
          <FileTransfer onRegisterRefresh={handleRegisterTransferRefresh} />
        )}
        {currentPage === 'memo' && <MemoAndJapanese thinkTab={thinkTab} />}
        {currentPage === 'zipgaja' && <ZipGaja />}
        {currentPage === 'igoeitna' && <IgoeItNa />}
      </main>

      {/* STRICT RULE: NO FOOTERS ON ANY PAGE */}
    </div>
  );
}

export default App;
