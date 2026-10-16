import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Clock, Bus, AlertCircle, ShieldCheck } from 'lucide-react';
import { getBusServiceKey, getSubwayServiceKey, SERVICE_EXPIRATION_DATE } from '../utils/crypto';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SubwayArrival {
  subwayId?: string;
  updnLine: string; // "상행" or "하행"
  trainLineNm: string; // "대화행 - 경복궁방면"
  statnNm: string; // "안국"
  btrainNo?: string; // Train number e.g. "3428"
  bstatnNm: string; // Terminal station name e.g. "대화", "구파발"
  arvlMsg2: string; // "전역 도착" or "4분 30초 후 (독립문)"
  arvlMsg3: string; // Current train station name e.g. "독립문"
  btrainSttus: string; // "일반" or "급행"
  recptnDt: string; // "YYYY-MM-DD HH:mm:ss" (KST)
  barvlDt?: string; // Remaining seconds string from API
  arvlCd?: string; // "0": 진입, "1": 도착, "2": 출발, "3": 전역출발, "4": 전역진입, "5": 전역도착, "99": 운행중
  lstcarAt?: string; // "1": 막차, "0": 아님
  baseTimestamp: number; // Compensated reference timestamp (ms)
}

interface BusArrival {
  stId: string;
  stNm: string;
  arsId: string;
  rtNm: string; // Bus number e.g. "151"
  rawArrmsg1: string; // 1st bus arrival message
  rawArrmsg2: string; // 2nd bus arrival message
  initialSec1: number;
  initialSec2: number;
  baseTimestamp1: number;
  baseTimestamp2: number;
  stationNm1?: string;
  stationNm2?: string;
  traTime1?: number;
  traTime2?: number;
  isLast1?: boolean;
  isLast2?: boolean;
}

interface ZipGajaProps {
  onRegisterRefresh?: (fn: () => void) => void;
}

interface SoonestBusItem {
  rtNm: string;
  isSoon: boolean;
  seconds: number;
}

interface BusStopState {
  buses: BusArrival[];
  time: string;
  loading: boolean;
  collapsed: boolean;
  error: string | null;
}

interface CachedTimestampEntry {
  signature: string;
  baseTimestamp: number;
}

// Maximum time (ms) to preserve an unchanged API state timestamp before resyncing
const MAX_SUBWAY_CACHE_AGE_MS = 180_000;
const MAX_BUS_CACHE_AGE_MS = 45_000;

// ============================================================================
// Pure Utility & Time Compensation Functions
// ============================================================================

/**
 * Format Date to Korean AM/PM (오전/오후 hh:mm:ss) in Asia/Seoul timezone
 */
function formatAmPm(date: Date = new Date()): string {
  return date.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format subway arrival message by stripping parenthesized station info
 * e.g. "4분 30초 후 (독립문)" -> "4분 30초 후", "[3]번째 전역 (동대입구)" -> "3번째 전역"
 */
function formatSubwayArvlMsg(msg?: string): string {
  if (!msg) return '';
  return msg
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\[(\d+)\]/g, '$1')
    .trim();
}

/**
 * Parse Subway API recptnDt string ("YYYY-MM-DD HH:mm:ss" KST) into timestamp ms.
 * Explicitly enforces +09:00 KST offset and clamps against future clock skew.
 */
function parseRecptnDt(dtStr?: string, fallbackNow: number = Date.now()): number {
  if (!dtStr) return fallbackNow;
  const trimmed = dtStr.trim();
  if (!trimmed) return fallbackNow;

  const iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const withTz = /[+-]\d{2}:\d{2}$|Z$/i.test(iso) ? iso : `${iso}+09:00`;
  const parsed = new Date(withTz).getTime();

  if (Number.isNaN(parsed)) return fallbackNow;
  // Prevent negative elapsed time if API server clock is slightly ahead of client clock
  return Math.min(fallbackNow, parsed);
}

/**
 * Sanitize subway terminal destination name.
 * Fixes Seoul Open API bug where unmapped Line 3 terminal station IDs return "-2".
 */
function formatSubwayDestination(item: SubwayArrival): string {
  const raw = (item.bstatnNm || '').trim();
  if (!raw || /^-?\d+$/.test(raw)) {
    return item.updnLine === '상행' ? '구파발·대화행' : '수서·오금행';
  }
  return raw.endsWith('행') ? raw : `${raw}행`;
}

