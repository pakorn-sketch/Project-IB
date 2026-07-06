const API_URL =
"https://script.google.com/macros/s/AKfycbxdDKtMwUW0P7PaqPhSjByvPgdwGfCJKwRsjXk8d1jsVylDe3ucXhzw1aQGAVkVBf2d/exec";

const CACHE_DB_NAME = "ib-pending-cache";
const CACHE_STORE_NAME = "responses";
const CACHE_KEY = "pending-dashboard-data";
const CACHE_STORAGE_KEY = "ibPendingDashboardCache";
const CACHE_VERSION = 3;
const REFRESH_DELAY_MINUTES = 10;
const BACKEND_UPDATE_SCHEDULE = [
    { hour: 9, minute: 0 },
    { hour: 11, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 16, minute: 0 },
    { hour: 17, minute: 20 }
];

let cacheDbPromise = null;
let activeRefreshPromise = null;
let lastDataInfo = null;

async function getData(options = {}) {
    const cached = await readCache();
    const now = new Date();

    if (!options.forceRefresh && cached) {
        const isFresh = cached.expiresAt > now.getTime();

        lastDataInfo = buildCacheInfo(cached, isFresh ? "cache" : "stale-cache");

        if (!isFresh) {
            refreshDataInBackground();
        }

        return cached.data;
    }

    if (!options.forceRefresh && activeRefreshPromise) {
        return activeRefreshPromise;
    }

    const data = await refreshDataFromNetwork(options.forceRefresh);

    return data;
}

function getLastDataInfo() {
    return lastDataInfo;
}

function getNextDataRefreshTime(fromDate = new Date()) {
    return getNextScheduledRefresh(fromDate);
}

function refreshDataInBackground() {
    if (activeRefreshPromise) return activeRefreshPromise;

    activeRefreshPromise = refreshDataFromNetwork(true)
        .then(data => {
            window.dispatchEvent(new CustomEvent("ib-cache-updated", {
                detail: {
                    data,
                    info: lastDataInfo
                }
            }));

            return data;
        })
        .catch(error => {
            console.error("Background refresh failed", error);
            return null;
        })
        .finally(() => {
            activeRefreshPromise = null;
        });

    return activeRefreshPromise;
}

async function refreshDataFromNetwork(forceRefresh = false) {
    if (activeRefreshPromise) {
        return activeRefreshPromise;
    }

    activeRefreshPromise = fetchNetworkData(forceRefresh)
        .then(async data => {
            const cached = await writeCache(data);
            lastDataInfo = buildCacheInfo(cached, "network");

            return data;
        })
        .finally(() => {
            activeRefreshPromise = null;
        });

    return activeRefreshPromise;
}

async function fetchNetworkData(forceRefresh = false) {
    const url = new URL(API_URL);

    url.searchParams.set("action", "data");

    if (forceRefresh) {
        url.searchParams.set("_refresh", Date.now());
    }

    const response = await fetch(url.toString(), {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Data refresh failed: ${response.status}`);
    }

    const responseText = await response.text();
    let payload = null;

    try {
        payload = JSON.parse(responseText);
    } catch (error) {
        throw new Error(`API returned non-JSON data: ${responseText.slice(0, 120)}`);
    }

    return normalizeApiResponse(payload);
}

function normalizeApiResponse(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && payload.success === true && Array.isArray(payload.data)) {
        return payload.data;
    }

    if (payload && payload.success === false) {
        throw new Error(payload.message || "API access denied");
    }

    throw new Error("API returned an invalid data format");
}

async function writeCache(data) {
    const now = Date.now();
    const expiresAt = getNextScheduledRefresh(new Date(now)).getTime();
    const cached = {
        key: getCacheKey(),
        version: CACHE_VERSION,
        data,
        savedAt: now,
        expiresAt
    };

    await setCacheRecord(cached);

    return cached;
}

async function readCache() {
    const cached = await getCacheRecord();

    if (!cached || cached.version !== CACHE_VERSION || !Array.isArray(cached.data)) {
        return null;
    }

    return cached;
}

function buildCacheInfo(cached, source) {
    return {
        source,
        savedAt: cached.savedAt,
        expiresAt: cached.expiresAt,
        nextRefreshAt: getNextScheduledRefresh().getTime()
    };
}

function getNextScheduledRefresh(fromDate = new Date()) {
    const todaySchedule = BACKEND_UPDATE_SCHEDULE.map(time =>
        addMinutes(buildDate(fromDate, time.hour, time.minute), REFRESH_DELAY_MINUTES)
    );
    const nextToday = todaySchedule.find(time => time.getTime() > fromDate.getTime());

    if (nextToday) {
        return nextToday;
    }

    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return addMinutes(
        buildDate(tomorrow, BACKEND_UPDATE_SCHEDULE[0].hour, BACKEND_UPDATE_SCHEDULE[0].minute),
        REFRESH_DELAY_MINUTES
    );
}

function buildDate(baseDate, hour, minute) {
    const date = new Date(baseDate);

    date.setHours(hour, minute, 0, 0);

    return date;
}

function addMinutes(date, minutes) {
    const nextDate = new Date(date);

    nextDate.setMinutes(nextDate.getMinutes() + minutes);

    return nextDate;
}

async function openCacheDb() {
    if (cacheDbPromise) return cacheDbPromise;

    cacheDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, 1);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return cacheDbPromise;
}

async function getCacheRecord() {
    try {
        const db = await openCacheDb();

        return runCacheTransaction(db, "readonly", store => store.get(getCacheKey()));
    } catch (error) {
        console.warn("Cache read skipped", error);
        return getLocalStorageCache();
    }
}

async function setCacheRecord(record) {
    try {
        const db = await openCacheDb();

        await runCacheTransaction(db, "readwrite", store => store.put(record));
    } catch (error) {
        console.warn("Cache write skipped", error);
        setLocalStorageCache(record);
    }
}

function getCacheKey() {
    return CACHE_KEY;
}

function getLocalStorageCache() {
    try {
        const rawCache = localStorage.getItem(getLocalStorageCacheKey());

        return rawCache ? JSON.parse(rawCache) : null;
    } catch (error) {
        console.warn("Fallback cache read skipped", error);
        return null;
    }
}

function setLocalStorageCache(record) {
    try {
        localStorage.setItem(getLocalStorageCacheKey(), JSON.stringify(record));
    } catch (error) {
        console.warn("Fallback cache write skipped", error);
    }
}

function getLocalStorageCacheKey() {
    return CACHE_STORAGE_KEY;
}

function runCacheTransaction(db, mode, action) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE_NAME, mode);
        const store = transaction.objectStore(CACHE_STORE_NAME);
        const request = action(store);
        let result = null;

        request.onsuccess = () => {
            result = request.result;
        };

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
    });
}
