import { readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataRoot = join(root, "data");

async function jsonFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => relative(dataRoot, join(directory, entry.name)).replaceAll("\\", "/"));
}

const series = await jsonFiles(join(dataRoot, "series"));
const novels = await jsonFiles(join(dataRoot, "novels"));
const volumeRoot = join(dataRoot, "volume");
const volumeFolders = await readdir(volumeRoot, { withFileTypes: true });
const volumes = [];

for (const folder of volumeFolders.filter((entry) => entry.isDirectory())) {
    const files = await jsonFiles(join(volumeRoot, folder.name));
    volumes.push(...files);
}

await writeFile(
    join(dataRoot, "catalog.json"),
    `${JSON.stringify({ series, novels, volumes }, null, 2)}\n`,
    "utf8"
);