/**
 * Sanitize subway trainLineNm (e.g. "-2행 - 종로3가방면" -> "수서·오금행 - 종로3가방면")
 */
function formatSubwayLineNm(item: SubwayArrival): string {
  const raw = (item.trainLineNm || '').trim();
  const dest = formatSubwayDestination(item);
  if (!raw) return dest;
  return raw.replace(/^-?\d+행/, dest);
}

/**
 * Extract initial remaining seconds from SubwayArrival.
 * Note: barvlDt === "0" in Seoul Open API is a default placeholder when numeric ETA
 * is omitted, NOT 0 seconds remaining (actual arrival uses arvlCd '0' or '1').
 */
function parseSubwayInitialSeconds(item: SubwayArrival): number {
  if (item.barvlDt !== undefined && item.barvlDt !== null && item.barvlDt !== '') {
    const parsedBarvl = parseInt(item.barvlDt, 10);
    if (!Number.isNaN(parsedBarvl) && parsedBarvl > 0) {
      return parsedBarvl;
    }
  }

  if (item.arvlMsg2) {
    const minMatch = item.arvlMsg2.match(/(\d+)\s*분/);
    const secMatch = item.arvlMsg2.match(/(\d+)\s*초/);
    if (minMatch || secMatch) {
      const m = minMatch ? parseInt(minMatch[1], 10) : 0;
      const s = secMatch ? parseInt(secMatch[1], 10) : 0;
      const total = m * 60 + s;
      if (total > 0) return total;
    }
  }

  return NaN;
}

/**
 * Calculate compensated subway arrival message and sub-label
 */
function getCompensatedSubwayDisplay(
  item: SubwayArrival,
  now: number
): { badgeText: string; subText: string; isUrgent: boolean } {
  const cleanMsg = formatSubwayArvlMsg(item.arvlMsg2);
  const stationName = (item.arvlMsg3 || '').trim();
  const hasDistinctStation = Boolean(stationName && stationName !== item.statnNm);

  // 1. Target station immediate status codes (0: 진입, 1: 도착, 2: 출발)
  if (item.arvlCd === '1' || cleanMsg.includes('안국 도착') || cleanMsg === '도착') {
    return { badgeText: '안국 도착', subText: '', isUrgent: true };
  }
  if (item.arvlCd === '0' || cleanMsg.includes('안국 진입') || cleanMsg === '진입') {
    return { badgeText: '안국 진입', subText: '', isUrgent: true };
  }
  if (item.arvlCd === '2' || cleanMsg.includes('안국 출발') || cleanMsg === '출발') {
    return { badgeText: '안국 출발', subText: '', isUrgent: false };
  }

  const elapsedSec = Math.max(0, Math.floor((now - item.baseTimestamp) / 1000));
  const initialSec = parseSubwayInitialSeconds(item);
  const isPrevStationMsg =
    item.arvlCd === '3' ||
    item.arvlCd === '4' ||
    item.arvlCd === '5' ||
    cleanMsg.startsWith('전역');

  // 2. Numeric countdown available
  if (!Number.isNaN(initialSec) && initialSec > 0) {
    const adjustedSec = initialSec - elapsedSec;

    if (adjustedSec <= 0) {
      // Only transition to '안국 진입' if the train had already departed the previous station
      // or was within 1 station; otherwise keep current status to avoid false arrival display
      const isOneStopAway =
        item.arvlCd === '3' ||
        stationName === '경복궁' ||
        stationName === '종로3가';

      if (isOneStopAway) {
        return {
          badgeText: '안국 진입',
          subText: hasDistinctStation ? `(${stationName})` : '',
          isUrgent: true,
        };
      }

      return {
        badgeText: cleanMsg || '운행 중',
        subText: hasDistinctStation ? `(${stationName})` : '',
        isUrgent: false,
      };
    }

    const m = Math.floor(adjustedSec / 60);
    const s = adjustedSec % 60;
    const timeText = m > 0 ? `${m}분 ${s}초 후` : `${s}초 후`;

    if (isPrevStationMsg && cleanMsg) {
      const subParts = [cleanMsg, hasDistinctStation ? stationName : ''].filter(Boolean);
      return {
        badgeText: timeText,
        subText: subParts.length > 0 ? `(${subParts.join(' · ')})` : '',
        isUrgent: adjustedSec <= 60,
      };
    }

    return {
      badgeText: timeText,
      subText: hasDistinctStation ? `(${stationName})` : '',
      isUrgent: adjustedSec <= 30,
    };
  }

  // 3. Fallback when API provides no numeric seconds (barvlDt === "0")
  const fallbackBadge = cleanMsg || '운행 중';
  return {
    badgeText: fallbackBadge,
    subText: hasDistinctStation ? `(${stationName})` : '',
    isUrgent: fallbackBadge.includes('도착') || fallbackBadge.includes('진입'),
  };
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
  }
  if (digits.length === 4) {
    return 'text-[#15803d] font-bold';
  }
  return 'text-[#141413] font-bold';
}

