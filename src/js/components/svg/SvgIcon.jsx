import React from "react";
import PropTypes from "prop-types";
import alertIcon from "./alertIcon.svg?react";
import cancelIcon from "./cancelIcon.svg?react";
import centerIcon from "./centerIcon.svg?react";
import checkIcon from "./checkIcon.svg?react";
import closeIcon from "./closeIcon.svg?react";
import collapseIcon from "./collapseIcon.svg?react";
import copyIcon from "./copyIcon.svg?react";
import downCaretIcon from "./downCaretIcon.svg?react";
import downRightArrowIcon from "./downRightArrowIcon.svg?react";
import drawIcon from "./drawIcon.svg?react";
import editIcon from "./editIcon.svg?react";
import expandIcon from "./expandIcon.svg?react";
import fileIcon from "./fileIcon.svg?react";
import helpIcon from "./helpIcon.svg?react";
import infoIcon from "./infoIcon.svg?react";
import leftArrowIcon from "./leftArrowIcon.svg?react";
import leftDoubleIcon from "./leftDoubleIcon.svg?react";
import lineStringIcon from "./lineStringIcon.svg?react";
import linkIcon from "./linkIcon.svg?react";
import minusIcon from "./minus.svg?react";
import overlayIcon from "./overlayIcon.svg?react";
import opacityIcon from "./opacityIcon.svg?react";
import plusIcon from "./plus.svg?react";
import pointIcon from "./pointIcon.svg?react";
import polygonIcon from "./polygonIcon.svg?react";
import questionIcon from "./questionIcon.svg?react";
import refreshIcon from "./refreshIcon.svg?react";
import rightArrowIcon from "./rightArrowIcon.svg?react";
import rightCaretIcon from "./rightCaretIcon.svg?react";
import rightDoubleIcon from "./rightDoubleIcon.svg?react";
import ruleIcon from "./ruleIcon.svg?react";
import saveIcon from "./saveIcon.svg?react";
import settingsIcon from "./settingsIcon.svg?react";
import trashIcon from "./trashIcon.svg?react";
import upArrowIcon from "./upArrowIcon.svg?react";
import upCaretIcon from "./upCaretIcon.svg?react";
import zoomInIcon from "./zoomInIcon.svg?react";

export const iconMap = {
  alert: alertIcon,
  cancel: cancelIcon,
  center: centerIcon,
  check: checkIcon,
  close: closeIcon,
  collapse: collapseIcon,
  copy: copyIcon,
  downCaret: downCaretIcon,
  downRightArrow: downRightArrowIcon,
  draw: drawIcon,
  edit: editIcon,
  expand: expandIcon,
  file: fileIcon,
  help: helpIcon,
  info: infoIcon,
  leftArrow: leftArrowIcon,
  leftDouble: leftDoubleIcon,
  lineString: lineStringIcon,
  link: linkIcon,
  minus: minusIcon,
  opacity: opacityIcon,
  overlay: overlayIcon,
  plus: plusIcon,
  point: pointIcon,
  polygon: polygonIcon,
  question: questionIcon,
  refresh: refreshIcon,
  rightArrow: rightArrowIcon,
  rightCaret: rightCaretIcon,
  rightDouble: rightDoubleIcon,
  rule: ruleIcon,
  save: saveIcon,
  settings: settingsIcon,
  trash: trashIcon,
  upArrow: upArrowIcon,
  upCaret: upCaretIcon,
  zoomIn: zoomInIcon,
};

function SvgIcon({ icon, color, cursor, size, verticalAlign, transform }) {
  const Icon = iconMap[icon];
  return (
    <Icon
      color={color}
      cursor={cursor}
      fill={color}
      height={size}
      style={{ verticalAlign, transform }}
      width={size}
    />
  );
}

SvgIcon.propTypes = {
  color: PropTypes.string,
  cursor: PropTypes.string,
  icon: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  verticalAlign: PropTypes.string,
  transform: PropTypes.string,
};

SvgIcon.defaultProps = {
  color: "currentColor",
  cursor: "unset",
  verticalAlign: "middle",
  transform: "",
};

export default SvgIcon;
