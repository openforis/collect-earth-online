import React, { useContext } from "react";

import { EditorContext } from "../constants";

export default function GDInput({
  title,
  placeholder,
  dataKey,
  disabled,
  prefixPath = "",
  onKeyDown = () => {},
  onBlur = () => {},
}) {
  const { setWidgetDesign, getWidgetDesign } = useContext(EditorContext);
  return (
    <div className="form-group">
      <label htmlFor={dataKey}>{title}</label>
      <input
        disabled={disabled}
        id={dataKey}
        onBlur={onBlur}
        onChange={(e) => setWidgetDesign(dataKey, e.target.value, prefixPath)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        type="text"
        value={getWidgetDesign(dataKey, prefixPath)}
        className="form-control"
        required
      />
    </div>
  );
}
