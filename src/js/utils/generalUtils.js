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
    "12": "December"
};

export function formatDateISO(date) {
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();

    return [
        date.getFullYear(),
        (month > 9 ? "" : "0") + month,
        (day > 9 ? "" : "0") + day
    ].join("-");
}

export function readFileAsBase64Url(file, callback) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
}

export function readFileAsArrayBuffer(file, callback) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsArrayBuffer(file);
}

export function KBtoBase64Length(kb) {
    return (kb * 1024 * 4) / 3;
}

export function removeEnumerator(questionText) {
    return questionText.replace(/[\s][(][\d]*[[)]$/, "");
}

export function invertColor(hex) {
    const deHashed = hex.indexOf("#") === 0 ? hex.slice(1) : hex;
    const hexFormatted = deHashed.length === 3
        ? deHashed[0] + deHashed[0] + deHashed[1] + deHashed[1] + deHashed[2] + deHashed[2]
        : deHashed;

    // invert color components
    const r = (255 - parseInt(hexFormatted.slice(0, 2), 16)).toString(16);
    const g = (255 - parseInt(hexFormatted.slice(2, 4), 16)).toString(16);
    const b = (255 - parseInt(hexFormatted.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    const padZero = str => (new Array(2).join("0") + str).slice(-2);
    return "#" + padZero(r) + padZero(g) + padZero(b);
}

export function pluralize(number, single, plural) {
    return (number === 1) ? single : plural;
}

/**
 * Returns text truncated to max value with an ellipses.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 **/
export function truncate(text, max) {
    return text.length > max ? `${text.substring(0, max)}...` : text;
}

export function detectMacOS() {
    const macRegex = /Mac/i;
    return macRegex.test(window.navigator.userAgent);
}

export function asPercentage(part, total) {
    return (part && total)
        ? (100.0 * (part / total)).toFixed(2)
        : "0.00";
}

export function isArguments(val) { return toString.call(val) === "[object Arguments]"; }
export function isArray(val) { return toString.call(val) === "[object Array]"; }
export function isFunction(val) { return toString.call(val) === "[object Function]"; }
export function isString(val) { return toString.call(val) === "[object String]"; }
export function isDate(val) { return toString.call(val) === "[object Date]"; }
export function isRegExp(val) { return toString.call(val) === "[object RegExp]"; }

export function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}
