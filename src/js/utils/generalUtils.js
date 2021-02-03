import React from "react";

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

export function UnicodeIcon({icon, backgroundColor}) {
    return (
        icon === "leftCaret" ? "\u25C0"
        : icon === "rightCaret" ? "\u25B6"
        : icon === "upCaret" ? "\u25B2"
        : icon === "downCaret" ? "\u25BC"
        : icon === "rightArrow" ? "\u27A1"
        : icon === "edit" ? "\u270D"
        : icon === "trash" ? <span style={{fontWeight: "normal"}}>{"\uD83D\uDDD1"}</span>
        : icon === "noAction" ? <span className="ml-2 mr-3">{"\u20E0"}</span>
        : icon === "magnify" ? "\uD83D\uDD0D"
        : icon === "info" ? "\u24D8"
        : icon === "save" ? "\uD83D\uDCBE"
        : icon === "expand" ? "\u21F1"
        : icon === "collapse" ? "\u21F2"
        : icon === "add" ?
            <span
                className="mr-1 px-1"
                style={{
                    backgroundColor: backgroundColor,
                    borderRadius: "2px",
                    color: "white",
                    fontSize: ".7rem",
                    marginTop: "2px",
                }}
            >
                {"\u2795"}
            </span>
        : ""
    );
}

export function getQueryString(params) {
    return Object.keys(params).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
}

export function formatNumberWithCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function isNumber(value) {
    return typeof value === "number" && isFinite(value);
}

export function getLanguage(acceptableLanguages) {
    const locale = navigator.language || navigator.browserLanguage || navigator.systemLanguage || "en";
    const language = locale.includes("-") ? locale.slice(0, 2) : locale;
    return acceptableLanguages.includes(language) ? language : "en";
}

export const monthlyMapping = {
    "1" : "January",
    "2" : "February",
    "3" : "March",
    "4" : "April",
    "5" : "May",
    "6" : "June",
    "7" : "July",
    "8" : "August",
    "9" :  "September",
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09":  "September",
    "10": "October",
    "11": "November",
    "12": "December",
};

export function formatDateISO(date) {
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();

    return [
        date.getFullYear(),
        (month > 9 ? "" : "0") + month,
        (day > 9 ? "" : "0") + day,
    ].join("-");
}

export function encodeFileAsBase64(file, callback) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
}

export function last(array) {
    return array[array.length - 1];
}

export function removeFromSet(set, value) {
    set.delete(value);
    return set;
}

export function safeLength(arr) {
    return (arr || []).length;
}

export function arraysSameElements(array1, array2) {
    return array1.every(e => array2.includes(e)) && array2.every(e => array1.includes(e));
}
