// Offline storage helper using IndexedDB for storing downloaded PDF blobs
const DB_NAME = 'GitaAppPdfDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredPdf(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get stored PDF:', err);
    return null;
  }
}

export async function saveStoredPdf(key: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save PDF in IndexedDB:', err);
  }
}

export async function isPdfCached(key: string): Promise<boolean> {
  const data = await getStoredPdf(key);
  return !!(data && data.byteLength > 500);
}

export async function deleteStoredPdf(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to delete stored PDF:', err);
  }
}

export async function getAllStoredPdfSizes(): Promise<Record<string, number>> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const result: Record<string, number> = {};
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const val = cursor.value;
          if (val && val.key && val.data && val.data.byteLength > 500) {
            result[String(val.key)] = val.data.byteLength;
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => resolve(result);
    });
  } catch (err) {
    console.warn('Failed to list stored PDFs:', err);
    return {};
  }
}

