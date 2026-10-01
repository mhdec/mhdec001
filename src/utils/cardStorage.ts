import { FileGroupCard } from '../types';

const DB_NAME = 'mhdec_file_share_db';
const DB_VERSION = 1;
const STORE_NAME = 'cards_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveCardsToDB(cards: FileGroupCard[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear old entries
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    // Save all cards
    for (const card of cards) {
      store.put(card);
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('IndexedDB save fallback error:', err);
    // Secondary fallback to localStorage without huge dataUrls if needed
    try {
      localStorage.setItem('mhdec_group_cards_meta', JSON.stringify(cards));
    } catch (e) {
      console.error('LocalStorage quota error:', e);
    }
  }
}

export async function loadCardsFromDB(): Promise<FileGroupCard[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const cards: FileGroupCard[] = await new Promise((resolve, reject) => {
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });

    return cards;
  } catch (err) {
    console.warn('IndexedDB load fallback error:', err);
    const local = localStorage.getItem('mhdec_group_cards_meta');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}
