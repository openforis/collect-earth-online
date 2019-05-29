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

export function UnicodeIcon({ icon, backgroundColor }) {
    return (
        icon === "leftCaret" ? <>&#x25C0;</>
        : icon === "rightCaret" ? <>&#x25B6;</>
        : icon === "upCaret" ? <>&#x25B2;</>
        : icon === "downCaret" ? <>&#x25BC;</>
        : icon === "rightArrow" ? <>&#x27a1;</>
        : icon === "edit" ? <>&#x270D;</>
        : icon === "trash" ? <span style={{ fontWeight: "normal" }}> &#x1F5D1;</span>
        : icon === "noAction" ? <span className="mx-2">&#x20E0;</span>
        : icon === "magnify" ? <>&#x1F50D;</>
        : icon === "info" ? <>&#x24D8;</>
        : icon === "save" ? <>&#x1F4BE;</>
        : icon === "expand" ? <>&#x21F1;</>
        : icon === "collapse" ? <>&#x21F2;</>
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
                &#x2795;
            </span>
        : ""
    );
}
