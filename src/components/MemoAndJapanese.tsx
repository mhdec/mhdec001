import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, RefreshCw, Eye, EyeOff, Award, HelpCircle } from 'lucide-react';
import { MemoItem, ThinkTab, JapaneseMode, JapaneseChar } from '../types';
import { HIRAGANA_DATA, KATAKANA_DATA } from '../data/japaneseData';

interface MemoAndJapaneseProps {
  thinkTab: ThinkTab;
}

export const MemoAndJapanese: React.FC<MemoAndJapaneseProps> = ({ thinkTab }) => {
  // ===================== MEMO STATE =====================
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentMemoId, setCurrentMemoId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState<string>('');
  const [contentInput, setContentInput] = useState<string>('');

  // Fetch Memos (Cloudflare KV/D1 API or LocalStorage fallback)
  const loadMemos = async () => {
    try {
      const res = await fetch('/api/memos');
      if (res.ok) {
        const data: any = await res.json();
        setMemos(data.memos || []);
        return;
      }
    } catch (err) {
      console.warn('Using LocalStorage fallback for Memos');
    }

    const local = localStorage.getItem('mhdec_memos');
    if (local) {
      try {
        setMemos(JSON.parse(local));
      } catch (e) {
        setMemos([]);
      }
    } else {
      // Default initial welcome memo
      const initial: MemoItem[] = [
        {
          id: '1',
          title: '메모장',
          content: '첫 번째 줄 내용이 카드에 표시됩니다.\n원하는 내용을 자유롭게 기록하고 관리해보세요!',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setMemos(initial);
      localStorage.setItem('mhdec_memos', JSON.stringify(initial));
    }
  };

  useEffect(() => {
    loadMemos();
  }, []);

  const saveMemosToStorage = (updated: MemoItem[]) => {
    setMemos(updated);
    localStorage.setItem('mhdec_memos', JSON.stringify(updated));

    // Sync to Cloudflare API if available
    try {
      fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memos: updated }),
      });
    } catch (err) {
      // fallback
    }
  };

  const handleOpenAddModal = () => {
    setCurrentMemoId(null);
    setTitleInput('');
    setContentInput('');
    setIsEditing(true);
  };

  const handleOpenEditModal = (memo: MemoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMemoId(memo.id);
    setTitleInput(memo.title);
    setContentInput(memo.content);
    setIsEditing(true);
  };

  const handleSaveMemo = () => {
    if (!titleInput.trim() && !contentInput.trim()) return;

    const nowIso = new Date().toISOString();
    if (currentMemoId) {
      // Edit existing
      const updated = memos.map((m) =>
        m.id === currentMemoId
          ? {
              ...m,
              title: titleInput.trim() || '제목 없음',
              content: contentInput,
              updatedAt: nowIso,
            }
          : m
      );
      saveMemosToStorage(updated);
    } else {
      // Add new
      const newMemo: MemoItem = {
        id: `${Date.now()}`,
        title: titleInput.trim() || '제목 없음',
        content: contentInput,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveMemosToStorage([newMemo, ...memos]);
    }

    setIsEditing(false);
  };

  const handleDeleteMemo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = memos.filter((m) => m.id !== id);
    saveMemosToStorage(updated);
  };

  // Extract first line of content for card excerpt requirement
  const getFirstLine = (text: string) => {
    if (!text) return '내용 없음';
    const lines = text.split('\n');
    return lines[0].trim() || lines[1]?.trim() || '내용 없음';
  };

  // ===================== JAPANESE STUDY STATE =====================
  const [japaneseMode, setJapaneseMode] = useState<JapaneseMode>('hiragana');
  const [studySubTab, setStudySubTab] = useState<'flashcard' | 'quiz_char' | 'quiz_kana'>('flashcard');
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const touchTimerRef = useRef<any>(null);

  // Get active dataset pool
  const getActiveDataset = (): JapaneseChar[] => {
    if (japaneseMode === 'hiragana') return HIRAGANA_DATA;
    if (japaneseMode === 'katakana') return KATAKANA_DATA;
    return [...HIRAGANA_DATA, ...KATAKANA_DATA];
  };

  const activeDataset = getActiveDataset();
  const currentChar = activeDataset[currentCharIndex % activeDataset.length] || activeDataset[0];

  // Randomize initial character when mode changes
  useEffect(() => {
    const dataset = getActiveDataset();
    const randIdx = Math.floor(Math.random() * dataset.length);
    setCurrentCharIndex(randIdx);
    setRevealed(false);
  }, [japaneseMode]);

  const handleNextChar = () => {
    setRevealed(false);
    const dataset = getActiveDataset();
    const randIdx = Math.floor(Math.random() * dataset.length);
    setCurrentCharIndex(randIdx);
  };

  // 1 Second Long-Press Handler for Pronunciation Reveal
  const handlePressStart = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setRevealed(true);
    }, 1000); // 1000ms = 1 second touch
  };

  const handlePressEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    setRevealed(false);
  };

  // Quiz State
  const [quizQuestion, setQuizQuestion] = useState<{
    target: JapaneseChar;
    options: string[];
    correctIndex: number;
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);

  const generateQuiz = (type: 'char' | 'kana') => {
    setSelectedAnswer(null);
    const dataset = getActiveDataset();
    const target = dataset[Math.floor(Math.random() * dataset.length)];

    // Generate 3 wrong options
    const wrongPool = dataset.filter((item) => item.char !== target.char);
    const shuffledWrong = [...wrongPool].sort(() => 0.5 - Math.random()).slice(0, 3);

    const targetVal = type === 'char' ? target.kana : target.char;
    const wrongVals = shuffledWrong.map((w) => (type === 'char' ? w.kana : w.char));

    const options = [...wrongVals];
    const correctIdx = Math.floor(Math.random() * 4);
    options.splice(correctIdx, 0, targetVal);

    setQuizQuestion({
      target,
      options,
      correctIndex: correctIdx,
    });
  };

  useEffect(() => {
    if (studySubTab === 'quiz_char') {
      generateQuiz('char');
    } else if (studySubTab === 'quiz_kana') {
      generateQuiz('kana');
    }
  }, [studySubTab, japaneseMode]);

  const handleAnswerClick = (index: number) => {
    if (selectedAnswer !== null || !quizQuestion) return;
    setSelectedAnswer(index);
    if (index === quizQuestion.correctIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  // Touch Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState<number>(0);
  const touchStartY = useRef<number>(0);

  const handleRefreshThinkPage = () => {
    if (thinkTab === 'memo') {
      loadMemos();
    } else {
      if (studySubTab === 'flashcard') {
        handleNextChar();
      } else {
        generateQuiz(studySubTab === 'quiz_char' ? 'char' : 'kana');
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const dist = currentY - touchStartY.current;
      if (dist > 0) {
        setPullDistance(Math.min(dist, 100));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefreshThinkPage();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-lg mx-auto px-4 py-4 space-y-4 min-h-[calc(100vh-60px)]"
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
      {/* ================= MEMO MODE ================= */}
      {thinkTab === 'memo' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#141413]">
              📝 메모장 ({memos.length})
            </span>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-[#cc785c] hover:bg-[#a9583e] text-white shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>새 메모 작성</span>
            </button>
          </div>

          {/* Cards Grid / List */}
          <div className="space-y-3">
            {memos.map((memo) => (
              <div
                key={memo.id}
                onClick={(e) => handleOpenEditModal(memo, e)}
                className="bg-[#efe9de] border border-[#e6dfd8] hover:border-[#cc785c]/60 rounded-2xl p-4 shadow-xs space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] font-bold text-[#141413] truncate">
                    {memo.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleOpenEditModal(memo, e)}
                      className="p-1.5 rounded-lg text-[#6c6a64] hover:text-[#cc785c] hover:bg-[#faf9f5] transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteMemo(memo.id, e)}
                      className="p-1.5 rounded-lg text-[#6c6a64] hover:text-[#c64545] hover:bg-[#faf9f5] transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Excerpt (First Line) */}
                <p className="text-[13px] text-[#3d3d3a] line-clamp-2 font-mono bg-[#faf9f5] p-2.5 rounded-xl border border-[#e6dfd8]/70">
                  {getFirstLine(memo.content)}
                </p>

                <div className="text-[10px] text-[#8e8b82] text-right">
                  {new Date(memo.updatedAt).toLocaleDateString('ko-KR')} 작성
                </div>
              </div>
            ))}

            {memos.length === 0 && (
              <div className="p-8 text-center text-[13px] text-[#6c6a64] bg-[#efe9de]/50 rounded-2xl border border-[#e6dfd8]">
                작성된 메모가 없습니다. 우측 상단버튼을 눌러 메모를 남겨보세요!
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          {isEditing && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#e6dfd8] pb-2">
                  <h3 className="text-[15px] font-bold text-[#141413]">
                    {currentMemoId ? '메모 수정' : '새 메모 작성'}
                  </h3>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 rounded-lg hover:bg-[#efe9de] text-[#6c6a64]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="제목 입력"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] bg-white border border-[#e6dfd8] rounded-xl focus:outline-none focus:border-[#cc785c]"
                />

                <textarea
                  placeholder="메모 내용을 입력하세요..."
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-[14px] bg-white border border-[#e6dfd8] rounded-xl focus:outline-none focus:border-[#cc785c] resize-none"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-[13px] font-semibold text-[#6c6a64] hover:bg-[#efe9de] rounded-xl border border-[#e6dfd8]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveMemo}
                    className="px-4 py-2 text-[13px] font-semibold bg-[#cc785c] text-white hover:bg-[#a9583e] rounded-xl shadow-xs"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= JAPANESE STUDY MODE ================= */}
      {thinkTab === 'japanese' && (
        <section className="space-y-4">
          {/* Mode Selector Row (Hiragana, Katakana, Random) */}
          <div className="flex items-center justify-between bg-[#efe9de] p-1 rounded-xl border border-[#e6dfd8]">
            <button
              onClick={() => setJapaneseMode('hiragana')}
              className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                japaneseMode === 'hiragana'
                  ? 'bg-[#cc785c] text-white shadow-xs'
                  : 'text-[#6c6a64] hover:text-[#141413]'
              }`}
            >
              히라가나
            </button>
            <button
              onClick={() => setJapaneseMode('katakana')}
              className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                japaneseMode === 'katakana'
                  ? 'bg-[#cc785c] text-white shadow-xs'
                  : 'text-[#6c6a64] hover:text-[#141413]'
              }`}
            >
              가타카나
            </button>
            <button
              onClick={() => setJapaneseMode('random')}
              className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                japaneseMode === 'random'
                  ? 'bg-[#cc785c] text-white shadow-xs'
                  : 'text-[#6c6a64] hover:text-[#141413]'
              }`}
            >
              랜덤 혼합
            </button>
          </div>

          {/* Sub Tab: Flashcard vs 2x2 Quiz */}
          <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 text-[13px]">
            <button
              onClick={() => setStudySubTab('flashcard')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                studySubTab === 'flashcard'
                  ? 'bg-[#141413] text-white'
                  : 'text-[#6c6a64] hover:bg-[#efe9de]'
              }`}
            >
              플래시카드
            </button>
            <button
              onClick={() => setStudySubTab('quiz_char')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                studySubTab === 'quiz_char'
                  ? 'bg-[#141413] text-white'
                  : 'text-[#6c6a64] hover:bg-[#efe9de]'
              }`}
            >
              글씨 ➜ 음 테스트
            </button>
            <button
              onClick={() => setStudySubTab('quiz_kana')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                studySubTab === 'quiz_kana'
                  ? 'bg-[#141413] text-white'
                  : 'text-[#6c6a64] hover:bg-[#efe9de]'
              }`}
            >
              음 ➜ 글씨 테스트
            </button>
          </div>

          {/* 1. Flashcard Mode */}
          {studySubTab === 'flashcard' && (
            <div className="space-y-4">
              {/* Flashcard Card View */}
              <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-3xl p-8 shadow-md text-center space-y-6">
                <div className="text-[12px] font-bold tracking-widest text-[#cc785c] uppercase">
                  {currentChar.type === 'hiragana' ? 'HIRAGANA' : 'KATAKANA'}
                </div>

                {/* Big Japanese Character Display */}
                <div className="text-[96px] font-extrabold text-[#141413] leading-none select-none my-4">
                  {currentChar.char}
                </div>

                {/* Touch 1s Reveal Area for Pronunciation */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] text-[#6c6a64] flex items-center justify-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>아래 상자를 1초 이상 누르면 음(발음)이 보입니다</span>
                  </div>

                  <div
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={handlePressStart}
                    onTouchEnd={handlePressEnd}
                    className={`no-select w-full py-4 rounded-2xl transition-all duration-300 font-bold text-[20px] flex items-center justify-center cursor-pointer shadow-xs ${
                      revealed
                        ? 'bg-[#cc785c] text-white ring-2 ring-[#a9583e]'
                        : 'bg-[#141413] text-[#141413] border border-[#3d3d3a]'
                    }`}
                  >
                    {revealed ? (
                      <div className="flex items-center gap-2">
                        <span>{currentChar.kana}</span>
                        <span className="text-[14px] opacity-80">({currentChar.romaji})</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-white/50 tracking-wider">
                        🔒 터치하여 1초 유지
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Character Button */}
              <div>
                <button
                  onClick={handleNextChar}
                  className="w-full py-3.5 rounded-2xl bg-[#cc785c] hover:bg-[#a9583e] text-white text-[15px] font-bold shadow-xs transition-colors cursor-pointer active:scale-98"
                >
                  다음 글자 ▶
                </button>
              </div>
            </div>
          )}

          {/* 2 & 3. 2x2 Grid Quiz Mode */}
          {(studySubTab === 'quiz_char' || studySubTab === 'quiz_kana') && quizQuestion && (
            <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#cc785c]">
                  {studySubTab === 'quiz_char' ? '글씨 보고 음 선택' : '음 보고 글씨 선택'}
                </span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-[#5db872] bg-white px-2.5 py-1 rounded-full border border-[#e6dfd8]">
                  <Award className="w-4 h-4 text-[#5db872]" />
                  <span>점수: {quizScore}점</span>
                </span>
              </div>

              {/* Target Display */}
              <div className="text-center py-4 bg-[#faf9f5] rounded-2xl border border-[#e6dfd8]">
                <div className="text-[72px] font-extrabold text-[#141413] leading-none">
                  {studySubTab === 'quiz_char' ? quizQuestion.target.char : quizQuestion.target.kana}
                </div>
              </div>

              {/* 2x2 Grid Options (4 Multiple Choices) */}
              <div className="grid grid-cols-2 gap-3" aria-label="4지선다 선택지">
                {quizQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === quizQuestion.correctIndex;

                  let btnStyle = 'bg-white text-[#141413] hover:bg-[#faf9f5] border-[#e6dfd8]';
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-[#5db872] text-white border-[#5db872] font-bold';
                    } else if (isSelected) {
                      btnStyle = 'bg-[#c64545] text-white border-[#c64545]';
                    } else {
                      btnStyle = 'bg-white text-gray-400 border-gray-200 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswerClick(idx)}
                      className={`h-16 rounded-2xl text-[24px] font-bold border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${btnStyle}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Next Question Button */}
              {selectedAnswer !== null && (
                <button
                  onClick={() => generateQuiz(studySubTab === 'quiz_char' ? 'char' : 'kana')}
                  className="w-full py-3 rounded-2xl bg-[#cc785c] hover:bg-[#a9583e] text-white text-[15px] font-bold shadow-xs transition-all cursor-pointer animate-bounce"
                >
                  다음 문제 ▶
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
