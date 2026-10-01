import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const BASE_URL = "https://gais2.hdec.co.kr/HDECGAIS.WebUI/Files/Bokj/MAIN/PORTLET";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getSeoulParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce((acc: any, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    yyyy: parts.year,
    mm: parts.month,
    dd: parts.day,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function getRange() {
  const today = getSeoulParts();
  const prev = new Date(Date.UTC(today.year, today.month - 2, 1));
  const prevYear = prev.getUTCFullYear();
  const prevMonth = prev.getUTCMonth() + 1;
  const minDate = `${prevYear}-${pad2(prevMonth)}-01`;
  const maxDate = today.ymd;
  return { today, minDate, maxDate, prevYear, prevMonth };
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function toCompactYmd(ymd: string) {
  return ymd.replaceAll("-", "");
}

function toYyyyMm(ymd: string) {
  const [y, m] = ymd.split("-");
  return `${y}${m}`;
}

function compareYmd(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function isAllowedDate(ymd: string) {
  const { minDate, maxDate } = getRange();
  return compareYmd(ymd, minDate) >= 0 && compareYmd(ymd, maxDate) <= 0;
}

function getYesterdayYmd() {
  const { today } = getRange();
  const d = new Date(Date.UTC(today.year, today.month - 1, today.day));
  d.setUTCDate(d.getUTCDate() - 1);
  const ymd = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  return isAllowedDate(ymd) ? ymd : null;
}

function getRelativeLabel(ymd: string) {
  const { today } = getRange();
  const yesterday = getYesterdayYmd();
  if (ymd === today.ymd) return "오늘";
  if (ymd === yesterday) return "어제";
  return "선택 날짜";
}

function tryLoadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = `${url}?t=${Date.now()}`;
  });
}

async function findPreferredImageUrl(yyyyMM: string, yyyyMMdd: string, index: number) {
  const png = `${BASE_URL}/${yyyyMM}/${yyyyMMdd}${index}.png`;
  const jpg = `${BASE_URL}/${yyyyMM}/${yyyyMMdd}${index}.jpg`;
  const jpgExists = await tryLoadImage(jpg);
  if (jpgExists) return jpg;
  const pngExists = await tryLoadImage(png);
  if (pngExists) return png;
  return null;
}

export const BobMukJa: React.FC = () => {
  const { today, minDate, maxDate, prevYear, prevMonth } = getRange();
  const [selectedYmd, setSelectedYmd] = useState<string>(today.ymd);
  const [currentViewYear, setCurrentViewYear] = useState<number>(today.year);
  const [currentViewMonth, setCurrentViewMonth] = useState<number>(today.month);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load images for selected date (Max 3 images displayed)
  useEffect(() => {
    let isMounted = true;
    async function loadImages() {
      setLoading(true);
      const yyyyMM = toYyyyMm(selectedYmd);
      const yyyyMMdd = toCompactYmd(selectedYmd);

      const found: string[] = [];
      // Search index 1 to 4, but slice to max 3 images as requested
      for (let i = 1; i <= 4; i++) {
        if (found.length >= 3) break;
        const url = await findPreferredImageUrl(yyyyMM, yyyyMMdd, i);
        if (url) {
          found.push(url);
        }
      }

      if (isMounted) {
        setImages(found.slice(0, 3));
        setLoading(false);
      }
    }

    loadImages();
    return () => {
      isMounted = false;
    };
  }, [selectedYmd]);

  // Schedule auto reload at 4 AM Seoul Time
  useEffect(() => {
    const nowSeoul = getSeoulParts();
    const seoulComparableMs = (parts: any) =>
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);

    const nowComparable = seoulComparableMs(nowSeoul);
    const target = {
      year: nowSeoul.year,
      month: nowSeoul.month,
      day: nowSeoul.day,
      hour: 4,
      minute: 0,
      second: 0,
    };

    if (nowSeoul.hour >= 4) {
      const temp = new Date(Date.UTC(nowSeoul.year, nowSeoul.month - 1, nowSeoul.day));
      temp.setUTCDate(temp.getUTCDate() + 1);
      target.year = temp.getUTCFullYear();
      target.month = temp.getUTCMonth() + 1;
      target.day = temp.getUTCDate();
    }

    const targetMs = seoulComparableMs(target);
    const delay = Math.max(targetMs - nowComparable, 1000);
    const timer = setTimeout(() => window.location.reload(), delay);

    return () => clearTimeout(timer);
  }, []);

  const yesterdayYmd = getYesterdayYmd();

  const openCalendar = () => {
    const [y, m] = selectedYmd.split("-");
    setCurrentViewYear(Number(y));
    setCurrentViewMonth(Number(m));
    setIsCalendarOpen(true);
  };

  const closeCalendar = () => setIsCalendarOpen(false);

  const monthKey = (y: number, m: number) => y * 100 + m;
  const minKey = monthKey(prevYear, prevMonth);
  const maxKey = monthKey(today.year, today.month);
  const viewKey = monthKey(currentViewYear, currentViewMonth);

  const moveMonth = (delta: number) => {
    const view = new Date(Date.UTC(currentViewYear, currentViewMonth - 1, 1));
    view.setUTCMonth(view.getUTCMonth() + delta);
    setCurrentViewYear(view.getUTCFullYear());
    setCurrentViewMonth(view.getUTCMonth() + 1);
  };

  const renderCalendarGrid = () => {
    const firstDay = new Date(Date.UTC(currentViewYear, currentViewMonth - 1, 1));
    const startWeekday = firstDay.getUTCDay();
    const lastDate = new Date(Date.UTC(currentViewYear, currentViewMonth, 0)).getUTCDate();

    const days = [];

    // Empty lead slots
    for (let i = 0; i < startWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[40px]" />);
    }

    // Days of month
    for (let day = 1; day <= lastDate; day++) {
      const ymd = toYmd(currentViewYear, currentViewMonth, day);
      const isSelected = ymd === selectedYmd;
      const isToday = ymd === today.ymd;
      const isYesterday = ymd === yesterdayYmd;
      const allowed = isAllowedDate(ymd);

      days.push(
        <button
          key={ymd}
          type="button"
          disabled={!allowed}
          onClick={() => {
            if (allowed) {
              setSelectedYmd(ymd);
              closeCalendar();
            }
          }}
          className={`relative min-h-[42px] rounded-lg text-[13px] font-medium transition-all flex flex-col items-center justify-center cursor-pointer ${
            !allowed
              ? 'text-[#c4c4c4] bg-[#f3f4f6] cursor-not-allowed'
              : isSelected
              ? 'bg-[#cc785c] text-white font-bold shadow-xs'
              : 'bg-white text-[#141413] hover:bg-[#efe9de] border border-[#e6dfd8]'
          }`}
        >
          <span>{day}</span>
          {!isSelected && isToday && (
            <span className="text-[9px] text-[#cc785c] font-bold mt-0.5">오늘</span>
          )}
          {!isSelected && !isToday && isYesterday && (
            <span className="text-[9px] text-[#7c3aed] font-bold mt-0.5">어제</span>
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Date Selector Box */}
      <section className="bg-[#efe9de] border border-[#e6dfd8] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-[#141413] truncate">
            {getRelativeLabel(selectedYmd)} · {selectedYmd}
          </div>
          <div className="text-[11px] text-[#6c6a64] truncate">
            과거 날짜의 식단은 확인 가능합니다
          </div>
        </div>
        <button
          onClick={openCalendar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold bg-[#faf9f5] hover:bg-white text-[#141413] border border-[#e6dfd8] transition-colors cursor-pointer shrink-0 active:scale-95"
        >
          <CalendarIcon className="w-4 h-4 text-[#cc785c]" />
          <span>날짜 선택</span>
        </button>
      </section>

      {/* Image Loading State & Empty State */}
      {loading ? (
        <div className="p-8 text-center text-[13px] text-[#6c6a64] bg-[#efe9de]/50 rounded-2xl border border-[#e6dfd8] animate-pulse">
          이미지를 확인하는 중입니다...
        </div>
      ) : images.length === 0 ? (
        <div className="p-8 text-center text-[14px] text-[#6c6a64] bg-[#efe9de] rounded-2xl border border-[#e6dfd8]">
          선택한 날짜({selectedYmd})에 표시할 이미지가 없습니다.
        </div>
      ) : (
        /* Render up to 3 images (No titles, no text decorations) */
        <div className="space-y-2">
          {images.map((url, index) => (
            <div
              key={index}
              className="w-full overflow-hidden rounded-2xl bg-white border border-[#e6dfd8] shadow-xs"
            >
              <img
                src={url}
                alt={`식단 이미지 ${index + 1}`}
                className="w-full h-auto object-cover block"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Calendar Overlay Dialog */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl p-4 shadow-xl mt-12 space-y-3">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e6dfd8] pb-2">
              <span className="text-[15px] font-bold text-[#141413]">날짜 선택</span>
              <button
                onClick={closeCalendar}
                className="p-1 rounded-lg hover:bg-[#efe9de] text-[#6c6a64] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Month Nav */}
            <div className="flex items-center justify-between gap-2">
              <button
                disabled={viewKey <= minKey}
                onClick={() => moveMonth(-1)}
                className="p-1.5 rounded-lg border border-[#e6dfd8] bg-white text-[#141413] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-[15px] font-bold text-[#141413]">
                {currentViewYear}년 {pad2(currentViewMonth)}월
              </div>
              <button
                disabled={viewKey >= maxKey}
                onClick={() => moveMonth(1)}
                className="p-1.5 rounded-lg border border-[#e6dfd8] bg-white text-[#141413] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedYmd(today.ymd);
                    closeCalendar();
                  }}
                  className={`px-3 py-1 rounded-lg text-[12px] font-medium border border-[#e6dfd8] cursor-pointer ${
                    selectedYmd === today.ymd
                      ? 'bg-[#cc785c] text-white font-bold'
                      : 'bg-white text-[#141413] hover:bg-[#efe9de]'
                  }`}
                >
                  오늘
                </button>
                <button
                  disabled={!yesterdayYmd}
                  onClick={() => {
                    if (yesterdayYmd) {
                      setSelectedYmd(yesterdayYmd);
                      closeCalendar();
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-[12px] font-medium border border-[#e6dfd8] cursor-pointer ${
                    selectedYmd === yesterdayYmd
                      ? 'bg-[#cc785c] text-white font-bold'
                      : 'bg-white text-[#141413] hover:bg-[#efe9de] disabled:opacity-40'
                  }`}
                >
                  어제
                </button>
              </div>
              <span className="text-[10px] text-[#6c6a64]">
                {minDate} ~ {maxDate}
              </span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#6c6a64] py-1">
              <span>일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">{renderCalendarGrid()}</div>
          </div>
        </div>
      )}
    </div>
  );
};
