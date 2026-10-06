function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bloom-gallery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('captures', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function gallery(action, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('captures', action === 'list' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('captures');
    const request = action === 'list' ? store.getAll() : action === 'save' ? store.put(value) : store.delete(value);
    tx.oncomplete = () => { resolve(request.result); db.close(); };
    tx.onerror = () => { reject(tx.error); db.close(); };
  });
}