/**
 * Extract effective arrival message by evaluating primary, secondary, and trajectory time
 */
function getEffectiveArrmsg(arrmsg?: string, arrmsgSec?: string, traTime?: number): string {
  const primary = (arrmsg || '').trim();
  const secondary = (arrmsgSec || '').trim();

  if (primary.includes('종료') || secondary.includes('종료')) {
    return '운행종료';
  }

  if (primary && (primary.includes('분') || primary.includes('초') || primary.includes('곧') || primary.includes('진입'))) {
    return primary;
  }
  if (secondary && (secondary.includes('분') || secondary.includes('초') || secondary.includes('곧') || secondary.includes('진입'))) {
    return secondary;
  }

  if (primary.includes('대기') || secondary.includes('대기')) {
    return '출발대기';
  }

  if (typeof traTime === 'number' && traTime > 0) {
    const m = Math.floor(traTime / 60);
    const s = traTime % 60;
    return m > 0 ? `${m}분 ${s}초후` : `${s}초후`;
  }

  if (primary) return primary;
  if (secondary) return secondary;
  return '정보 없음';
}

/**
 * Parse bus arrival estimate in seconds.
 * Prioritizes exact second-resolution `traTime` from Seoul Bus API when `arrmsg`
 * only contains whole minutes (e.g. "5분후") or generic "곧 도착" (< 2 min).
 */
function parseBusArrivalSeconds(arrmsg: string, traTime?: number): number {
  if (!arrmsg || arrmsg === '출발대기' || arrmsg === '운행종료') {
    return Infinity;
  }

  const minMatch = arrmsg.match(/(\d+)\s*분/);
  const secMatch = arrmsg.match(/(\d+)\s*초/);

  // If arrmsg explicitly contains both minutes and seconds, use it
  if (minMatch && secMatch) {
    return parseInt(minMatch[1], 10) * 60 + parseInt(secMatch[1], 10);
  }

  // Prioritize exact traTime (seconds) from API when available (covers "5분후" & "곧 도착" with <120s)
  if (typeof traTime === 'number' && !Number.isNaN(traTime) && traTime > 0) {
    return traTime;
  }

  if (arrmsg.includes('곧') || arrmsg.includes('진입')) {
    return 0;
  }

  if (minMatch || secMatch) {
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
    return mins * 60 + secs;
  }

  return Infinity;
}

/**
 * Format countdown arrival message based on initial seconds, elapsed time, and original raw message.
 * Properly separates '[막차]' prefix from '[N번째 전]' station suffix and preserves
 * 'mm분 ss초후' / 'ss초후' countdown even for buses under 2 minutes.
 */
function formatBusCountdownMsg(
  initialSec: number,
  elapsedSec: number,
  rawMsg: string,
  isLast?: boolean
): string {
  if (!rawMsg) return '정보 없음';
  if (rawMsg === '운행종료' || rawMsg === '출발대기') return rawMsg;

  const hasLastTag = rawMsg.includes('[막차]') || Boolean(isLast);
  const prefix = hasLastTag ? '[막차] ' : '';

  const brackets = rawMsg.match(/\[[^\]]+\]/g) || [];
  const suffix = brackets.filter((b) => b !== '[막차]').join('');

  if (!Number.isFinite(initialSec) || Number.isNaN(initialSec)) {
    return rawMsg;
  }

  if (initialSec === 0 && (rawMsg.includes('곧') || rawMsg.includes('진입'))) {
    return `${prefix}곧 도착${suffix}`;
  }

  const currentRemaining = Math.max(0, initialSec - elapsedSec);
  const m = Math.floor(currentRemaining / 60);
  const s = currentRemaining % 60;

  if (m > 0) {
    return `${prefix}${m}분 ${s}초후${suffix}`;
  }
  if (s > 0) {
    return `${prefix}${s}초후${suffix}`;
  }
  if (rawMsg.includes('곧') || rawMsg.includes('진입')) {
    return `${prefix}곧 도착${suffix}`;
  }
  return `${prefix}0초후${suffix}`;
}

