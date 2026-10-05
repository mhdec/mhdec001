import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Clock, Bus, AlertCircle, ShieldCheck } from 'lucide-react';
import { getBusServiceKey, getSubwayServiceKey, SERVICE_EXPIRATION_DATE } from '../utils/crypto';

interface SubwayArrival {
  updnLine: string; // "상행" or "하행"
  trainLineNm: string; // "대화행 - 경복궁방면"
  statnNm: string; // "안국"
  bstatnNm: string; // "대화"
  arvlMsg2: string; // "전역 도착" or "4분 30초 후 (독립문)"
  arvlMsg3: string; // "독립문"
  btrainSttus: string; // "일반"
  recptnDt: string;
}

interface BusArrival {
  stId: string;
  stNm: string;
  arsId: string;
  rtNm: string; // Bus number e.g. "151"
  arrmsg1: string; // 1st bus arrival message e.g. "곧 도착"
  arrmsg2: string; // 2nd bus arrival message e.g. "11분21초후[4번째 전]"
  stationNm1?: string;
  stationNm2?: string;
  traTime1?: number;
}

interface ZipGajaProps {
  onRegisterRefresh?: (fn: () => void) => void;
}

interface SoonestBusItem {
  rtNm: string;
  arrmsg: string;
  seconds: number;
}

/**
 * Format Date to Korean AM/PM (오전/오후 hh:mm:ss)
 */
