import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Quote as QuoteIcon } from 'lucide-react';
import { LIFE_QUOTES } from '../data/quotes';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function generateLottoSet(): number[] {
  const numbers = new Set<number>();
  while (numbers.size < 6) {
    const rand = Math.floor(Math.random() * 45) + 1;
    numbers.add(rand);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function getLottoBallColor(num: number) {
  if (num <= 10) return 'bg-[#f59e0b] text-white'; // Yellow
  if (num <= 20) return 'bg-[#2563eb] text-white'; // Blue
  if (num <= 30) return 'bg-[#dc2626] text-white'; // Red
  if (num <= 40) return 'bg-[#4b5563] text-white'; // Dark Gray
  return 'bg-[#10b981] text-white'; // Green
}

interface LottoQuoteProps {
  onRegisterRefresh?: (fn: () => void) => void;
}

export const LottoQuote: React.FC<LottoQuoteProps> = ({ onRegisterRefresh }) => {
  const [quote, setQuote] = useState<string>('');
  const [lottoSets, setLottoSets] = useState<number[][]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const refreshAll = useCallback(() => {
    // Random quote selection
    const randomQuote = LIFE_QUOTES[Math.floor(Math.random() * LIFE_QUOTES.length)];
    setQuote(randomQuote);

    // 5 sets of Lotto numbers
    const newSets = Array.from({ length: 5 }, () => generateLottoSet());
    setLottoSets(newSets);
  }, []);

  const { containerRef, pullDistance } = usePullToRefresh(refreshAll);

  useEffect(() => {
    refreshAll();
    if (onRegisterRefresh) {
      onRegisterRefresh(refreshAll);
    }
  }, [onRegisterRefresh, refreshAll]);

  const handleCopySet = (set: number[], index: number) => {
    const text = `[로또 추천 번호 ${String.fromCharCode(65 + index)}행] ${set.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-lg mx-auto px-4 py-4 space-y-5 relative min-h-[calc(100vh-60px)] overscroll-contain"
    >
      {/* Pull down indicator for mobile */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-2 text-[12px] text-[#cc785c] font-medium transition-all"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
        >
          {pullDistance > 60 ? '손을 떼면 새로고침됩니다' : '아래로 당겨서 새로고침'}
        </div>
      )}

      {/* Inspiring Life Quote Card */}
      <section className="bg-[#efe9de] border border-[#e6dfd8] rounded-2xl p-5 shadow-xs space-y-2 relative overflow-hidden">
        <QuoteIcon className="w-8 h-8 text-[#cc785c]/20 absolute -bottom-1 -right-1 pointer-events-none" />
        <div className="text-[12px] font-bold tracking-wider uppercase text-[#cc785c]">
          오늘의 한 줄 명언
        </div>
        <p className="text-[16px] font-serif-display leading-relaxed text-[#141413] italic font-semibold">
          "{quote}"
        </p>
      </section>

      {/* 5 Sets of Lotto Numbers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[14px] font-bold text-[#141413]">
            🎯 로또 자동 추천
          </span>
          <span className="text-[11px] text-[#6c6a64]">
            터치하여 번호 복사
          </span>
        </div>

        <div className="space-y-2.5">
          {lottoSets.map((set, idx) => {
            const label = String.fromCharCode(65 + idx); // A, B, C, D, E
            const isCopied = copiedIndex === idx;

            return (
              <div
                key={idx}
                className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-3 shadow-xs flex items-center justify-between gap-2 hover:border-[#cc785c]/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-[14px] font-bold text-[#cc785c]">
                    {label}
                  </span>

                  {/* 6 Lotto Balls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {set.map((num) => (
                      <span
                        key={num}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[13px] sm:text-[14px] font-bold shadow-xs ${getLottoBallColor(
                          num
                        )}`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Individual Copy Button & Icon */}
                <button
                  onClick={() => handleCopySet(set, idx)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 ${
                    isCopied
                      ? 'bg-[#5db872] text-white border-[#5db872]'
                      : 'bg-[#efe9de] text-[#141413] hover:bg-[#e8e0d2] border-[#e6dfd8]'
                  }`}
                  title="번호 복사"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#cc785c]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