/**
 * Extract buses arriving soon ('곧 도착' or remaining time < 120s), max 5.
 * Sorted by shortest remaining seconds first.
 */
function getSoonestBusesUnder2Min(buses: BusArrival[], now: number): SoonestBusItem[] {
  if (!buses || buses.length === 0) return [];

  const list: SoonestBusItem[] = [];

  for (const b of buses) {
    if (b.rawArrmsg1 === '운행종료' || b.rawArrmsg1 === '출발대기') continue;

    const elapsedSec = Math.max(0, Math.floor((now - b.baseTimestamp1) / 1000));
    const isSoonMsg = b.rawArrmsg1.includes('곧') || b.rawArrmsg1.includes('진입');
    const remainingSec = b.initialSec1 - elapsedSec;

    if (isSoonMsg || (remainingSec >= 0 && remainingSec < 120)) {
      const effectiveSeconds = Number.isFinite(remainingSec) ? Math.max(0, remainingSec) : 0;
      list.push({
        rtNm: b.rtNm,
        isSoon: isSoonMsg || effectiveSeconds <= 0,
        seconds: effectiveSeconds,
      });
    }
  }

  list.sort((a, b) => {
    if (a.seconds !== b.seconds) {
      return a.seconds - b.seconds;
    }
    if (a.isSoon !== b.isSoon) {
      return a.isSoon ? -1 : 1;
    }
    return a.rtNm.localeCompare(b.rtNm, undefined, { numeric: true });
  });

  return list.slice(0, 5);
}

// ============================================================================
// Subcomponents
// ============================================================================

interface SubwayDirectionPanelProps {
  directionLabel: '상행' | '하행';
  directionTitle: string;
  trains: SubwayArrival[];
  loading: boolean;
  now: number;
}