function formatAmPm(date: Date = new Date()): string {
  return date.toLocaleTimeString('ko-KR', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format subway arrival message:
 * Removes parenthesis content e.g. "4분 30초 후 (독립문)" -> "4분 30초 후"
 */
function formatSubwayArvlMsg(msg: string): string {
  if (!msg) return '';
  return msg.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Get Bus Number Text Style:
 * 3-digits -> Blue, Bold
 * 4-digits -> Green, Bold
 */
function getBusNumberStyle(rtNm: string): string {
  const digits = rtNm.replace(/[^0-9]/g, '');
  if (digits.length === 3) {
    return 'text-[#1d4ed8] font-bold';
  } else if (digits.length === 4) {
    return 'text-[#15803d] font-bold';
  }
  return 'text-[#141413] font-bold';
}

/**
 * Parse arrival estimate in seconds
 * Returns number of seconds remaining (0 for "곧 도착")
 */
function parseBusArrivalSeconds(arrmsg: string, traTime?: number): number {
  if (!arrmsg || arrmsg === '출발대기') return Infinity;
  if (arrmsg.includes('곧') || arrmsg.includes('진입')) {
    return 0;
  }

  const minMatch = arrmsg.match(/(\d+)\s*분/);
  const secMatch = arrmsg.match(/(\d+)\s*초/);

  if (minMatch || secMatch) {
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
    return mins * 60 + secs;
  }

  if (typeof traTime === 'number' && traTime > 0) {
    return traTime;
  }

  return Infinity;
}

/**
 * Format short arrival string e.g. "1분20초후[1번째 전]" -> "1분 20초후"
 */
function formatBusShortMsg(arrmsg: string): string {
  if (!arrmsg) return '';
  if (arrmsg.includes('곧') || arrmsg.includes('진입')) return '곧 도착';
  return arrmsg.replace(/\[.*?\]/g, '').trim();
}

/**
 * Extract buses arriving in under 2 minutes (< 120 seconds), max 3, sorted by shortest time
 */
function getSoonestBusesUnder2Min(buses: BusArrival[]): SoonestBusItem[] {
  if (!buses || buses.length === 0) return [];

  const list: SoonestBusItem[] = [];

  for (const b of buses) {
    const sec = parseBusArrivalSeconds(b.arrmsg1, b.traTime1);
    if (sec < 120) {
      list.push({
        rtNm: b.rtNm,
        arrmsg: formatBusShortMsg(b.arrmsg1),
        seconds: sec,
      });
    }
  }

  list.sort((a, b) => a.seconds - b.seconds);
  return list.slice(0, 3);
}

export const ZipGaja: React.FC<ZipGajaProps> = ({ onRegisterRefresh }) => {
  // State for Anguk Subway
  const [subwayData, setSubwayData] = useState<SubwayArrival[]>([]);
  const [subwayTime, setSubwayTime] = useState<string>('');
  const [subwayLoading, setSubwayLoading] = useState<boolean>(false);
  const [subwayError, setSubwayError] = useState<string | null>(null);

  // State for Company Front Stop (100000076)
  const [frontBuses, setFrontBuses] = useState<BusArrival[]>([]);
  const [frontTime, setFrontTime] = useState<string>('');
  const [frontLoading, setFrontLoading] = useState<boolean>(false);
  const [frontCollapsed, setFrontCollapsed] = useState<boolean>(false);
  const [frontError, setFrontError] = useState<string | null>(null);

  // State for Company Across Stop (100000103)
  const [acrossBuses, setAcrossBuses] = useState<BusArrival[]>([]);
  const [acrossTime, setAcrossTime] = useState<string>('');
  const [acrossLoading, setAcrossLoading] = useState<boolean>(false);
  const [acrossCollapsed, setAcrossCollapsed] = useState<boolean>(false);
  const [acrossError, setAcrossError] = useState<string | null>(null);

  // ===================== FETCH LOGIC =====================

  // Fetch Anguk Station Subway Data
  const fetchSubwayData = useCallback(async () => {
    setSubwayLoading(true);
    setSubwayError(null);
    try {
      let data: any = null;
      // Try Cloudflare Function proxy first
      try {
        const res = await fetch('/api/subway?station=' + encodeURIComponent('안국'));
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Fallback to direct fetch
      }

      if (!data || !data.realtimeArrivalList) {
        const key = getSubwayServiceKey();
        const fallbackUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/1/10/${encodeURIComponent('안국')}`;
        const res = await fetch(fallbackUrl);
        data = await res.json();
      }

      if (data && data.realtimeArrivalList) {
        setSubwayData(data.realtimeArrivalList);
      } else {
        setSubwayData([]);
      }
      setSubwayTime(formatAmPm());
    } catch (err: any) {
      console.error('Subway Fetch Error:', err);
      setSubwayError('지하철 정보를 불러오는 중 오류가 발생했습니다.');
      setSubwayTime(formatAmPm());
    } finally {
      setSubwayLoading(false);
    }
  }, []);

  // Fetch Bus Stop Data (Company Front or Across)
  const fetchBusData = useCallback(async (stId: string, setBuses: React.Dispatch<React.SetStateAction<BusArrival[]>>, setTime: React.Dispatch<React.SetStateAction<string>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    setLoading(true);
    setError(null);
    try {
      let rawItems: any[] = [];

      // Try Cloudflare Function proxy first
      try {
        const res = await fetch(`/api/bus?stId=${stId}`);
        if (res.ok) {
          const json: any = await res.json();
          if (json?.msgBody?.itemList) {
            rawItems = Array.isArray(json.msgBody.itemList) ? json.msgBody.itemList : [json.msgBody.itemList];
          } else if (json?.itemList) {
            rawItems = Array.isArray(json.itemList) ? json.itemList : [json.itemList];
          }
        }
      } catch {
        // Fallback to direct fetch
      }

      if (rawItems.length === 0) {
        const key = getBusServiceKey();
        const fallbackUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${key}&stId=${stId}&resultType=json`;
        const res = await fetch(fallbackUrl);
        const json: any = await res.json();

        const body = json?.msgBody || json?.ServiceResult?.msgBody;
        if (body && body.itemList) {
          rawItems = Array.isArray(body.itemList) ? body.itemList : [body.itemList];
        }
      }

      // Sort bus routes in ascending order by route number (버스번호 오름차순 정렬)
      const sorted = rawItems
        .map((item: any) => ({
          stId: item.stId,
          stNm: item.stNm,
          arsId: item.arsId,
          rtNm: item.rtNm || item.busRouteAbrv || '',
          arrmsg1: item.arrmsg1 || '',
          arrmsg2: item.arrmsg2 || '',
          stationNm1: item.stationNm1,
          stationNm2: item.stationNm2,
          traTime1: item.traTime1 ? parseInt(item.traTime1, 10) : undefined,
        }))
        .sort((a, b) => a.rtNm.localeCompare(b.rtNm, undefined, { numeric: true, sensitivity: 'base' }));

      setBuses(sorted);
      setTime(formatAmPm());
    } catch (err: any) {
      console.error(`Bus Fetch Error (${stId}):`, err);
      setError('버스 도착 정보를 불러오는 중 오류가 발생했습니다.');
      setTime(formatAmPm());
    } finally {
      setLoading(false);
    }
  }, []);

  // Handler for individual Company Front refresh
  const handleFrontRefresh = () => {
    fetchBusData('100000076', setFrontBuses, setFrontTime, setFrontLoading, setFrontError);
  };

  // Handler for individual Company Across refresh
  const handleAcrossRefresh = () => {
    fetchBusData('100000103', setAcrossBuses, setAcrossTime, setAcrossLoading, setAcrossError);
  };

  // Global Refresh all 3
  const refreshAll = useCallback(() => {
    fetchSubwayData();
    fetchBusData('100000076', setFrontBuses, setFrontTime, setFrontLoading, setFrontError);
    fetchBusData('100000103', setAcrossBuses, setAcrossTime, setAcrossLoading, setAcrossError);
  }, [fetchSubwayData, fetchBusData]);

  // Register refresh handler to parent Header
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(refreshAll);
    }
  }, [onRegisterRefresh, refreshAll]);

  // Initial Load & 10-Second Auto Refresh Interval
  useEffect(() => {
    refreshAll();

    const intervalId = setInterval(() => {
      refreshAll();
    }, 10000); // 10 seconds auto-refresh

    return () => clearInterval(intervalId);
  }, [refreshAll]);

  // Filter Subway Data into Upbound (상행: 경복궁/대화 방면) & Downbound (하행: 종로3가/오금 방면)
  const subwayUpbound = subwayData.filter(item => item.updnLine === '상행');
  const subwayDownbound = subwayData.filter(item => item.updnLine === '하행');

  // Soonest buses under 2 minutes for Company Front & Across
  const frontSoonest = getSoonestBusesUnder2Min(frontBuses);
  const acrossSoonest = getSoonestBusesUnder2Min(acrossBuses);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-5">
      {/* ========================================================================= */}
      {/* 1. 안국역 (Subway Line 3 - Naver Map Style UI)                            */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-[#e6dfd8] shadow-xs overflow-hidden">
        {/* Naver Map Style Header with Line 3 Signature Orange Accent */}
        <div className="bg-gradient-to-r from-[#EF6C00] to-[#F57C00] text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-full bg-white text-[#EF6C00] font-black text-[15px] flex items-center justify-center shadow-xs border-2 border-[#EF6C00] shrink-0">
              3
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] font-extrabold tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                안국역
                <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap font-['Nanum_Gothic','NanumGothic','Malgun_Gothic',sans-serif]">
                  3호선
                </span>
              </h2>
            </div>
          </div>

          {/* Time & Refresh */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[11px] bg-black/20 px-2.5 py-1 rounded-full text-white/90 whitespace-nowrap">
              <Clock className="w-3 h-3" />
              <span className="whitespace-nowrap">{subwayTime || '조회 중...'}</span>
            </div>
            <button
              onClick={fetchSubwayData}
              disabled={subwayLoading}
              className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0"
              title="안국역 새로고침"
            >
              <RefreshCw className={`w-4 h-4 text-white ${subwayLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time 10-Second Auto Refresh Indicator Banner */}
        <div className="bg-[#fff8f0] px-4 py-1.5 border-b border-[#ffe0b2] flex items-center justify-between text-[11px] text-[#e65100]">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#EF6C00] animate-pulse"></span>
            10초 자동 새로고침 중
          </span>
          <span className="text-[10px] text-[#b26a00]">네이버 지도 실시간 기준</span>
        </div>

        {/* Content Body: 2-Column Section Layout for Upbound / Downbound */}
        <div className="p-4 space-y-4">
          {subwayError ? (
            <div className="p-3 text-center text-[12px] text-[#c64545] bg-[#fdf2f2] rounded-xl border border-[#f8d7da] flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{subwayError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 상행: 경복궁 / 대화 방면 */}
              <div className="bg-[#faf9f5] rounded-xl border border-[#e6dfd8] p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#e6dfd8] pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#EF6C00] text-white text-[11px] font-bold">
                      상행
                    </span>
                    <span className="text-[13px] font-bold text-[#141413]">
                      경복궁 / 대화 방면
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6c6a64] font-['Nanum_Gothic','NanumGothic',sans-serif]">3호선</span>
                </div>

                {subwayUpbound.length === 0 ? (
                  <div className="py-4 text-center text-[12px] text-[#8e8b82]">
                    {subwayLoading ? '열차 정보 도착 대기 중...' : '현재 운행 중인 상행 열차가 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subwayUpbound.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-2.5 border border-[#e6dfd8] flex items-center justify-between shadow-2xs hover:border-[#EF6C00] transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#141413]">
                              {item.bstatnNm}행
                            </span>
                            {item.btrainSttus === '급행' && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                급행
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6c6a64] mt-0.5 block">
                            {item.trainLineNm}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[12px] font-extrabold px-2 py-0.5 rounded-full ${
                            item.arvlMsg2.includes('도착') || item.arvlMsg2.includes('진입')
                              ? 'bg-[#ffe0b2] text-[#e65100] animate-pulse'
                              : 'bg-[#efe9de] text-[#141413]'
                          }`}>
                            {formatSubwayArvlMsg(item.arvlMsg2)}
                          </span>
                          {item.arvlMsg3 && item.arvlMsg3 !== item.statnNm && (
                            <span className="text-[10px] text-[#8e8b82] block mt-0.5">
                              ({item.arvlMsg3})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하행: 종로3가 / 오금 방면 */}
              <div className="bg-[#faf9f5] rounded-xl border border-[#e6dfd8] p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#e6dfd8] pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#EF6C00] text-white text-[11px] font-bold">
                      하행
                    </span>
                    <span className="text-[13px] font-bold text-[#141413]">
                      종로3가 / 오금 방면
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6c6a64] font-['Nanum_Gothic','NanumGothic',sans-serif]">3호선</span>
                </div>

                {subwayDownbound.length === 0 ? (
                  <div className="py-4 text-center text-[12px] text-[#8e8b82]">
                    {subwayLoading ? '열차 정보 도착 대기 중...' : '현재 운행 중인 하행 열차가 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subwayDownbound.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-2.5 border border-[#e6dfd8] flex items-center justify-between shadow-2xs hover:border-[#EF6C00] transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[#141413]">
                              {item.bstatnNm}행
                            </span>
                            {item.btrainSttus === '급행' && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                급행
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6c6a64] mt-0.5 block">
                            {item.trainLineNm}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[12px] font-extrabold px-2 py-0.5 rounded-full ${
                            item.arvlMsg2.includes('도착') || item.arvlMsg2.includes('진입')
                              ? 'bg-[#ffe0b2] text-[#e65100] animate-pulse'
                              : 'bg-[#efe9de] text-[#141413]'
                          }`}>
                            {formatSubwayArvlMsg(item.arvlMsg2)}
                          </span>
                          {item.arvlMsg3 && item.arvlMsg3 !== item.statnNm && (
                            <span className="text-[10px] text-[#8e8b82] block mt-0.5">
                              ({item.arvlMsg3})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 회사앞 정류장 (stID: 100000076, ARS_ID: 01172)                         */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-[#e6dfd8] shadow-xs overflow-hidden transition-all">
        {/* Header */}
        <div className="bg-[#efe9de] p-3.5 border-b border-[#e6dfd8] space-y-2">
          {/* Top Row: Icon + Title + ARS_ID & Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#cc785c] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bus className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-[16px] font-extrabold text-[#141413] tracking-tight whitespace-nowrap">
                  회사앞 정류장
                </h2>
                <span className="text-[11px] bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] px-1.5 py-0.5 rounded-md font-mono whitespace-nowrap shrink-0">
                  01172
                </span>
              </div>
            </div>

            {/* Refresh & Collapse Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleFrontRefresh}
                disabled={frontLoading}
                className="p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] text-[#cc785c] hover:bg-white active:scale-95 transition-all cursor-pointer"
                title="회사앞 정류장 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${frontLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setFrontCollapsed(prev => !prev)}
                className="p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] hover:bg-white active:scale-95 transition-all cursor-pointer"
                title={frontCollapsed ? '펼치기' : '접기'}
              >
                {frontCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sub Row: Direction Info & Load Time Badge */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#6c6a64] pt-1 border-t border-[#e6dfd8]/60">
            <p className="font-medium truncate min-w-0">
              안국역, 서울공예박물관 방면
            </p>

            <div className="flex items-center gap-1 bg-[#faf9f5] px-2 py-0.5 rounded-md border border-[#e6dfd8] shrink-0 whitespace-nowrap">
              <Clock className="w-3 h-3 text-[#cc785c]" />
              <span className="font-medium text-[11px] whitespace-nowrap">{frontTime || '조회 중'}</span>
            </div>
          </div>
        </div>

        {/* Soonest Arriving Bus Banner (Buses under 2 minutes, max 3, sorted by shortest time) */}
        <div className="bg-[#f5f0e8] px-3.5 py-2 border-b border-[#e6dfd8] flex items-center justify-between gap-2 text-[12px] flex-wrap">
          <span className="font-semibold text-[#141413] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            곧 도착 버스:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {frontSoonest.length > 0 ? (
              frontSoonest.map((b, idx) => (
                <span
                  key={idx}
                  className="font-bold text-[#cc785c] bg-white px-2 py-0.5 rounded-full border border-[#e6dfd8] shadow-2xs text-[11px] whitespace-nowrap"
                >
                  {b.rtNm}번 ({b.arrmsg})
                </span>
              ))
            ) : (
              <span className="text-[#8e8b82] text-[11px] bg-white/70 px-2 py-0.5 rounded-md border border-[#e6dfd8]">
                2분 이내 도착 예정 버스 없음
              </span>
            )}
          </div>
        </div>

        {/* Bus List Details (Collapsible Area) */}
        {!frontCollapsed && (
          <div className="p-4">
            {frontError ? (
              <div className="p-3 text-center text-[12px] text-[#c64545] bg-[#fdf2f2] rounded-xl border border-[#f8d7da] flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{frontError}</span>
              </div>
            ) : frontBuses.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[#8e8b82]">
                {frontLoading ? '버스 도착 정보를 불러오고 있습니다...' : '현재 도착 정보가 제공되는 버스가 없습니다.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[11px] text-[#6c6a64] flex justify-between px-1">
                  <span>버스 번호 (오름차순 정렬)</span>
                  <span>도착 예정 시간</span>
                </div>
                {frontBuses.map((bus) => (
                  <div
                    key={bus.rtNm}
                    className="bg-[#faf9f5] rounded-xl p-3 border border-[#e6dfd8] flex items-center justify-between hover:border-[#cc785c] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[17px] tracking-tight ${getBusNumberStyle(bus.rtNm)}`}>
                        {bus.rtNm}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-[13px] font-bold text-[#141413]">
                        {bus.arrmsg1 || '정보 없음'}
                      </div>
                      {bus.arrmsg2 && (
                        <div className="text-[11px] text-[#6c6a64]">
                          다음: {bus.arrmsg2}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. 회사 건너편 정류장 (stID: 100000103, ARS_ID: 01199)                    */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-[#e6dfd8] shadow-xs overflow-hidden transition-all">
        {/* Header */}
        <div className="bg-[#efe9de] p-3.5 border-b border-[#e6dfd8] space-y-2">
          {/* Top Row: Icon + Title + ARS_ID & Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#5db8a6] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bus className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-[16px] font-extrabold text-[#141413] tracking-tight whitespace-nowrap">
                  회사 건너편 정류장
                </h2>
                <span className="text-[11px] bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] px-1.5 py-0.5 rounded-md font-mono whitespace-nowrap shrink-0">
                  01199
                </span>
              </div>
            </div>

            {/* Refresh & Collapse Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleAcrossRefresh}
                disabled={acrossLoading}
                className="p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] text-[#5db8a6] hover:bg-white active:scale-95 transition-all cursor-pointer"
                title="회사 건너편 정류장 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${acrossLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setAcrossCollapsed(prev => !prev)}
                className="p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] hover:bg-white active:scale-95 transition-all cursor-pointer"
                title={acrossCollapsed ? '펼치기' : '접기'}
              >
                {acrossCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sub Row: Direction Info & Load Time Badge */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#6c6a64] pt-1 border-t border-[#e6dfd8]/60">
            <p className="font-medium truncate min-w-0">
              창경궁, 서울대학교병원 방면
            </p>

            <div className="flex items-center gap-1 bg-[#faf9f5] px-2 py-0.5 rounded-md border border-[#e6dfd8] shrink-0 whitespace-nowrap">
              <Clock className="w-3 h-3 text-[#5db8a6]" />
              <span className="font-medium text-[11px] whitespace-nowrap">{acrossTime || '조회 중'}</span>
            </div>
          </div>
        </div>

        {/* Soonest Arriving Bus Banner (Buses under 2 minutes, max 3, sorted by shortest time) */}
        <div className="bg-[#f5f0e8] px-3.5 py-2 border-b border-[#e6dfd8] flex items-center justify-between gap-2 text-[12px] flex-wrap">
          <span className="font-semibold text-[#141413] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            곧 도착 버스:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {acrossSoonest.length > 0 ? (
              acrossSoonest.map((b, idx) => (
                <span
                  key={idx}
                  className="font-bold text-[#5db8a6] bg-white px-2 py-0.5 rounded-full border border-[#e6dfd8] shadow-2xs text-[11px] whitespace-nowrap"
                >
                  {b.rtNm}번 ({b.arrmsg})
                </span>
              ))
            ) : (
              <span className="text-[#8e8b82] text-[11px] bg-white/70 px-2 py-0.5 rounded-md border border-[#e6dfd8]">
                2분 이내 도착 예정 버스 없음
              </span>
            )}
          </div>
        </div>

        {/* Bus List Details (Collapsible Area) */}
        {!acrossCollapsed && (
          <div className="p-4">
            {acrossError ? (
              <div className="p-3 text-center text-[12px] text-[#c64545] bg-[#fdf2f2] rounded-xl border border-[#f8d7da] flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{acrossError}</span>
              </div>
            ) : acrossBuses.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[#8e8b82]">
                {acrossLoading ? '버스 도착 정보를 불러오고 있습니다...' : '현재 도착 정보가 제공되는 버스가 없습니다.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[11px] text-[#6c6a64] flex justify-between px-1">
                  <span>버스 번호 (오름차순 정렬)</span>
                  <span>도착 예정 시간</span>
                </div>
                {acrossBuses.map((bus) => (
                  <div
                    key={bus.rtNm}
                    className="bg-[#faf9f5] rounded-xl p-3 border border-[#e6dfd8] flex items-center justify-between hover:border-[#5db8a6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[17px] tracking-tight ${getBusNumberStyle(bus.rtNm)}`}>
                        {bus.rtNm}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-[13px] font-bold text-[#141413]">
                        {bus.arrmsg1 || '정보 없음'}
                      </div>
                      {bus.arrmsg2 && (
                        <div className="text-[11px] text-[#6c6a64]">
                          다음: {bus.arrmsg2}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. 화면 제일 하단: API 서비스 유효기간 안내                             */}
      {/* ========================================================================= */}
      <footer className="pt-2 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#efe9de] border border-[#e6dfd8] text-[12px] text-[#6c6a64] shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-[#cc785c]" />
          <span>API 서비스 유효기간: <strong className="text-[#141413] font-bold">{SERVICE_EXPIRATION_DATE}</strong>까지</span>
        </div>
      </footer>
    </div>
  );
};

export default ZipGaja;
