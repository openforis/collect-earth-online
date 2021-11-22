/**
 * Preferences stored in localStorage.
 */

const ceo = "ceo:";
const project = "project:";

const defaultPreferences = {inReviewMode: null};

export function getPreference(key) {
    return window.localStorage.getItem(ceo + key);
}

export function setPreference(key, value) {
    return window.localStorage.setItem(ceo + key, value);
}

export function getProjectPreferences(projectId) {
    const storedPreferences = getPreference(project + projectId);
    if (storedPreferences) {
        return JSON.parse(storedPreferences);
    } else {
        return defaultPreferences;
    }
}

export function setProjectPreferences(projectId, newPreferences) {
    const preferences = getProjectPreferences(projectId);
    setPreference(project + projectId, JSON.stringify({...preferences, ...newPreferences}));
}
