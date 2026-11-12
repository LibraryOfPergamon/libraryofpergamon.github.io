const KEY = "pergamon-settings";

const defaults = {
    theme: "dark",
    sort: "asc",
    readerSize: "wide",
    fontSize: "medium"
};

export function getSettings() {
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
        return { ...defaults };
    }
}

export function saveSettings(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
}

export { defaults };
