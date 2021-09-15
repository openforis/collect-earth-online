/**
 * Preferences are stored in localStorage and are per-project.
 */

const ceoProject = "ceo:project:";

const defaultPreferences = {isAdminMode: null};

function getItem(key) {
    return window.localStorage.getItem(key);
}

function setItem(key, value) {
    return window.localStorage.setItem(key, value);
}

export function getPreferences(projectId) {
    const storedPreferences = getItem(ceoProject + projectId);
    if (storedPreferences) {
        return JSON.parse(storedPreferences);
    } else {
        return defaultPreferences;
    }
}

export function setPreferences(projectId, newPreferences) {
    const preferences = getPreferences();
    setItem(ceoProject + projectId, JSON.stringify({...preferences, ...newPreferences}));
}
