import React from "react";
import PropTypes from "prop-types";
import alertIcon from "./alertIcon.svg";
import cancelIcon from "./cancelIcon.svg";
import centerIcon from "./centerIcon.svg";
import checkIcon from "./checkIcon.svg";
import closeIcon from "./closeIcon.svg";
import collapseIcon from "./collapseIcon.svg";
import copyIcon from "./copyIcon.svg";
import downCaretIcon from "./downCaretIcon.svg";
import downRightArrowIcon from "./downRightArrowIcon.svg";
import drawIcon from "./drawIcon.svg";
import editIcon from "./editIcon.svg";
import expandIcon from "./expandIcon.svg";
import fileIcon from "./fileIcon.svg";
import helpIcon from "./helpIcon.svg";
import infoIcon from "./infoIcon.svg";
import leftArrowIcon from "./leftArrowIcon.svg";
import leftDoubleIcon from "./leftDoubleIcon.svg";
import lineStringIcon from "./lineStringIcon.svg";
import linkIcon from "./linkIcon.svg";
import minusIcon from "./minus.svg";
import overlayIcon from "./overlayIcon.svg";
import opacityIcon from "./opacityIcon.svg";
import plusIcon from "./plus.svg";
import pointIcon from "./pointIcon.svg";
import polygonIcon from "./polygonIcon.svg";
import questionIcon from "./questionIcon.svg";
import rightArrowIcon from "./rightArrowIcon.svg";
import rightCaretIcon from "./rightCaretIcon.svg";
import rightDoubleIcon from "./rightDoubleIcon.svg";
import ruleIcon from "./ruleIcon.svg";
import saveIcon from "./saveIcon.svg";
import settingsIcon from "./settingsIcon.svg";
import trashIcon from "./trashIcon.svg";
import upArrowIcon from "./upArrowIcon.svg";
import upCaretIcon from "./upCaretIcon.svg";
import zoomInIcon from "./zoomInIcon.svg";

const iconMap = {
    "alert": alertIcon,
    "cancel": cancelIcon,
    "center": centerIcon,
    "check": checkIcon,
    "close": closeIcon,
    "collapse": collapseIcon,
    "copy": copyIcon,
    "downCaret": downCaretIcon,
    "downRightArrow": downRightArrowIcon,
    "draw": drawIcon,
    "edit": editIcon,
    "expand": expandIcon,
    "file": fileIcon,
    "help": helpIcon,
    "info": infoIcon,
    "leftArrow": leftArrowIcon,
    "leftDouble": leftDoubleIcon,
    "lineString": lineStringIcon,
    "link": linkIcon,
    "minus": minusIcon,
    "opacity": opacityIcon,
    "overlay": overlayIcon,
    "plus": plusIcon,
    "point": pointIcon,
    "polygon": polygonIcon,
    "question": questionIcon,
    "rightArrow": rightArrowIcon,
    "rightCaret": rightCaretIcon,
    "rightDouble": rightDoubleIcon,
    "rule": ruleIcon,
    "save": saveIcon,
    "settings": settingsIcon,
    "trash": trashIcon,
    "upArrow": upArrowIcon,
    "upCaret": upCaretIcon,
    "zoomIn": zoomInIcon
};

function SvgIcon({icon, color, cursor, size, verticalAlign}) {
    const Icon = iconMap[icon];
    return (
        <Icon
            color={color}
            cursor={cursor}
            fill={color}
            height={size}
            style={{verticalAlign}}
            width={size}
        />
    );
}

SvgIcon.propTypes = {
    color: PropTypes.string,
    cursor: PropTypes.string,
    icon: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired,
    verticalAlign: PropTypes.string
};

SvgIcon.defaultProps = {
    color: "currentColor",
    cursor: "unset",
    verticalAlign: "middle"
};

export default SvgIcon;