const SubwayDirectionPanel: React.FC<SubwayDirectionPanelProps> = ({
  directionLabel,
  directionTitle,
  trains,
  loading,
  now,
}) => (
  <div className="bg-[#faf9f5] rounded-xl border border-[#e6dfd8] p-3 space-y-2.5">
    <div className="flex items-center justify-between border-b border-[#e6dfd8] pb-2">
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-md bg-[#EF6C00] text-white text-[11px] font-bold">
          {directionLabel}
        </span>
        <span className="text-[13px] font-bold text-[#141413]">{directionTitle}</span>
      </div>
      <span className="text-[10px] text-[#6c6a64] font-['Nanum_Gothic','NanumGothic',sans-serif]">
        3호선
      </span>
    </div>

    {trains.length === 0 ? (
      <div className="py-4 text-center text-[12px] text-[#8e8b82]">
        {loading ? '열차 정보 도착 대기 중...' : `현재 운행 중인 ${directionLabel} 열차가 없습니다.`}
      </div>
    ) : (
      <div className="space-y-2">
        {trains.map((item, idx) => {
          const { badgeText, subText, isUrgent } = getCompensatedSubwayDisplay(item, now);
          const destText = formatSubwayDestination(item);
          const lineNmText = formatSubwayLineNm(item);

          return (
            <div
              key={item.btrainNo ? `${directionLabel}-${item.btrainNo}-${idx}` : `${directionLabel}-${idx}`}
              className="bg-white rounded-lg p-2.5 border border-[#e6dfd8] flex items-center justify-between shadow-2xs hover:border-[#EF6C00] transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#141413]">{destText}</span>
                  {item.btrainSttus === '급행' && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      급행
                    </span>
                  )}
                  {item.lstcarAt === '1' && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      막차
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#6c6a64] mt-0.5 block">{lineNmText}</span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block text-[12px] font-extrabold px-2 py-0.5 rounded-full ${
                    isUrgent
                      ? 'bg-[#ffe0b2] text-[#e65100] animate-pulse'
                      : 'bg-[#efe9de] text-[#141413]'
                  }`}
                >
                  {badgeText}
                </span>
                {subText && (
                  <span className="text-[10px] text-[#8e8b82] block mt-0.5">{subText}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

interface BusStopSectionProps {
  title: string;
  arsId: string;
  directionDesc: string;
  accentColor: 'rust' | 'teal';
  state: BusStopState;
  now: number;
  onRefresh: () => void;
  onToggleCollapse: () => void;
}

const BusStopSection: React.FC<BusStopSectionProps> = ({
  title,
  arsId,
  directionDesc,
  accentColor,
  state,
  now,
  onRefresh,
  onToggleCollapse,
}) => {
  const soonestBuses = getSoonestBusesUnder2Min(state.buses, now);

  const badgeBg = accentColor === 'rust' ? 'bg-[#cc785c]' : 'bg-[#5db8a6]';
  const accentText = accentColor === 'rust' ? 'text-[#cc785c]' : 'text-[#5db8a6]';
  const cardHoverBorder =
    accentColor === 'rust' ? 'hover:border-[#cc785c]' : 'hover:border-[#5db8a6]';

  return (
    <section className="bg-white rounded-2xl border border-[#e6dfd8] shadow-xs overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-[#efe9de] p-3.5 border-b border-[#e6dfd8] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl ${badgeBg} text-white flex items-center justify-center shrink-0 shadow-xs`}
            >
              <Bus className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-[16px] font-extrabold text-[#141413] tracking-tight whitespace-nowrap">
                {title}
              </h2>
              <span className="text-[11px] bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] px-1.5 py-0.5 rounded-md font-mono whitespace-nowrap shrink-0">
                {arsId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onRefresh}
              disabled={state.loading}
              className={`p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] ${accentText} hover:bg-white active:scale-95 transition-all cursor-pointer`}
              title={`${title} 새로고침`}
            >
              <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] hover:bg-white active:scale-95 transition-all cursor-pointer"
              title={state.collapsed ? '펼치기' : '접기'}
            >
              {state.collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-[#6c6a64] pt-1 border-t border-[#e6dfd8]/60">
          <p className="font-medium truncate min-w-0">{directionDesc}</p>

          <div className="flex items-center gap-1 bg-[#faf9f5] px-2 py-0.5 rounded-md border border-[#e6dfd8] shrink-0 whitespace-nowrap">
            <Clock className={`w-3 h-3 ${accentText}`} />
            <span className="font-medium text-[11px] whitespace-nowrap">
              {state.time || '조회 중'}
            </span>
          </div>
        </div>
      </div>

      {/* Soonest Arriving Bus Banner (Under 2 minutes, max 5) */}
      <div className="bg-[#f5f0e8] px-3.5 py-2 border-b border-[#e6dfd8] flex items-center justify-between gap-2 text-[12px] flex-wrap min-h-[36px]">
        <span className="font-semibold text-[#141413] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          곧 도착 버스:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {soonestBuses.length === 0 ? (
            <span className="text-[11px] text-[#8e8b82]">2분 내 도착 예정 없음</span>
          ) : (
            soonestBuses.map((b) => (
              <span
                key={b.rtNm}
                className={`font-bold ${accentText} bg-white px-2.5 py-0.5 rounded-full border border-[#e6dfd8] shadow-2xs text-[11px] whitespace-nowrap`}
              >
                {b.rtNm}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Collapsible Bus List */}
      {!state.collapsed && (
        <div className="p-4">
          {state.error ? (
            <div className="p-3 text-center text-[12px] text-[#c64545] bg-[#fdf2f2] rounded-xl border border-[#f8d7da] flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{state.error}</span>
            </div>
          ) : state.buses.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[#8e8b82]">
              {state.loading
                ? '버스 도착 정보를 불러오고 있습니다...'
                : '현재 도착 정보가 제공되는 버스가 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-[11px] text-[#6c6a64] flex justify-between px-1">
                <span>버스 번호</span>
                <span>도착 예정 시간</span>
              </div>
              {state.buses.map((bus) => {
                const elapsedSec1 = Math.max(0, Math.floor((now - bus.baseTimestamp1) / 1000));
                const elapsedSec2 = Math.max(0, Math.floor((now - bus.baseTimestamp2) / 1000));
                const msg1 = formatBusCountdownMsg(
                  bus.initialSec1,
                  elapsedSec1,
                  bus.rawArrmsg1,
                  bus.isLast1
                );
                const msg2 = formatBusCountdownMsg(
                  bus.initialSec2,
                  elapsedSec2,
                  bus.rawArrmsg2,
                  bus.isLast2
                );

                return (
                  <div
                    key={bus.rtNm}
                    className={`bg-[#faf9f5] rounded-xl p-3 border border-[#e6dfd8] flex items-center justify-between ${cardHoverBorder} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[17px] tracking-tight ${getBusNumberStyle(bus.rtNm)}`}>
                        {bus.rtNm}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-[13px] font-bold text-[#141413]">{msg1}</div>
                      {bus.rawArrmsg2 && (
                        <div className="text-[11px] text-[#6c6a64]">다음: {msg2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// Main Component: ZipGaja
// ============================================================================

export const ZipGaja: React.FC<ZipGajaProps> = ({ onRegisterRefresh }) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // Caches to preserve baseline timestamps across 10s polls when server data hasn't changed
  const subwayTimestampCacheRef = useRef<Map<string, CachedTimestampEntry>>(new Map());
  const busTimestampCacheRef = useRef<Map<string, CachedTimestampEntry>>(new Map());

  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Anguk Subway State
  const [subwayData, setSubwayData] = useState<SubwayArrival[]>([]);
  const [subwayTime, setSubwayTime] = useState<string>('');
  const [subwayLoading, setSubwayLoading] = useState<boolean>(false);
  const [subwayError, setSubwayError] = useState<string | null>(null);

  // Company Front Stop (ARS ID: 01172)
  const [frontState, setFrontState] = useState<BusStopState>({
    buses: [],
    time: '',
    loading: false,
    collapsed: false,
    error: null,
  });

  // Company Across Stop (ARS ID: 01199)
  const [acrossState, setAcrossState] = useState<BusStopState>({
    buses: [],
    time: '',
    loading: false,
    collapsed: false,
    error: null,
  });

  // Fetch Anguk Station Subway Data
  const fetchSubwayData = useCallback(async () => {
    setSubwayLoading(true);
    setSubwayError(null);
    try {
      let data: any = null;
      const cacheBuster = Date.now();

      try {
        const res = await fetch(
          `/api/subway?station=${encodeURIComponent('안국')}&_t=${cacheBuster}`
        );
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Fallback to direct fetch when running in environments that allow HTTP
      }

      if (!data || !data.realtimeArrivalList) {
        const key = getSubwayServiceKey();
        const fallbackUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/1/20/${encodeURIComponent('안국')}`;
        const res = await fetch(fallbackUrl);
        data = await res.json();
      }

      const fetchTs = Date.now();
      const rawList: any[] = Array.isArray(data?.realtimeArrivalList)
        ? data.realtimeArrivalList
        : [];

      // Filter to Line 3 (1003) if subwayId is present
      const line3List = rawList.filter((item) => !item.subwayId || String(item.subwayId) === '1003');

      const enriched: SubwayArrival[] = line3List.map((item, idx) => {
        const trainKey = `${item.updnLine || ''}-${item.btrainNo || idx}`;
        const signature = `${item.arvlCd || ''}|${item.barvlDt || ''}|${formatSubwayArvlMsg(item.arvlMsg2)}|${item.arvlMsg3 || ''}`;
        const recptnMs = parseRecptnDt(item.recptnDt, fetchTs);

        const prev = subwayTimestampCacheRef.current.get(trainKey);
        let baseTimestamp = recptnMs;

        // If train state signature hasn't changed since last poll, preserve original baseTimestamp
        // so that server-side 20s recptnDt cache bumps don't cause countdown timer jump-backs
        if (
          prev &&
          prev.signature === signature &&
          fetchTs - prev.baseTimestamp < MAX_SUBWAY_CACHE_AGE_MS
        ) {
          baseTimestamp = Math.min(prev.baseTimestamp, recptnMs);
        }

        subwayTimestampCacheRef.current.set(trainKey, { signature, baseTimestamp });

        return {
          subwayId: item.subwayId,
          updnLine: item.updnLine,
          trainLineNm: item.trainLineNm,
          statnNm: item.statnNm,
          btrainNo: item.btrainNo,
          bstatnNm: item.bstatnNm,
          arvlMsg2: item.arvlMsg2,
          arvlMsg3: item.arvlMsg3,
          btrainSttus: item.btrainSttus,
          recptnDt: item.recptnDt,
          barvlDt: item.barvlDt,
          arvlCd: item.arvlCd !== undefined && item.arvlCd !== null ? String(item.arvlCd) : undefined,
          lstcarAt: item.lstcarAt !== undefined && item.lstcarAt !== null ? String(item.lstcarAt) : undefined,
          baseTimestamp,
        };
      });

      setSubwayData(enriched);
      setSubwayTime(formatAmPm());
      setNow(Date.now());
    } catch (err) {
      console.error('Subway Fetch Error:', err);
      setSubwayError('지하철 정보를 불러오는 중 오류가 발생했습니다.');
      setSubwayTime(formatAmPm());
    } finally {
      setSubwayLoading(false);
    }
  }, []);

  // Fetch Bus Stop Data by ARS ID
  const fetchBusStopData = useCallback(
    async (arsId: string, setStopState: React.Dispatch<React.SetStateAction<BusStopState>>) => {
      setStopState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        let rawItems: any[] = [];
        const cacheBuster = Date.now();

        try {
          const res = await fetch(`/api/bus?arsId=${arsId}&_t=${cacheBuster}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json: any = await res.json();
            const list = json?.msgBody?.itemList ?? json?.ServiceResult?.msgBody?.itemList ?? json?.itemList;
            if (list) {
              rawItems = Array.isArray(list) ? list : [list];
            }
          }
        } catch {
          // Fallback to direct fetch
        }

        if (rawItems.length === 0) {
          const key = getBusServiceKey();
          const fallbackUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${key}&arsId=${arsId}&resultType=json`;
          const res = await fetch(fallbackUrl);
          const json: any = await res.json();
          const body = json?.msgBody || json?.ServiceResult?.msgBody;
          if (body?.itemList) {
            rawItems = Array.isArray(body.itemList) ? body.itemList : [body.itemList];
          }
        }

        const fetchTs = Date.now();
        const sorted: BusArrival[] = rawItems
          .map((item: any) => {
            const rtNm = String(item.rtNm || item.busRouteAbrv || '').trim();
            const traTime1 = item.traTime1 !== undefined ? parseInt(String(item.traTime1), 10) : undefined;
            const traTime2 = item.traTime2 !== undefined ? parseInt(String(item.traTime2), 10) : undefined;
            const rawArrmsg1 = getEffectiveArrmsg(item.arrmsg1, item.arrmsgSec1, traTime1);
            const rawArrmsg2 = getEffectiveArrmsg(item.arrmsg2, item.arrmsgSec2, traTime2);
            const initialSec1 = parseBusArrivalSeconds(rawArrmsg1, traTime1);
            const initialSec2 = parseBusArrivalSeconds(rawArrmsg2, traTime2);

            // Preserve baseTimestamp when server BIS snapshot hasn't updated between 10s polls
            const key1 = `${arsId}-${rtNm}-1`;
            const sig1 = `${rawArrmsg1}|${traTime1 ?? ''}`;
            const prev1 = busTimestampCacheRef.current.get(key1);
            const baseTimestamp1 =
              prev1 && prev1.signature === sig1 && fetchTs - prev1.baseTimestamp < MAX_BUS_CACHE_AGE_MS
                ? prev1.baseTimestamp
                : fetchTs;
            busTimestampCacheRef.current.set(key1, { signature: sig1, baseTimestamp: baseTimestamp1 });

            const key2 = `${arsId}-${rtNm}-2`;
            const sig2 = `${rawArrmsg2}|${traTime2 ?? ''}`;
            const prev2 = busTimestampCacheRef.current.get(key2);
            const baseTimestamp2 =
              prev2 && prev2.signature === sig2 && fetchTs - prev2.baseTimestamp < MAX_BUS_CACHE_AGE_MS
                ? prev2.baseTimestamp
                : fetchTs;
            busTimestampCacheRef.current.set(key2, { signature: sig2, baseTimestamp: baseTimestamp2 });

            return {
              stId: item.stId,
              stNm: item.stNm,
              arsId: item.arsId,
              rtNm,
              rawArrmsg1,
              rawArrmsg2,
              initialSec1,
              initialSec2,
              baseTimestamp1,
              baseTimestamp2,
              stationNm1: item.stationNm1,
              stationNm2: item.stationNm2,
              traTime1,
              traTime2,
              isLast1: String(item.isLast1) === '1',
              isLast2: String(item.isLast2) === '1',
            };
          })
          .sort((a, b) =>
            a.rtNm.localeCompare(b.rtNm, undefined, { numeric: true, sensitivity: 'base' })
          );

        setStopState((prev) => ({
          ...prev,
          buses: sorted,
          time: formatAmPm(),
          loading: false,
          error: null,
        }));
        setNow(Date.now());
      } catch (err) {
        console.error(`Bus Fetch Error (${arsId}):`, err);
        setStopState((prev) => ({
          ...prev,
          time: formatAmPm(),
          loading: false,
          error: '버스 도착 정보를 불러오는 중 오류가 발생했습니다.',
        }));
      }
    },
    []
  );

  const handleFrontRefresh = useCallback(() => {
    fetchBusStopData('01172', setFrontState);
  }, [fetchBusStopData]);

  const handleAcrossRefresh = useCallback(() => {
    fetchBusStopData('01199', setAcrossState);
  }, [fetchBusStopData]);

  const refreshAll = useCallback(() => {
    fetchSubwayData();
    handleFrontRefresh();
    handleAcrossRefresh();
  }, [fetchSubwayData, handleFrontRefresh, handleAcrossRefresh]);

  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(refreshAll);
    }
  }, [onRegisterRefresh, refreshAll]);

  useEffect(() => {
    refreshAll();
    const intervalId = setInterval(() => {
      refreshAll();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [refreshAll]);

  const subwayUpbound = subwayData.filter((item) => item.updnLine === '상행');
  const subwayDownbound = subwayData.filter((item) => item.updnLine === '하행');

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-5">
      {/* ========================================================================= */}
      {/* 1. 안국역 (Subway Line 3 - Naver Map Style UI)                            */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-[#e6dfd8] shadow-xs overflow-hidden">
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

        <div className="bg-[#fff8f0] px-4 py-1.5 border-b border-[#ffe0b2] flex items-center justify-between text-[11px] text-[#e65100]">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#EF6C00] animate-pulse"></span>
            10초 자동 새로고침 중
          </span>
        </div>

        <div className="p-4 space-y-4">
          {subwayError ? (
            <div className="p-3 text-center text-[12px] text-[#c64545] bg-[#fdf2f2] rounded-xl border border-[#f8d7da] flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{subwayError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SubwayDirectionPanel
                directionLabel="상행"
                directionTitle="경복궁 / 대화 방면"
                trains={subwayUpbound}
                loading={subwayLoading}
                now={now}
              />
              <SubwayDirectionPanel
                directionLabel="하행"
                directionTitle="종로3가 / 오금 방면"
                trains={subwayDownbound}
                loading={subwayLoading}
                now={now}
              />
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 회사앞 정류장 (ARS_ID: 01172)                                           */}
      {/* ========================================================================= */}
      <BusStopSection
        title="회사앞 정류장"
        arsId="01172"
        directionDesc="안국역, 서울공예박물관 방면"
        accentColor="rust"
        state={frontState}
        now={now}
        onRefresh={handleFrontRefresh}
        onToggleCollapse={() =>
          setFrontState((prev) => ({ ...prev, collapsed: !prev.collapsed }))
        }
      />

      {/* ========================================================================= */}
      {/* 3. 회사 건너편 정류장 (ARS_ID: 01199)                                     */}
      {/* ========================================================================= */}
      <BusStopSection
        title="회사 건너편 정류장"
        arsId="01199"
        directionDesc="창경궁, 서울대학교병원 방면"
        accentColor="teal"
        state={acrossState}
        now={now}
        onRefresh={handleAcrossRefresh}
        onToggleCollapse={() =>
          setAcrossState((prev) => ({ ...prev, collapsed: !prev.collapsed }))
        }
      />

      {/* ========================================================================= */}
      {/* 4. 화면 제일 하단: API 서비스 유효기간 안내                             */}
      {/* ========================================================================= */}
      <div className="pt-2 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#efe9de] border border-[#e6dfd8] text-[12px] text-[#6c6a64] shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-[#cc785c]" />
          <span>
            API 서비스 유효기간:{' '}
            <strong className="text-[#141413] font-bold">{SERVICE_EXPIRATION_DATE}</strong>까지
          </span>
        </div>
      </div>
    </div>
  );
};

export default ZipGaja;
