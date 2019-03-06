export function sortAlphabetically(a, b) {
    return a < b ? -1
            : a > b ? 1
                : 0;
}

export function capitalizeFirst(str) {
    if (typeof str !== "string") {
        return "";
    } else {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
