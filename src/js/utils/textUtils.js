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

export function formatNumberWithCommas (number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function isNumber(value) {
    return typeof value === "number" && isFinite(value);
}
