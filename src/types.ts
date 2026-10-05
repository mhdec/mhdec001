export type PageType = 'home' | 'bob' | 'news' | 'site' | 'lotto' | 'transfer' | 'memo' | 'zipgaja' | 'igoeitna';

export type ThinkTab = 'memo' | 'japanese';

export interface MemoItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // fallback for local preview
  url?: string;
}

export interface FileGroupCard {
  id: string;
  title: string;
  tag: string;
  uploadedAt: string;
  files: FileItem[];
}

export interface JapaneseChar {
  char: string;
  kana: string; // Reading in Korean
  romaji: string;
  type: 'hiragana' | 'katakana';
}

export type JapaneseMode = 'hiragana' | 'katakana' | 'random';

export type JapaneseStudyTab = 'flashcard' | 'quiz_char_to_kana' | 'quiz_kana_to_char';
