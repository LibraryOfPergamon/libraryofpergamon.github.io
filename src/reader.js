import { getSettings, saveSettings } from "./storage.js";

function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
}

export function openReader(volume) {
    const modalRoot = document.querySelector("#modal-root");
    const settings = getSettings();
    const source = volume.media.pdf || volume.media.epub;
    const type = volume.media.pdf ? "PDF" : "EPUB";
    modalRoot.innerHTML = `
        <section class="reader-modal" role="dialog" aria-modal="true" aria-label="Reader">
            <div class="reader-toolbar">
                <div>
                    <p class="eyebrow">Now reading</p>
                    <h2>${esc(volume.title)}</h2>
                </div>
                <button class="icon-button" data-close-reader aria-label="Close reader">×</button>
            </div>
            <div class="reader-body reader-${settings.readerSize} reader-font-${settings.fontSize}">
                ${source && type === "PDF"
                    ? `<iframe src="${source}" title="${esc(volume.title)}"></iframe>`
                    : `<div class="epub-reader" data-epub-reader>
                        <div class="reader-placeholder"><span class="book-mark">Aa</span><h3>Loading EPUB…</h3><p>Preparing your reading space.</p></div>
                    </div>`}
            </div>
            <div class="reader-footer">
                <span>${type} · ${volume.novelName}</span>
                ${source ? `<a href="${source}" download>Download file</a>` : ""}
            </div>
        </section>`;
    modalRoot.classList.add("is-open");
    modalRoot.querySelector("[data-close-reader]").addEventListener("click", closeReader);
    if (type === "EPUB" && source) {
        const reader = modalRoot.querySelector("[data-epub-reader]");
        loadEpub(source, reader).catch((error) => {
            reader.innerHTML = `<div class="reader-placeholder"><span class="book-mark">!</span><h3>EPUB could not be opened</h3><p>${esc(error.message)}</p><a class="button button-primary" href="${source}" download>Download EPUB</a></div>`;
        });
    }

    async function loadEpub(source, reader) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip");
        await loadScript("https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js", "ePub");
        if (!window.ePub) throw new Error("The EPUB reader library is unavailable.");
        const book = window.ePub(source);
        await withTimeout(book.ready, "The EPUB took too long to load.");
        reader.replaceChildren();
        const rendition = book.renderTo(reader, {
            width: "100%",
            height: "100%",
            flow: "scrolled",
            manager: "continuous"
        });
        await withTimeout(rendition.display(), "The EPUB could not be rendered.");
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
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                window.setTimeout(() => reject(new Error(message)), timeout);
            })
        ]);
    }
    modalRoot.addEventListener("click", (event) => {
        if (event.target === modalRoot) closeReader();
    }, { once: true });
    document.addEventListener("keydown", handleEscape);
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

export function openSettings(onChange) {
    const modalRoot = document.querySelector("#modal-root");
    const settings = getSettings();
    modalRoot.innerHTML = `
        <section class="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
            <div class="modal-heading"><div><p class="eyebrow">Personalize</p><h2>Settings</h2></div><button class="icon-button" data-close-settings aria-label="Close settings">×</button></div>
            <label class="setting-row">Appearance
                <select data-setting="theme"><option value="dark">Dark ink</option><option value="light">Light paper</option></select>
            </label>
            <label class="setting-row">Volume order
                <select data-setting="sort"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
            </label>
            <label class="setting-row">Reader width
                <select data-setting="readerSize"><option value="wide">Wide</option><option value="comfortable">Comfortable</option><option value="narrow">Narrow</option></select>
            </label>
            <label class="setting-row">Reader text size
                <select data-setting="fontSize"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
            </label>
        </section>`;
    modalRoot.classList.add("is-open");
    modalRoot.querySelectorAll("[data-setting]").forEach((input) => {
        input.value = settings[input.dataset.setting];
        input.addEventListener("change", () => {
            const updated = { ...getSettings(), [input.dataset.setting]: input.value };
            saveSettings(updated);
            document.documentElement.dataset.theme = updated.theme;
            onChange(updated);
        });
    });
    modalRoot.querySelector("[data-close-settings]").addEventListener("click", closeReader);
}
