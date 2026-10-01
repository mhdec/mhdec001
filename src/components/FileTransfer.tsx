import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckSquare,
  Square,
  Clock,
  Tag,
  Search,
  ChevronRight,
  X,
  FolderDown
} from 'lucide-react';
import { FileItem, FileGroupCard } from '../types';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { loadCardsFromDB, saveCardsToDB } from '../utils/cardStorage';

const EXPIRATION_HOURS = 48;
const EXPIRATION_MS = EXPIRATION_HOURS * 60 * 60 * 1000;

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Live 48h Countdown Timer String Generator
function getCountdownString(uploadedAt: string, now: number) {
  const uploadTime = new Date(uploadedAt).getTime();
  const diff = EXPIRATION_MS - (now - uploadTime);
  if (diff <= 0) return '만료됨 (삭제 처리중)';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours}시간 ${minutes}분 ${seconds}초 남음`;
}

export const FileTransfer: React.FC = () => {
  const [cards, setCards] = useState<FileGroupCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload Form State
  const [titleInput, setTitleInput] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Selected Card Modal State
  const [activeModalCard, setActiveModalCard] = useState<FileGroupCard | null>(null);
  const [selectedFileIdsInModal, setSelectedFileIdsInModal] = useState<string[]>([]);

  // Live Timer for Countdowns
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Cards (Cloudflare API or IndexedDB fallback)
  const loadCards = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data: any = await res.json();
        const loaded: FileGroupCard[] = data.cards || [];
        if (loaded.length > 0) {
          const valid = loaded.filter((card) => {
            const age = Date.now() - new Date(card.uploadedAt).getTime();
            return age < EXPIRATION_MS;
          });
          setCards(valid);
          await saveCardsToDB(valid);
          return;
        }
      }
    } catch (err) {
      console.warn('Using IndexedDB fallback for Cards');
    }

    const localCards = await loadCardsFromDB();
    const valid = localCards.filter((card) => {
      const age = Date.now() - new Date(card.uploadedAt).getTime();
      return age < EXPIRATION_MS;
    });
    setCards(valid);
    await saveCardsToDB(valid);
  }, []);

  const { containerRef, pullDistance } = usePullToRefresh(loadCards);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const saveCardsToStorage = async (updated: FileGroupCard[]) => {
    setCards(updated);
    await saveCardsToDB(updated);

    // Sync to Cloudflare server API so Mobile and PC share cards in real-time
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: updated }),
      });
    } catch (err) {
      console.warn('Could not sync cards to API:', err);
    }
  };

  // Upload Batch Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (selectedFiles.length > 20) {
      setErrorMessage('한 번에 올릴 수 있는 최대 파일 개수는 20개입니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    setUploading(true);

    const fileItems: FileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const reader = new FileReader();

      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      const fileItem: FileItem = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      };

      fileItems.push(fileItem);
    }

    // Process Tags (#prefix clean up)
    let formattedTags = tagInput.trim();
    if (formattedTags && !formattedTags.startsWith('#')) {
      formattedTags = '#' + formattedTags.replace(/\s+/g, ' #');
    }

    const newCard: FileGroupCard = {
      id: `card_${Date.now()}`,
      title: titleInput.trim() || `${selectedFiles[0].name} 외 ${selectedFiles.length - 1}개`,
      tag: formattedTags,
      uploadedAt: new Date().toISOString(),
      files: fileItems,
    };

    const updated = [newCard, ...cards];
    saveCardsToStorage(updated);

    // Reset Form
    setTitleInput('');
    setTagInput('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Card Selection Checkbox Handlers
  const handleToggleCardSelect = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleToggleSelectAllCards = () => {
    if (selectedCardIds.length === cards.length) {
      setSelectedCardIds([]);
    } else {
      setSelectedCardIds(cards.map((c) => c.id));
    }
  };

  const handleDeleteSelectedCards = () => {
    if (selectedCardIds.length === 0) return;
    const remaining = cards.filter((c) => !selectedCardIds.includes(c.id));
    saveCardsToStorage(remaining);
    setSelectedCardIds([]);
  };

  // Open Card Detail Modal
  const handleOpenCardModal = (card: FileGroupCard) => {
    setActiveModalCard(card);
    setSelectedFileIdsInModal([]);
  };

  const handleCloseCardModal = () => {
    setActiveModalCard(null);
    setSelectedFileIdsInModal([]);
  };

  // Modal File Operations
  const handleToggleModalFileSelect = (fileId: string) => {
    setSelectedFileIdsInModal((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleToggleSelectAllModalFiles = () => {
    if (!activeModalCard) return;
    if (selectedFileIdsInModal.length === activeModalCard.files.length) {
      setSelectedFileIdsInModal([]);
    } else {
      setSelectedFileIdsInModal(activeModalCard.files.map((f) => f.id));
    }
  };

  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const triggerDownloadFile = (file: FileItem) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const targetUrl = file.url || file.dataUrl || '#';

    if (isIOS) {
      // iOS Safari Download & View Helper
      setDownloadToast(`📥 파일 다운로드됨 ('파일' 앱 ➜ '다운로드' 폴더 확인)`);
      setTimeout(() => setDownloadToast(null), 4000);

      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download All Files in Active Modal
  const handleDownloadAllInModal = () => {
    if (!activeModalCard) return;
    activeModalCard.files.forEach((file, index) => {
      setTimeout(() => {
        triggerDownloadFile(file);
      }, index * 250);
    });
  };

  // Download Selected Files in Modal
  const handleDownloadSelectedInModal = () => {
    if (!activeModalCard || selectedFileIdsInModal.length === 0) return;
    const selectedFiles = activeModalCard.files.filter((f) =>
      selectedFileIdsInModal.includes(f.id)
    );
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        triggerDownloadFile(file);
      }, index * 250);
    });
  };

  // Delete Selected Files inside Modal Card
  const handleDeleteSelectedFilesInModal = () => {
    if (!activeModalCard || selectedFileIdsInModal.length === 0) return;

    const remainingFiles = activeModalCard.files.filter(
      (f) => !selectedFileIdsInModal.includes(f.id)
    );

    if (remainingFiles.length === 0) {
      // If no files remain, delete the card itself
      const updatedCards = cards.filter((c) => c.id !== activeModalCard.id);
      saveCardsToStorage(updatedCards);
      handleCloseCardModal();
    } else {
      const updatedCard = { ...activeModalCard, files: remainingFiles };
      const updatedCards = cards.map((c) =>
        c.id === activeModalCard.id ? updatedCard : c
      );
      saveCardsToStorage(updatedCards);
      setActiveModalCard(updatedCard);
      setSelectedFileIdsInModal([]);
    }
  };

  // Filter Cards by Search Query (Title or Tag)
  const filteredCards = cards.filter((card) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      card.title.toLowerCase().includes(query) ||
      card.tag.toLowerCase().includes(query)
    );
  });

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

      {/* iOS Download Toast Notification Banner */}
      {downloadToast && (
        <div className="p-3 bg-[#141413] text-white rounded-xl text-[12px] font-semibold flex items-center justify-between shadow-md animate-fade-in">
          <span>{downloadToast}</span>
          <span className="text-[10px] text-[#cc785c]">iOS 파일 저장</span>
        </div>
      )}
      {/* Upload Zone & Form Card */}
      <section className="bg-[#efe9de] border border-[#e6dfd8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#faf9f5] border border-[#e6dfd8] text-[#cc785c]">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#141413]">
              파일 & 사진 업로드
            </h2>
            <p className="text-[11px] text-[#6c6a64]">
              최대 20개 파일 동시 선택 가능 (48시간 후 자동 삭제)
            </p>
          </div>
        </div>

        {/* Inputs for Title & Tag */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="카드 제목 입력 (예: 오늘 현장 사진)"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="w-full px-3.5 py-2 text-[13px] bg-white border border-[#e6dfd8] rounded-xl focus:outline-none focus:border-[#cc785c]"
          />
          <input
            type="text"
            placeholder="태그 입력 (예: #현장 #점검)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full px-3.5 py-2 text-[13px] bg-white border border-[#e6dfd8] rounded-xl focus:outline-none focus:border-[#cc785c]"
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileUpload}
          className="hidden"
          id="groupFileUploadInput"
        />

        <label
          htmlFor="groupFileUploadInput"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold bg-[#cc785c] hover:bg-[#a9583e] text-white shadow-xs transition-colors cursor-pointer active:scale-98"
        >
          <Upload className="w-4 h-4" />
          <span>{uploading ? '업로드 처리 중...' : '파일 선택 및 업로드'}</span>
        </label>

        {errorMessage && (
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#c64545] pt-1">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* Filter / Search Bar */}
      {cards.length > 0 && (
        <section className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6c6a64] absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="제목이나 태그로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[#faf9f5] border border-[#e6dfd8] rounded-xl focus:outline-none focus:border-[#cc785c]"
            />
          </div>

          {/* Cards Actions Bar */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handleToggleSelectAllCards}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#141413] cursor-pointer"
            >
              {selectedCardIds.length === cards.length ? (
                <CheckSquare className="w-4 h-4 text-[#cc785c]" />
              ) : (
                <Square className="w-4 h-4 text-[#6c6a64]" />
              )}
              <span>전체 카드 선택 ({cards.length}개)</span>
            </button>

            {selectedCardIds.length > 0 && (
              <button
                onClick={handleDeleteSelectedCards}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#c64545] text-white hover:bg-[#a83636] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>선택 카드 삭제 ({selectedCardIds.length})</span>
              </button>
            )}
          </div>

          {/* Group Cards List */}
          <div className="space-y-3">
            {filteredCards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              const totalSize = card.files.reduce((acc, f) => acc + f.size, 0);
              const countdown = getCountdownString(card.uploadedAt, nowTime);

              return (
                <div
                  key={card.id}
                  onClick={() => handleOpenCardModal(card)}
                  className={`bg-[#efe9de] border rounded-2xl p-4 shadow-xs space-y-3 cursor-pointer transition-all hover:border-[#cc785c] ${
                    isSelected ? 'border-[#cc785c] ring-1 ring-[#cc785c]' : 'border-[#e6dfd8]'
                  }`}
                >
                  {/* Card Top Row: Checkbox, Title & Files Count */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        onClick={(e) => handleToggleCardSelect(card.id, e)}
                        className="p-0.5 mt-0.5 rounded-md text-[#6c6a64] hover:text-[#cc785c] cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#cc785c]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-[16px] font-bold text-[#141413] truncate">
                          {card.title}
                        </h3>
                        {card.tag && (
                          <div className="flex items-center gap-1 text-[11px] text-[#cc785c] font-semibold mt-0.5">
                            <Tag className="w-3 h-3" />
                            <span>{card.tag}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-[#6c6a64] shrink-0" />
                  </div>

                  {/* Card Meta Info: File count, Size, Live 48h Countdown */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#e6dfd8]">
                    <span className="text-[#6c6a64] font-medium">
                      📁 파일 {card.files.length}개 ({formatBytes(totalSize)})
                    </span>

                    <span className="flex items-center gap-1 text-[#cc785c] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{countdown}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCards.length === 0 && (
              <div className="p-8 text-center text-[13px] text-[#6c6a64] bg-[#efe9de]/50 rounded-2xl border border-[#e6dfd8]">
                검색된 업로드 카드가 없습니다.
              </div>
            )}
          </div>
        </section>
      )}

      {cards.length === 0 && (
        <div className="p-8 text-center text-[13px] text-[#6c6a64] bg-[#efe9de]/50 rounded-2xl border border-[#e6dfd8]">
          업로드된 카드 파일이 없습니다. 상단에서 파일들을 선택해 업로드해보세요!
        </div>
      )}

      {/* ================= CARD FILE DETAIL MODAL ================= */}
      {activeModalCard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#faf9f5] border border-[#e6dfd8] rounded-3xl p-5 shadow-xl space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#e6dfd8] pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-[17px] font-bold text-[#141413] truncate">
                  {activeModalCard.title}
                </h3>
                {activeModalCard.tag && (
                  <span className="text-[12px] text-[#cc785c] font-semibold">
                    {activeModalCard.tag}
                  </span>
                )}
                <div className="text-[11px] text-[#6c6a64] mt-0.5">
                  ⏱ {getCountdownString(activeModalCard.uploadedAt, nowTime)}
                </div>
              </div>

              <button
                onClick={handleCloseCardModal}
                className="p-1 rounded-lg hover:bg-[#efe9de] text-[#6c6a64] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Top Actions: Download All Card Files */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleDownloadAllInModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold bg-[#cc785c] text-white hover:bg-[#a9583e] transition-colors cursor-pointer active:scale-95"
              >
                <FolderDown className="w-4 h-4" />
                <span>카드 전체 파일 다운로드 ({activeModalCard.files.length}개)</span>
              </button>

              <button
                onClick={handleToggleSelectAllModalFiles}
                className="text-[12px] font-semibold text-[#6c6a64] hover:text-[#141413] cursor-pointer"
              >
                {selectedFileIdsInModal.length === activeModalCard.files.length
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
            </div>

            {/* File Items List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {activeModalCard.files.map((file) => {
                const isSelected = selectedFileIdsInModal.includes(file.id);
                const isImage = file.type.startsWith('image/');

                return (
                  <div
                    key={file.id}
                    className={`bg-white border rounded-xl p-3 shadow-xs flex items-center justify-between gap-2 transition-all ${
                      isSelected ? 'border-[#cc785c] bg-[#efe9de]/50' : 'border-[#e6dfd8]'
                    }`}
                  >
                    {/* Select Checkbox */}
                    <div
                      onClick={() => handleToggleModalFileSelect(file.id)}
                      className="p-1 text-[#6c6a64] hover:text-[#cc785c] cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#cc785c]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </div>

                    {/* Thumbnail / Icon */}
                    <div className="w-9 h-9 rounded-lg bg-[#efe9de] border border-[#e6dfd8] flex items-center justify-center shrink-0 overflow-hidden">
                      {isImage && file.dataUrl ? (
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isImage ? (
                        <ImageIcon className="w-4 h-4 text-[#cc785c]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#6c6a64]" />
                      )}
                    </div>

                    {/* File Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#141413] truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-[#6c6a64]">
                        {formatBytes(file.size)}
                      </div>
                    </div>

                    {/* Individual Download Button */}
                    <button
                      onClick={() => triggerDownloadFile(file)}
                      className="p-2 rounded-lg bg-[#efe9de] hover:bg-[#e8e0d2] text-[#cc785c] transition-colors cursor-pointer shrink-0"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Batch Actions for Selected Files */}
            {selectedFileIdsInModal.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#e6dfd8]">
                <button
                  onClick={handleDownloadSelectedInModal}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#efe9de] text-[#141413] hover:bg-[#e8e0d2] border border-[#e6dfd8] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#cc785c]" />
                  <span>선택 파일 다운로드 ({selectedFileIdsInModal.length})</span>
                </button>

                <button
                  onClick={handleDeleteSelectedFilesInModal}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#c64545] text-white hover:bg-[#a83636] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 파일 삭제 ({selectedFileIdsInModal.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
