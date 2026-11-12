const SETTINGS_KEY = "pergamon-settings";
const PROGRESS_KEY = "pergamon-reading-progress";
const ASSET_CACHE = "pergamon-assets-v1";

const defaults = {
    theme: "dark",
    sort: "asc",
    reader: {
        width: "wide",
        fontSize: "medium",
        fontFamily: "sans",
        textColor: "#202725",
        backgroundColor: "#fffdf8"
    }
};

export function getSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
        return {
            ...defaults,
            ...saved,
            reader: {
                ...defaults.reader,
                ...(saved.reader || {}),
                ...(saved.readerSize ? { width: saved.readerSize } : {}),
                ...(saved.fontSize ? { fontSize: saved.fontSize } : {})
            }
        };
    } catch {
        return { ...defaults, reader: { ...defaults.reader } };
    }
}

export function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getReadingProgress(volumeId) {
    try {
        return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[volumeId] || null;
    } catch {
        return null;
    }
}

export function saveReadingProgress(volumeId, location) {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    progress[volumeId] = location;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function getCachedAssetUrl(url) {
    if (!url) return url;
    const response = await cachedResponse(url);
    return URL.createObjectURL(await response.blob());
}

export async function getCachedAssetBytes(url) {
    return responseBytes(await cachedResponse(url));
}

async function responseBytes(response) {
    return response.arrayBuffer();
}

async function cachedResponse(url) {
    if (!("caches" in window)) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load asset (${response.status})`);
        return response;
    }
    const cache = await caches.open(ASSET_CACHE);
    let response = await cache.match(url);
    if (!response) {
        response = await fetch(url);
        if (!response.ok) throw new Error(`Could not cache asset (${response.status})`);
        await cache.put(url, response.clone());
    }
    return response;
}

export async function getCacheUsage() {
    if (!("caches" in window)) return { bytes: 0, assets: 0 };
    const cache = await caches.open(ASSET_CACHE);
    const responses = await cache.matchAll();
    let bytes = 0;
    for (const response of responses) bytes += (await response.clone().blob()).size;
    return { bytes, assets: responses.length };
}

export async function clearCache() {
    if ("caches" in window) await caches.delete(ASSET_CACHE);
}

export function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { defaults };
