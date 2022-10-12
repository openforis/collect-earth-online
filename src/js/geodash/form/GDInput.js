import React, { useContext } from "react";

import { EditorContext } from "../constants";

export default function GDInput({
  title,
  placeholder,
  dataKey,
  disabled,
  prefixPath = "",
  onKeyPress,
  onBlur,
}) {
  const { setWidgetDesign, getWidgetDesign } = useContext(EditorContext);
  return (
    <div className="form-group">
      <label htmlFor={dataKey}>{title}</label>
      <input
        className="form-control"
        disabled={disabled}
        id={dataKey}
        onChange={(e) => setWidgetDesign(dataKey, e.target.value, prefixPath)}
        placeholder={placeholder}
        type="text"
        value={getWidgetDesign(dataKey, prefixPath)}
        onKeyPress={onKeyPress}
        onBlur={onBlur}
      />
    </div>
  );
}
