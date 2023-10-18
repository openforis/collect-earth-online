import React from "react";
import PropTypes from "prop-types";
import { ReactComponent as alertIcon } from "./alertIcon.svg";
import { ReactComponent as cancelIcon } from "./cancelIcon.svg";
import { ReactComponent as centerIcon } from "./centerIcon.svg";
import { ReactComponent as checkIcon } from "./checkIcon.svg";
import { ReactComponent as closeIcon } from "./closeIcon.svg";
import { ReactComponent as collapseIcon } from "./collapseIcon.svg";
import { ReactComponent as copyIcon } from "./copyIcon.svg";
import { ReactComponent as downCaretIcon } from "./downCaretIcon.svg";
import { ReactComponent as downRightArrowIcon } from "./downRightArrowIcon.svg";
import { ReactComponent as drawIcon } from "./drawIcon.svg";
import { ReactComponent as editIcon } from "./editIcon.svg";
import { ReactComponent as expandIcon } from "./expandIcon.svg";
import { ReactComponent as fileIcon } from "./fileIcon.svg";
import { ReactComponent as helpIcon } from "./helpIcon.svg";
import { ReactComponent as infoIcon } from "./infoIcon.svg";
import { ReactComponent as leftArrowIcon } from "./leftArrowIcon.svg";
import { ReactComponent as leftDoubleIcon } from "./leftDoubleIcon.svg";
import { ReactComponent as lineStringIcon } from "./lineStringIcon.svg";
import { ReactComponent as linkIcon } from "./linkIcon.svg";
import { ReactComponent as minusIcon } from "./minus.svg";
import { ReactComponent as overlayIcon } from "./overlayIcon.svg";
import { ReactComponent as opacityIcon } from "./opacityIcon.svg";
import { ReactComponent as plusIcon } from "./plus.svg";
import { ReactComponent as pointIcon } from "./pointIcon.svg";
import { ReactComponent as polygonIcon } from "./polygonIcon.svg";
import { ReactComponent as questionIcon } from "./questionIcon.svg";
import { ReactComponent as refreshIcon } from "./refreshIcon.svg";
import { ReactComponent as rightArrowIcon } from "./rightArrowIcon.svg";
import { ReactComponent as rightCaretIcon } from "./rightCaretIcon.svg";
import { ReactComponent as rightDoubleIcon } from "./rightDoubleIcon.svg";
import { ReactComponent as ruleIcon } from "./ruleIcon.svg";
import { ReactComponent as saveIcon } from "./saveIcon.svg";
import { ReactComponent as settingsIcon } from "./settingsIcon.svg";
import { ReactComponent as trashIcon } from "./trashIcon.svg";
import { ReactComponent as upArrowIcon } from "./upArrowIcon.svg";
import { ReactComponent as upCaretIcon } from "./upCaretIcon.svg";
import { ReactComponent as zoomInIcon } from "./zoomInIcon.svg";

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

function SvgIcon({ icon, color, cursor, size, verticalAlign }) {
  const Icon = iconMap[icon];
  return (
    <Icon
      color={color}
      cursor={cursor}
      fill={color}
      height={size}
      style={{ verticalAlign }}
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
};

SvgIcon.defaultProps = {
  color: "currentColor",
  cursor: "unset",
  verticalAlign: "middle",
};

export default SvgIcon;
