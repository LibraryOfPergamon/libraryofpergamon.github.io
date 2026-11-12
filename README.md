# Library of Pergamon

Library of Pergamon is a static, local-first EPUB/PDF library interface. It uses only HTML, CSS, and browser JavaScript.

## Running

Serve the repository over HTTP (for example with any static file server) and open `index.html`. Fetching JSON and opening local media will not work reliably from a `file://` URL.

## Adding a book

1. Add the series metadata JSON to `data/series/`.
2. Add the novel metadata JSON to `data/novels/`.
3. Add a volume JSON and matching `.epub` and/or `.pdf` to a folder under `data/volume/`.

Locally, the browser discovers JSON files by listing the `data/series/`, `data/novels/`, and `data/volume/` directories. On GitHub Pages, it uses the public GitHub Contents API to discover those same direct files; no catalog or index file is required. Media is inferred from each volume JSON basename, so `book.json` automatically picks up `book.epub`, `book.pdf`, and an optional `book.png`, `book.jpg`, or `book.webp`.

The loader matches series and novels by either their identifier or localized display name. Metadata cascades from series to novel to volume, so a blank or omitted field inherits from its parent and blank fields are not rendered.

## Features

- Series and novel grouping with library search.
- Volume ordering and per-volume metadata.
- Full-screen PDF and EPUB reading.
- Persisted theme, sorting, reader width, and text-size preferences.