import { JapaneseChar } from '../types';

export const HIRAGANA_DATA: JapaneseChar[] = [
  // あ행
  { char: 'あ', kana: '아', romaji: 'a', type: 'hiragana' },
  { char: 'い', kana: '이', romaji: 'i', type: 'hiragana' },
  { char: 'う', kana: '우', romaji: 'u', type: 'hiragana' },
  { char: 'え', kana: '에', romaji: 'e', type: 'hiragana' },
  { char: 'お', kana: '오', romaji: 'o', type: 'hiragana' },
  // か행
  { char: 'か', kana: '카', romaji: 'ka', type: 'hiragana' },
  { char: 'き', kana: '키', romaji: 'ki', type: 'hiragana' },
  { char: 'く', kana: '쿠', romaji: 'ku', type: 'hiragana' },
  { char: 'け', kana: '케', romaji: 'ke', type: 'hiragana' },
  { char: 'こ', kana: '코', romaji: 'ko', type: 'hiragana' },
  // さ행
  { char: 'さ', kana: '사', romaji: 'sa', type: 'hiragana' },
  { char: 'し', kana: '시', romaji: 'shi', type: 'hiragana' },
  { char: 'す', kana: '스', romaji: 'su', type: 'hiragana' },
  { char: 'せ', kana: '세', romaji: 'se', type: 'hiragana' },
  { char: 'そ', kana: '소', romaji: 'so', type: 'hiragana' },
  // た행
  { char: 'た', kana: '타', romaji: 'ta', type: 'hiragana' },
  { char: 'ち', kana: '치', romaji: 'chi', type: 'hiragana' },
  { char: 'つ', kana: '츠', romaji: 'tsu', type: 'hiragana' },
  { char: 'て', kana: '테', romaji: 'te', type: 'hiragana' },
  { char: 'と', kana: '토', romaji: 'to', type: 'hiragana' },
  // な행
  { char: 'な', kana: '나', romaji: 'na', type: 'hiragana' },
  { char: 'に', kana: '니', romaji: 'ni', type: 'hiragana' },
  { char: 'ぬ', kana: '누', romaji: 'nu', type: 'hiragana' },
  { char: 'ね', kana: '네', romaji: 'ne', type: 'hiragana' },
  { char: 'の', kana: '노', romaji: 'no', type: 'hiragana' },
  // は행
  { char: 'は', kana: '하', romaji: 'ha', type: 'hiragana' },
  { char: 'ひ', kana: '히', romaji: 'hi', type: 'hiragana' },
  { char: 'ふ', kana: '후', romaji: 'fu', type: 'hiragana' },
  { char: 'へ', kana: '헤', romaji: 'he', type: 'hiragana' },
  { char: 'ほ', kana: '호', romaji: 'ho', type: 'hiragana' },
  // ま행
  { char: 'ま', kana: '마', romaji: 'ma', type: 'hiragana' },
  { char: 'み', kana: '미', romaji: 'mi', type: 'hiragana' },
  { char: 'む', kana: '무', romaji: 'mu', type: 'hiragana' },
  { char: 'め', kana: '메', romaji: 'me', type: 'hiragana' },
  { char: 'も', kana: '모', romaji: 'mo', type: 'hiragana' },
  // や행
  { char: 'や', kana: '야', romaji: 'ya', type: 'hiragana' },
  { char: 'ゆ', kana: '유', romaji: 'yu', type: 'hiragana' },
  { char: 'よ', kana: '요', romaji: 'yo', type: 'hiragana' },
  // ら행
  { char: 'ら', kana: '라', romaji: 'ra', type: 'hiragana' },
  { char: 'り', kana: '리', romaji: 'ri', type: 'hiragana' },
  { char: 'る', kana: '루', romaji: 'ru', type: 'hiragana' },
  { char: 'れ', kana: '레', romaji: 're', type: 'hiragana' },
  { char: 'ろ', kana: '로', romaji: 'ro', type: 'hiragana' },
  // わ행 & ん
  { char: 'わ', kana: '와', romaji: 'wa', type: 'hiragana' },
  { char: 'を', kana: '오/을', romaji: 'wo', type: 'hiragana' },
  { char: 'ん', kana: '응(받침)', romaji: 'n', type: 'hiragana' },
];

