import React, { useEffect, useState } from 'react';
import { Utensils, Newspaper, MapPin, Sparkles, FolderSync, Brain, Bus, AppWindow } from 'lucide-react';
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
  const [seoul, setSeoul] = useState(getSeoulTimeParts);

  // 주기적으로 서울 시간 갱신 (시간대 전환 감지용)
  useEffect(() => {
    const timer = setInterval(() => {
      setSeoul(getSeoulTimeParts());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 분 단위 환산 (0 ~ 1439)
  const currentMinutes = seoul.hour * 60 + seoul.minute;
  // 17:30 (1050분) ~ 23:59: 미노출 시간대
  const isClosed = currentMinutes >= 1050;

  useEffect(() => {
    let isMounted = true;

    async function loadMealImages() {
      // 17:30 ~ 23:59: 보여주지 않음
      if (isClosed) {
        if (isMounted) {
          setMealImages([]);
          setLoadingMeals(false);
        }
        return;
      }

      setLoadingMeals(true);

      // 시간대별 대상 이미지 인덱스:
      // - 00:00 ~ 07:54 (0 <= m < 475): 조식 [1]
      // - 07:55 ~ 12:59 (475 <= m < 780): 중식/석식 [2, 3, 4]
      // - 13:00 ~ 17:29 (780 <= m < 1050): 다시 조식 [1]
      let targetIndices: number[] = [];
      if (currentMinutes < 475) {
        targetIndices = [1];
      } else if (currentMinutes < 780) {
        targetIndices = [2, 3, 4];
      } else {
        targetIndices = [1];
      }

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
  }, [currentMinutes, isClosed, seoul.yyyyMM, seoul.yyyyMMdd]);

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
      id: 'zipgaja' as PageType,
      label: '집가자!',
      sub: '안국역 & 버스 정보',
      icon: Bus,
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
      id: 'news' as PageType,
      label: '읽어보자!',
      sub: '신문 및 뉴스',
      icon: Newspaper,
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
    {
      id: 'igoeitna' as PageType,
      label: '이거있나?',
      sub: '모바일 앱 & 웹 링크',
      icon: AppWindow,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
    },
    // 추후 재활성화를 위해 데이터 보존 (현재 메인 화면에서 숨김)
    {
      id: 'site' as PageType,
      label: '현장어데고!',
      sub: '현장 정보 안내',
      icon: MapPin,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
      hidden: true,
    },
    {
      id: 'lotto' as PageType,
      label: '대박나자!',
      sub: '좋은 글귀 & 로또',
      icon: Sparkles,
      bgColor: 'bg-[#efe9de]',
      hoverColor: 'hover:bg-[#e8e0d2]',
      iconColor: 'text-[#cc785c]',
      hidden: true,
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-3 space-y-5">
      {/* 2-Column Main Navigation Buttons */}
      <section className="grid grid-cols-2 gap-3" aria-label="메인 메뉴">
        {mainButtons
          .filter((btn) => !btn.hidden)
          .map((btn) => {
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

      {/* Today's Meal Banner Section: 17:30 ~ 23:59 시간대에는 미노출 */}
      {!isClosed && (
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
      )}
    </div>
  );
};
