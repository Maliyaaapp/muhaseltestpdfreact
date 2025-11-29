// localStorageShim.js
(function () {
  if (!window.indexedDB) {
    // Fallback: do nothing if IndexedDB is not available
    return;
  }

  const DB_NAME = 'localStorageShimDB';
  const STORE_NAME = 'keyvalue';
  const DB_VERSION = 1;
  let db;
  let cache = {};
  let ready = false;
  let readyPromise;

  function openDB() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        e.target.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = function (e) {
        db = e.target.result;
        // Load all data into cache
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAllReq = store.getAllKeys();
        getAllReq.onsuccess = function () {
          const keys = getAllReq.result;
          if (!keys.length) {
            ready = true;
            resolve();
            return;
          }
          let count = 0;
          keys.forEach((key) => {
            const getReq = store.get(key);
            getReq.onsuccess = function () {
              cache[key] = getReq.result;
              count++;
              if (count === keys.length) {
                ready = true;
                resolve();
              }
            };
            getReq.onerror = function () {
              count++;
              if (count === keys.length) {
                ready = true;
                resolve();
              }
            };
          });
        };
        getAllReq.onerror = function () {
          ready = true;
          resolve();
        };
      };
      req.onerror = function (e) {
        reject(e);
      };
    });
    return readyPromise;
  }

  function saveToDB(key, value) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (value === null) {
      store.delete(key);
    } else {
      store.put(value, key);
    }
  }

  // The shim object
  const localStorageShim = {
    getItem(key) {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      return cache.hasOwnProperty(key) ? cache[key] : null;
    },
    setItem(key, value) {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      value = String(value);
      cache[key] = value;
      saveToDB(key, value);
    },
    removeItem(key) {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      delete cache[key];
      saveToDB(key, null);
    },
    clear() {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      cache = {};
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    },
    key(n) {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      return Object.keys(cache)[n] || null;
    },
    get length() {
      if (!ready) {
        throw new Error('localStorageShim not ready yet');
      }
      return Object.keys(cache).length;
    }
  };

  // Monkey-patch window.localStorage
  openDB().then(() => {
    try {
      Object.setPrototypeOf(localStorageShim, window.localStorage);
      window.localStorage = localStorageShim;
      window.localStorageShimReady = true;
    } catch (e) {
      // Fallback: do nothing
    }
  });

  // Optionally, expose a ready promise for app startup
  window.localStorageShimReadyPromise = openDB();
})(); 