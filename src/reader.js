import {
    clearCache,
    formatBytes,
    getCachedAssetBytes,
    getCacheUsage,
    getCachedAssetUrl,
    getReadingProgress,
    getSettings,
    saveReadingProgress,
    saveSettings
} from "./storage.js";

const fontFamilies = {
    sans: "DM Sans, sans-serif",
    serif: "Georgia, serif",
    mono: "DM Mono, monospace"
};
const fontSizes = { small: "15px", medium: "18px", large: "21px" };
const defaultReader = { fontFamily: "sans", fontSize: "medium", textColor: "#202725", backgroundColor: "#fffdf8", width: "wide" };

function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
}

function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function readerStyle(settings) {
    const reader = { ...defaultReader, ...settings.reader };
    return `--reader-font-family:${fontFamilies[reader.fontFamily] || fontFamilies.sans};--reader-font-size:${fontSizes[reader.fontSize] || fontSizes.medium};--reader-text-color:${safeColor(reader.textColor, defaultReader.textColor)};--reader-background:${safeColor(reader.backgroundColor, defaultReader.backgroundColor)};`;
}

export function openReader(volume) {
    const modalRoot = document.querySelector("#modal-root");
    const settings = getSettings();
    const source = volume.media.pdf || volume.media.epub;
    const type = volume.media.pdf ? "PDF" : "EPUB";
    modalRoot.innerHTML = `
        <section class="reader-modal" role="dialog" aria-modal="true" aria-label="Reader">
            <div class="reader-toolbar">
                <div><p class="eyebrow">Now reading</p><h2>${esc(volume.title)}</h2></div>
                <div class="reader-toolbar-actions">
                    <button class="icon-button" data-reader-settings aria-label="Reader settings">Aa</button>
                    <button class="icon-button" data-site-settings aria-label="Site settings">⚙</button>
                    <button class="icon-button" data-close-reader aria-label="Close reader">×</button>
                </div>
            </div>
            <div class="reader-body reader-${settings.reader.width}" style="${readerStyle(settings)}">
                ${source && type === "PDF"
                    ? `<iframe data-reader-frame title="${esc(volume.title)}"></iframe>`
                    : `<div class="epub-reader" data-epub-reader><div class="reader-placeholder"><span class="book-mark">Aa</span><h3>Loading EPUB…</h3><p>Preparing your reading space.</p></div></div>`}
            </div>
            <div class="reader-footer"><span>${type} · ${esc(volume.novelName)}</span>${source ? `<a href="${source}" download>Download file</a>` : ""}</div>
        </section>`;
    modalRoot.classList.add("is-open");
    const readerModal = modalRoot.querySelector(".reader-modal");
    const readerBody = modalRoot.querySelector(".reader-body");
    let rendition;
    modalRoot.querySelector("[data-close-reader]").addEventListener("click", closeReader);
    modalRoot.querySelector("[data-reader-settings]").addEventListener("click", () => openReaderSettings());
    modalRoot.querySelector("[data-site-settings]").addEventListener("click", () => openSettings(() => {}, readerModal));

    if (type === "PDF" && source) {
        loadCachedSource(source, modalRoot.querySelector("[data-reader-frame]"));
    } else if (type === "EPUB" && source) {
        loadEpub(source, modalRoot.querySelector("[data-epub-reader]")).catch((error) => {
            const reader = modalRoot.querySelector("[data-epub-reader]");
            reader.innerHTML = `<div class="reader-placeholder"><span class="book-mark">!</span><h3>EPUB could not be opened</h3><p>${esc(error.message)}</p><a class="button button-primary" href="${source}" download>Download EPUB</a></div>`;
        });
    }

    async function loadCachedSource(url, element) {
        try {
            element.src = await getCachedAssetUrl(url);
        } catch {
            element.src = url;
        }
    }

    async function loadEpub(url, reader) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip");
        await loadScript("https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js", "ePub");
        if (!window.ePub) throw new Error("The EPUB reader library is unavailable.");
        const sourceBytes = await getCachedAssetBytes(url);
        const book = window.ePub(sourceBytes);
        await withTimeout(book.ready, "The EPUB took too long to load.");
        reader.replaceChildren();
        rendition = book.renderTo(reader, { width: "100%", height: "100%", flow: "scrolled", method: "continuous" });
        const readerSettings = getSettings().reader;
        rendition.themes.default({
            body: {
                color: `${safeColor(readerSettings.textColor, defaultReader.textColor)} !important`,
                "background-color": `${safeColor(readerSettings.backgroundColor, defaultReader.backgroundColor)} !important`,
                "font-family": `${fontFamilies[readerSettings.fontFamily] || fontFamilies.sans} !important`,
                "font-size": `${fontSizes[readerSettings.fontSize] || fontSizes.medium} !important`
            }
        });
        const progress = getReadingProgress(volume._id);
        await withTimeout(progress?.cfi ? rendition.display(progress.cfi) : rendition.display(), "The EPUB could not be rendered.");
        rendition.on("relocated", (location) => {
            const start = location?.start;
            if (start) saveReadingProgress(volume._id, { cfi: start.cfi, href: start.href, percentage: start.percentage });
        });
    }

    function openReaderSettings() {
        const current = getSettings();
        const panel = document.createElement("div");
        panel.className = "settings-layer";
        panel.innerHTML = `<section class="settings-modal reader-settings-panel" role="dialog" aria-label="Reader settings">
            <div class="modal-heading"><div><p class="eyebrow">Reading space</p><h2>Reader settings</h2></div><button class="icon-button" data-close-panel aria-label="Close reader settings">×</button></div>
            <label class="setting-row">Reader width<select data-reader-setting="width"><option value="wide">Wide</option><option value="comfortable">Comfortable</option><option value="narrow">Narrow</option></select></label>
            <label class="setting-row">Font size<select data-reader-setting="fontSize"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
            <label class="setting-row">Font family<select data-reader-setting="fontFamily"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
            <label class="setting-row">Text colour<input type="color" data-reader-setting="textColor"></label>
            <label class="setting-row">Background colour<input type="color" data-reader-setting="backgroundColor"></label>
        </section>`;
        readerModal.append(panel);
        panel.querySelectorAll("[data-reader-setting]").forEach((input) => {
            input.value = current.reader[input.dataset.readerSetting];
            input.addEventListener("change", () => {
                const updated = getSettings();
                updated.reader[input.dataset.readerSetting] = input.value;
                saveSettings(updated);
                readerBody.className = `reader-body reader-${updated.reader.width}`;
                readerBody.setAttribute("style", readerStyle(updated));
                if (rendition) rendition.themes.override("body", {
                    color: `${safeColor(updated.reader.textColor, defaultReader.textColor)} !important`,
                    "background-color": `${safeColor(updated.reader.backgroundColor, defaultReader.backgroundColor)} !important`,
                    "font-family": `${fontFamilies[updated.reader.fontFamily] || fontFamilies.sans} !important`,
                    "font-size": `${fontSizes[updated.reader.fontSize] || fontSizes.medium} !important`
                });
            });
        });
        panel.querySelector("[data-close-panel]").addEventListener("click", () => panel.remove());
    }
    document.addEventListener("keydown", handleEscape);
}

