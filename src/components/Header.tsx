import { Home as HomeIcon, Edit3, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { PageType, ThinkTab } from '../types';

interface HeaderProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  thinkTab?: ThinkTab;
  onThinkTabChange?: (tab: ThinkTab) => void;
  onLottoRefresh?: () => void;
  onTransferRefresh?: () => void;
  onZipGajaRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  thinkTab = 'memo',
  onThinkTabChange,
  onLottoRefresh,
  onTransferRefresh,
  onZipGajaRefresh,
}) => {
  // Format today's date in Seoul Time (e.g., "2026년 10월 1일 (목)")
  const getTodayFormatted = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    return formatter.format(now);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'home':
        return '마 므하노!';
      case 'bob':
        return '밥묵자!';
      case 'news':
        return '읽어보자!';
      case 'site':
        return '현장어데고!';
      case 'lotto':
        return '대박나자!';
      case 'transfer':
        return '옮겨볼까?';
      case 'memo':
        return '생각해라!';
      case 'zipgaja':
        return '집가자!';
      case 'igoeitna':
        return '이거있나?';
      default:
        return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-[48px] bg-[#faf9f5] border-b border-[#e6dfd8] flex items-center justify-between px-3 shadow-xs">
      {/* Left side: Home button (Floating/Fixed on subpages) */}
      <div className="flex items-center gap-2 min-w-[80px]">
        {currentPage !== 'home' && (
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-medium text-[#141413] bg-[#efe9de] hover:bg-[#e8e0d2] border border-[#e6dfd8] transition-colors cursor-pointer active:scale-95"
            aria-label="메인 페이지로 이동"
          >
            <HomeIcon className="w-4 h-4 text-[#cc785c]" />
            <span className="font-semibold">홈</span>
          </button>
        )}
      </div>

      {/* Center: Title / Date */}
      <div className="flex-1 text-center truncate px-2">
        <h1 className="text-[15px] font-semibold text-[#141413] truncate tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side: Header actions */}
      <div className="flex items-center justify-end min-w-[80px]">
        {(currentPage === 'news' || currentPage === 'site') && (
          <a
            href={
              currentPage === 'news'
                ? 'https://autowayif.hdec.co.kr/NewsPaper/NewsPaperViewNew.aspx?Seq='
                : 'https://siteinfo.hdec.co.kr/m_SiteInfo.aspx'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold text-[#141413] bg-[#efe9de] hover:bg-[#e8e0d2] border border-[#e6dfd8] transition-colors cursor-pointer shrink-0 active:scale-95"
            title="새 창으로 열기"
          >
            <span className="text-[11px]">새 창</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#cc785c]" />
          </a>
        )}

        {currentPage === 'lotto' && onLottoRefresh && (
          <button
            onClick={onLottoRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold text-[#141413] bg-[#efe9de] hover:bg-[#e8e0d2] border border-[#e6dfd8] transition-colors cursor-pointer shrink-0 active:scale-95"
            title="새로고침"
          >
            <span className="text-[11px]">새로고침</span>
            <RefreshCw className="w-3.5 h-3.5 text-[#cc785c]" />
          </button>
        )}

        {currentPage === 'transfer' && onTransferRefresh && (
          <button
            onClick={onTransferRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold text-[#141413] bg-[#efe9de] hover:bg-[#e8e0d2] border border-[#e6dfd8] transition-colors cursor-pointer shrink-0 active:scale-95"
            title="새로고침"
          >
            <span className="text-[11px]">새로고침</span>
            <RefreshCw className="w-3.5 h-3.5 text-[#cc785c]" />
          </button>
        )}

        {currentPage === 'zipgaja' && onZipGajaRefresh && (
          <button
            onClick={onZipGajaRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold text-[#141413] bg-[#efe9de] hover:bg-[#e8e0d2] border border-[#e6dfd8] transition-colors cursor-pointer shrink-0 active:scale-95"
            title="전체 갱신"
          >
            <span className="text-[11px]">전체 갱신</span>
            <RefreshCw className="w-3.5 h-3.5 text-[#cc785c]" />
          </button>
        )}

        {currentPage === 'memo' && onThinkTabChange && (
          <div className="flex items-center bg-[#efe9de] p-0.5 rounded-lg border border-[#e6dfd8]">
            <button
              onClick={() => onThinkTabChange('memo')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                thinkTab === 'memo'
                  ? 'bg-[#cc785c] text-white shadow-xs'
                  : 'text-[#6c6a64] hover:text-[#141413]'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>메모</span>
            </button>
            <button
              onClick={() => onThinkTabChange('japanese')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                thinkTab === 'japanese'
                  ? 'bg-[#cc785c] text-white shadow-xs'
                  : 'text-[#6c6a64] hover:text-[#141413]'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>일어</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
