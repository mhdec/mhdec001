import React, { useEffect, useState } from 'react';
import { Utensils, Newspaper, MapPin, Sparkles, FolderSync, Brain } from 'lucide-react';
import { PageType } from '../types';

interface HomeProps {
  onNavigate: (page: PageType) => void;
}

const BASE_URL = "https://gais2.hdec.co.kr/HDECGAIS.WebUI/Files/Bokj/MAIN/PORTLET";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getSeoulTimeParts() {
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
  const parts = formatter.formatToParts(new Date()).reduce((acc: any, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    yyyyMM: `${parts.year}${parts.month}`,
    yyyyMMdd: `${parts.year}${parts.month}${parts.day}`,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
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
  const jpg = `${BASE_URL}/${yyyyMM}/${yyyyMMdd}${index}.jpg`;
  const png = `${BASE_URL}/${yyyyMM}/${yyyyMMdd}${index}.png`;
  const jpgExists = await tryLoadImage(jpg);
  if (jpgExists) return jpg;
  const pngExists = await tryLoadImage(png);
  if (pngExists) return png;
  return null;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [mealImages, setMealImages] = useState<string[]>([]);
  const [loadingMeals, setLoadingMeals] = useState<boolean>(true);

  const seoul = getSeoulTimeParts();
  const isBefore755 = seoul.hour < 7 || (seoul.hour === 7 && seoul.minute < 55);

  useEffect(() => {
    let isMounted = true;

    async function loadMealImages() {
      setLoadingMeals(true);
      const targetIndices = isBefore755 ? [1] : [2, 3, 4];
      const validUrls: string[] = [];

      for (const idx of targetIndices) {
        const url = await findPreferredImageUrl(seoul.yyyyMM, seoul.yyyyMMdd, idx);
        if (url) validUrls.push(url);
      }

      if (isMounted) {
        setMealImages(validUrls);
        setLoadingMeals(false);
      }
    }

    loadMealImages();

    return () => {
      isMounted = false;
    };
  }, [isBefore755, seoul.yyyyMM, seoul.yyyyMMdd]);

  const mainButtons = [
    {
      id: 'bob' as PageType,
      label: '밥묵자!',
      sub: '오늘의 메뉴 확인',
      icon: Utensils,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    {
      id: 'news' as PageType,
      label: '읽어보자!',
      sub: '신문 및 뉴스',
      icon: Newspaper,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    {
      id: 'site' as PageType,
      label: '현장어데고!',
      sub: '현장 정보 안내',
      icon: MapPin,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    {
      id: 'lotto' as PageType,
      label: '대박나자!',
      sub: '좋은 글귀 & 로또',
      icon: Sparkles,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    {
      id: 'transfer' as PageType,
      label: '옮겨볼까?',
      sub: '파일 및 사진 공유',
      icon: FolderSync,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    {
      id: 'memo' as PageType,
      label: '생각해라!',
      sub: '메모 & 일본어 공부',
      icon: Brain,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
  ];

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

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-3 space-y-5">
      {/* Today's Date Banner below Header */}
      <div className="text-center pb-2 border-b border-[#e6dfd8]">
        <span className="text-[14px] font-bold text-[#cc785c] tracking-tight">
          📅 {getTodayFormatted()}
        </span>
      </div>

      {/* 2-Column Main Navigation Buttons */}
      <section className="grid grid-cols-2 gap-3" aria-label="메인 메뉴">
        {mainButtons.map((btn) => {
          const IconComponent = btn.icon;
          return (
            <button
              key={btn.id}
              onClick={() => onNavigate(btn.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-[#e6dfd8] ${btn.bgColor} ${btn.hoverColor} transition-all duration-150 active:scale-98 shadow-xs text-center cursor-pointer group`}
            >
              <div className="p-2.5 rounded-full bg-[#faf9f5] border border-[#e6dfd8] mb-2 group-hover:scale-105 transition-transform">
                <IconComponent className={`w-6 h-6 ${btn.iconColor}`} />
              </div>
              <span className="font-semibold text-[17px] text-[#141413] tracking-tight">
                {btn.label}
              </span>
              <span className="text-[11px] text-[#6c6a64] mt-0.5">
                {btn.sub}
              </span>
            </button>
          );
        })}
      </section>

      {/* Today's Meal Banner Section */}
      <section className="space-y-3">
        <div className="border-b border-[#e6dfd8] pb-1.5 px-0.5">
          <span className="text-[13px] font-semibold text-[#6c6a64]">
            🍱 오늘의 식단
          </span>
        </div>

        {loadingMeals ? (
          <div className="p-6 text-center text-[13px] text-[#6c6a64] bg-[#efe9de]/50 rounded-xl border border-[#e6dfd8] animate-pulse">
            오늘의 식단 이미지를 확인하고 있습니다...
          </div>
        ) : mealImages.length > 0 ? (
          <div className="space-y-3">
            {mealImages.map((imgUrl, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-[#e6dfd8] bg-white shadow-xs"
              >
                <img
                  src={imgUrl}
                  alt={`오늘의 식단 ${i + 1}`}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
