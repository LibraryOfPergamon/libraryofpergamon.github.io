const DATA_ROOT = "./data/";

async function fetchJson(path) {
    const response = await fetch(`${DATA_ROOT}${path}`);
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
}

async function listDirectory(path) {
    const response = await fetch(`${DATA_ROOT}${path}`);
    if (!response.ok) throw new Error(`Could not discover ${path} (${response.status})`);
    const html = await response.text();
    const directoryUrl = new URL(response.url);
    const directoryPath = directoryUrl.pathname.endsWith("/") ? directoryUrl.pathname : `${directoryUrl.pathname}/`;
    const links = [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("a")];
    return links.map((link) => {
        const href = link.getAttribute("href") || "";
        const target = new URL(href, response.url);
        if (target.origin !== directoryUrl.origin || !target.pathname.startsWith(directoryPath)) return "";
        const relativePath = target.pathname.slice(directoryPath.length).replace(/\/$/, "");
        return relativePath && !relativePath.includes("/") ? decodeURIComponent(relativePath) : "";
    }).filter(Boolean);
}

async function exists(path) {
    const response = await fetch(`${DATA_ROOT}${path}`, { method: "HEAD" });
    return response.ok;
}

function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

function matches(left, right) {
    return normalize(left) !== "" && normalize(left) === normalize(right);
}

function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
}

function sortVolumes(volumes, direction) {
    return [...volumes].sort((a, b) => {
        const result = Number(a.volume) - Number(b.volume);
        return direction === "desc" ? -result : result;
    });
}

async function discoverMetadata() {
    const generated = await loadGeneratedCatalog();
    if (generated) return generated;
    const [seriesNames, novelNames, volumeFolders] = await Promise.all([
        listDirectory("series/"),
        listDirectory("novels/"),
        listDirectory("volume/")
    ]);
    const seriesPaths = seriesNames.filter((name) => name.endsWith(".json")).map((name) => `series/${name}`);
    const novelPaths = novelNames.filter((name) => name.endsWith(".json")).map((name) => `novels/${name}`);
    const volumePaths = [];
    for (const folder of volumeFolders) {
        const files = await listDirectory(`volume/${folder}/`);
        files.filter((name) => name.endsWith(".json"))
            .forEach((name) => volumePaths.push(`volume/${folder}/${name}`));
    }
    return { seriesPaths, novelPaths, volumePaths };
}

async function loadGeneratedCatalog() {
    const response = await fetch(`${DATA_ROOT}catalog.json`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Could not load generated catalog (${response.status})`);
    const catalog = await response.json();
    return {
        seriesPaths: catalog.series || [],
        novelPaths: catalog.novels || [],
        volumePaths: catalog.volumes || []
    };
}

async function mediaFor(metadataPath) {
    const base = metadataPath.slice(0, -".json".length);
    const [epub, pdf, coverPng, coverJpg, coverWebp] = await Promise.all([
        exists(`${base}.epub`),
        exists(`${base}.pdf`),
        exists(`${base}.png`),
        exists(`${base}.jpg`),
        exists(`${base}.webp`)
    ]);
    return {
        epub: epub ? `${DATA_ROOT}${base}.epub` : "",
        pdf: pdf ? `${DATA_ROOT}${base}.pdf` : "",
        cover: coverPng ? `${DATA_ROOT}${base}.png` : coverJpg ? `${DATA_ROOT}${base}.jpg` : coverWebp ? `${DATA_ROOT}${base}.webp` : ""
    };
}

export async function loadCatalog() {
    const { seriesPaths, novelPaths, volumePaths } = await discoverMetadata();
    const [seriesFiles, novelFiles] = await Promise.all([
        Promise.all(seriesPaths.map(fetchJson)),
        Promise.all(novelPaths.map(async (path) => ({
            ...(await fetchJson(path)),
            cover: await coverFor(path)
        })))
    ]);
    const volumes = await Promise.all(volumePaths.map(async (metadataPath) => {
        const [volume, media] = await Promise.all([fetchJson(metadataPath), mediaFor(metadataPath)]);
        const series = seriesFiles.find((item) =>
            matches(item.series, volume.series) || matches(item.series_localized, volume.series)
        ) || {};
        const novel = novelFiles.find((item) =>
            matches(item.novel, volume.novel) || matches(item.novel_localized, volume.novel)
        ) || {};
        return {
            ...series,
            ...novel,
            ...volume,
            seriesName: firstValue(volume.series_localized, volume.series, novel.series_localized, series.series_localized, "Uncategorized"),
            novelName: firstValue(volume.novel_localized, volume.novel, novel.novel_localized, "Untitled"),
            title: firstValue(volume.title, `Volume ${volume.volume}`),
            genre: firstValue(volume.genre, novel.genre, series.genre, []),
            year: firstValue(volume.year, novel.year, series.year),
            author: firstValue(volume.author, novel.author, series.author),
            rating: firstValue(volume.rating, novel.rating, series.rating),
            media: {
                ...media,
                cover: media.cover || novel.cover || ""
            }
        };
    }));
    return { volumes, series: seriesFiles, novels: novelFiles };
}

async function coverFor(metadataPath) {
    const base = metadataPath.slice(0, -".json".length);
    const [png, jpg] = await Promise.all([
        exists(`${base}.png`),
        exists(`${base}.jpg`)
    ]);
    return png ? `${DATA_ROOT}${base}.png` : jpg ? `${DATA_ROOT}${base}.jpg` : "";
}

export { sortVolumes };