export const KATAKANA_DATA: JapaneseChar[] = [
  // ア행
  { char: 'ア', kana: '아', romaji: 'a', type: 'katakana' },
  { char: 'イ', kana: '이', romaji: 'i', type: 'katakana' },
  { char: 'ウ', kana: '우', romaji: 'u', type: 'katakana' },
  { char: 'エ', kana: '에', romaji: 'e', type: 'katakana' },
  { char: 'オ', kana: '오', romaji: 'o', type: 'katakana' },
  // カ행
  { char: 'カ', kana: '카', romaji: 'ka', type: 'katakana' },
  { char: 'キ', kana: '키', romaji: 'ki', type: 'katakana' },
  { char: 'ク', kana: '쿠', romaji: 'ku', type: 'katakana' },
  { char: 'ケ', kana: '케', romaji: 'ke', type: 'katakana' },
  { char: 'コ', kana: '코', romaji: 'ko', type: 'katakana' },
  // サ행
  { char: 'サ', kana: '사', romaji: 'sa', type: 'katakana' },
  { char: 'シ', kana: '시', romaji: 'shi', type: 'katakana' },
  { char: 'ス', kana: '스', romaji: 'su', type: 'katakana' },
  { char: 'セ', kana: '세', romaji: 'se', type: 'katakana' },
  { char: 'ソ', kana: '소', romaji: 'so', type: 'katakana' },
  // タ행
  { char: 'タ', kana: '타', romaji: 'ta', type: 'katakana' },
  { char: 'チ', kana: '치', romaji: 'chi', type: 'katakana' },
  { char: 'ツ', kana: '츠', romaji: 'tsu', type: 'katakana' },
  { char: 'テ', kana: '테', romaji: 'te', type: 'katakana' },
  { char: 'ト', kana: '토', romaji: 'to', type: 'katakana' },
  // ナ행
  { char: 'ナ', kana: '나', romaji: 'na', type: 'katakana' },
  { char: 'ニ', kana: '니', romaji: 'ni', type: 'katakana' },
  { char: 'ヌ', kana: '누', romaji: 'nu', type: 'katakana' },
  { char: 'ネ', kana: '네', romaji: 'ne', type: 'katakana' },
  { char: 'ノ', kana: '노', romaji: 'no', type: 'katakana' },
  // ハ행
  { char: 'ハ', kana: '하', romaji: 'ha', type: 'katakana' },
  { char: 'ヒ', kana: '히', romaji: 'hi', type: 'katakana' },
  { char: 'フ', kana: '후', romaji: 'fu', type: 'katakana' },
  { char: 'ヘ', kana: '헤', romaji: 'he', type: 'katakana' },
  { char: 'ホ', kana: '호', romaji: 'ho', type: 'katakana' },
  // マ행
  { char: 'マ', kana: '마', romaji: 'ma', type: 'katakana' },
  { char: 'ミ', kana: '미', romaji: 'mi', type: 'katakana' },
  { char: 'ム', kana: '무', romaji: 'mu', type: 'katakana' },
  { char: 'メ', kana: '메', romaji: 'me', type: 'katakana' },
  { char: 'モ', kana: '모', romaji: 'mo', type: 'katakana' },
  // ヤ행
  { char: 'ヤ', kana: '야', romaji: 'ya', type: 'katakana' },
  { char: 'ユ', kana: '유', romaji: 'yu', type: 'katakana' },
  { char: 'ヨ', kana: '요', romaji: 'yo', type: 'katakana' },
  // ラ행
  { char: 'ラ', kana: '라', romaji: 'ra', type: 'katakana' },
  { char: 'リ', kana: '리', romaji: 'ri', type: 'katakana' },
  { char: 'ル', kana: '루', romaji: 'ru', type: 'katakana' },
  { char: 'レ', kana: '레', romaji: 're', type: 'katakana' },
  { char: 'ロ', kana: '로', romaji: 'ro', type: 'katakana' },
  // ワ행 & ン
  { char: 'ワ', kana: '와', romaji: 'wa', type: 'katakana' },
  { char: 'ヲ', kana: '오/을', romaji: 'wo', type: 'katakana' },
  { char: 'ン', kana: '응(받침)', romaji: 'n', type: 'katakana' },
];