function loadScript(source, globalName) {
    if (window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`${globalName} could not be loaded.`));
        document.head.appendChild(script);
    });
}

function withTimeout(promise, message, timeout = 15000) {
    return Promise.race([promise, new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), timeout))]);
}

function handleEscape(event) {
    if (event.key === "Escape") closeReader();
}

export function closeReader() {
    const modalRoot = document.querySelector("#modal-root");
    modalRoot.classList.remove("is-open");
    modalRoot.innerHTML = "";
    document.removeEventListener("keydown", handleEscape);
}

export async function openSettings(onChange, host = document.querySelector("#modal-root")) {
    const embedded = host.classList.contains("reader-modal");
    const layer = embedded ? document.createElement("div") : host;
    if (embedded) {
        layer.className = "settings-layer";
        host.append(layer);
    } else host.innerHTML = "";
    layer.innerHTML = `<section class="settings-modal" role="dialog" aria-modal="true" aria-label="Site settings">
        <div class="modal-heading"><div><p class="eyebrow">Personalize</p><h2>Site settings</h2></div><button class="icon-button" data-close-settings aria-label="Close settings">×</button></div>
        <label class="setting-row">Appearance<select data-setting="theme"><option value="dark">Dark ink</option><option value="light">Light paper</option></select></label>
        <label class="setting-row">Volume order<select data-setting="sort"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
        <div class="cache-setting"><strong>Local cache</strong><span data-cache-usage>Checking usage…</span><button class="button button-secondary" data-clear-cache>Clear cached reader files</button></div>
    </section>`;
    const settings = getSettings();
    layer.querySelectorAll("[data-setting]").forEach((input) => {
        input.value = settings[input.dataset.setting];
        input.addEventListener("change", () => {
            const updated = { ...getSettings(), [input.dataset.setting]: input.value };
            saveSettings(updated);
            document.documentElement.dataset.theme = updated.theme;
            onChange(updated);
        });
    });
    const usage = layer.querySelector("[data-cache-usage]");
    const refreshUsage = async () => {
        const value = await getCacheUsage();
        usage.textContent = `${formatBytes(value.bytes)} · ${value.assets} file${value.assets === 1 ? "" : "s"}`;
    };
    refreshUsage();
    layer.querySelector("[data-clear-cache]").addEventListener("click", async (event) => {
        event.target.disabled = true;
        await clearCache();
        await refreshUsage();
        event.target.disabled = false;
    });
    layer.querySelector("[data-close-settings]").addEventListener("click", () => embedded ? layer.remove() : closeReader());
}
