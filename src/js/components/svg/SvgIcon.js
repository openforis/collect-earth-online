import React from "react";
import {checkIcon} from "./checkIcon";
import {closeIcon} from "./closeIcon";
import {downArrowIcon} from "./downArrowIcon";
import {drawIcon} from "./drawIcon";
import {editIcon} from "./editIcon";
import {helpIcon} from "./helpIcon";
import {leftArrowIcon} from "./leftArrowIcon";
import {leftDoubleIcon} from "./leftDoubleIcon";
import {lineStringIcon} from "./lineStringIcon";
import {minus} from "./minus";
import {plus} from "./plus";
import {pointIcon} from "./pointIcon";
import {polygonIcon} from "./polygonIcon";
import {questionIcon} from "./questionIcon";
import {rightArrowIcon} from "./rightArrowIcon";
import {rightDoubleIcon} from "./rightDoubleIcon";
import {ruleIcon} from "./ruleIcon";
import {saveIcon} from "./saveIcon";
import {trashIcon} from "./trashIcon";
import {zoomInIcon} from "./zoomInIcon";

const iconMap = {
    "check": checkIcon,
    "close": closeIcon,
    "downArrow": downArrowIcon,
    "draw": drawIcon,
    "edit": editIcon,
    "help": helpIcon,
    "leftArrow": leftArrowIcon,
    "leftDouble": leftDoubleIcon,
    "lineString": lineStringIcon,
    "minus": minus,
    "plus": plus,
    "point": pointIcon,
    "polygon": polygonIcon,
    "question": questionIcon,
    "rightArrow": rightArrowIcon,
    "rightDouble": rightDoubleIcon,
    "rule": ruleIcon,
    "save": saveIcon,
    "trash": trashIcon,
    "zoomIn": zoomInIcon
};

export default function SvgIcon({icon, color, size}) {
    return (
        <div
            style={{
                color: color || "black",
                fill: color || "black",
                height: size,
                maxHeight: size,
                maxWidth: size,
                cursor: "pointer",
                width: size
            }}
        >
            {iconMap[icon]}
        </div>
    );
}

export function ButtonSvgIcon({icon, size}) {
    return (
        <div
            className="svg-icon"
            style={{
                fill: "currentColor",
                height: size,
                maxHeight: size,
                maxWidth: size,
                cursor: "pointer",
                width: size
            }}
        >
            {iconMap[icon]}
        </div>
    );
}
