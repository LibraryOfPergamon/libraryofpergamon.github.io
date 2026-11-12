import { loadCatalog, sortVolumes } from "./data.js";
import { getSettings } from "./storage.js";
import { openReader, openSettings } from "./reader.js";

const app = document.querySelector("#app");
let catalog;
let selectedNovel = null;
let searchTerm = "";

const esc = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

function display(value, prefix = "") {
    return value !== undefined && value !== null && value !== "" ? `${prefix}${esc(value)}` : "";
}

function rating(value) {
    return value ? `<span class="rating" aria-label="Rating ${value} out of 10">★ ${esc(value)}/10</span>` : "";
}

function coverArt(volume, className = "volume-cover") {
    return volume.media.cover
        ? `<span class="${className}"><img src="${volume.media.cover}" alt=""></span>`
        : `<span class="${className} generated-cover"><span>${esc(String(volume.volume ?? "—"))}</span><strong>${esc(volume.title)}</strong></span>`;
}

function volumeCard(volume) {
    const available = Boolean(volume.media.epub || volume.media.pdf);
    return `<button class="volume-card" data-read="${esc(volume._id)}">
        ${coverArt(volume)}
        <div class="volume-copy"><p class="eyebrow">${esc(volume.seriesName)}</p><h3>${esc(volume.title)}</h3>
        <div class="meta">${display(volume.year)} ${rating(volume.rating)}</div></div>
        <span class="volume-action">${available ? "Read →" : "Unavailable"}</span>
    </button>`;
}

function renderHeader() {
    document.querySelector("#site-header").innerHTML = `<div class="header-inner">
        <a class="brand" href="#" data-home><img src="./assets/logo/Flag_of_Pergamon.webp" alt=""> <span>Library of Pergamon</span></a>
        <div class="header-actions"><label class="search"><span>⌕</span><input type="search" placeholder="Search library" aria-label="Search library" data-search></label><button class="icon-button" data-settings aria-label="Open settings">⚙</button></div>
    </div>`;
    document.querySelector("[data-search]").addEventListener("input", (event) => {
        searchTerm = event.target.value.trim().toLocaleLowerCase();
        render();
    });
    document.querySelector("[data-settings]").addEventListener("click", () => openSettings(() => render()));
    document.querySelector("[data-home]").addEventListener("click", (event) => {
        event.preventDefault();
        selectedNovel = null;
        searchTerm = "";
        document.querySelector("[data-search]").value = "";
        render();
    });
}

function renderLibrary() {
    if (!catalog) return;
    const grouped = new Map();
    catalog.volumes
        .filter((volume) => [
            volume.seriesName, volume.novelName, volume.title, volume.author,
            ...(Array.isArray(volume.genre) ? volume.genre : [])
        ].some((value) => String(value || "").toLocaleLowerCase().includes(searchTerm)))
        .forEach((volume) => {
            if (!grouped.has(volume.seriesName)) grouped.set(volume.seriesName, new Map());
            const novels = grouped.get(volume.seriesName);
            if (!novels.has(volume.novelName)) novels.set(volume.novelName, []);
            novels.get(volume.novelName).push(volume);
        });
    const content = [...grouped.entries()].map(([seriesName, novels]) => `<section class="series-section">
        <div class="section-heading"><div><p class="eyebrow">Collection</p><h2>${esc(seriesName)}</h2></div><span class="count">${[...novels.values()].reduce((sum, items) => sum + items.length, 0)} volumes</span></div>
        <div class="series-card">${[...novels.entries()].map(([novelName, volumes]) => `<button class="novel-row" data-novel="${esc(novelName)}">
            ${coverArt(volumes[0], "card-art")}<span class="novel-copy"><strong>${esc(novelName)}</strong><span>${volumes.length} ${volumes.length === 1 ? "volume" : "volumes"}</span></span><span class="arrow">→</span>
        </button>`).join("")}</div>
    </section>`).join("");
    app.innerHTML = `<div class="page-shell hero"><p class="eyebrow">Updated 11/12/2026</p><h1>The Eternal<span> Ataraxia.</span></h1><p class="intro">Rake the repositories of antiquity.</p></div>
        <div class="page-shell">${content || `<div class="empty-state"><h2>No books found</h2><p>Try a different title, author, or series.</p></div>`}</div>`;
    app.querySelectorAll("[data-novel]").forEach((button) => button.addEventListener("click", () => {
        selectedNovel = button.dataset.novel;
        render();
    }));
}

function renderNovel() {
    const settings = getSettings();
    const volumes = sortVolumes(catalog.volumes.filter((volume) => volume.novelName === selectedNovel), settings.sort);
    const first = volumes[0];
    app.innerHTML = `<div class="page-shell detail-head"><button class="back-link" data-back>← Back to library</button><p class="eyebrow">${esc(first.seriesName)}</p><h1>${esc(selectedNovel)}</h1><p class="intro">${display(first.author, "By ")} ${display(first.genre?.join(" · "), " · ")}</p></div>
        <div class="page-shell volume-list"><div class="section-heading"><h2>Volumes</h2><span class="count">${volumes.length}</span></div>${volumes.map((volume) => volumeCard(volume)).join("")}</div>`;
    app.querySelector("[data-back]").addEventListener("click", () => { selectedNovel = null; render(); });
    app.querySelectorAll("[data-read]").forEach((button) => button.addEventListener("click", () => {
        openReader(catalog.volumes.find((volume) => volume._id === button.dataset.read));
    }));
}

function render() {
    if (!catalog) return;
    if (selectedNovel) renderNovel(); else renderLibrary();
}

async function start() {
    document.documentElement.dataset.theme = getSettings().theme;
    renderHeader();
    app.innerHTML = `<div class="page-shell loading"><span class="spinner"></span><p>Opening the library…</p></div>`;
    try {
        catalog = await loadCatalog();
        catalog.volumes.forEach((volume, index) => { volume._id = String(index); });
        render();
    } catch (error) {
        app.innerHTML = `<div class="page-shell empty-state"><h2>Library unavailable</h2><p>${esc(error.message)}</p><p>Check that the site is served over HTTP and that the data directories are available.</p></div>`;
    }
}

document.querySelector("#site-footer").innerHTML = `<div class="footer-inner"><span>Library of Pergamon</span><span>Where Satan's throne is</span></div>`;
start();