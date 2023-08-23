import React, { useContext } from "react";
import { get } from "lodash";

import { EditorContext } from "../constants";

export default function GDDateRange({ title, optional, prefixPath = "" }) {
  const { setWidgetDesign, getWidgetDesign } = useContext(EditorContext);
  return (
    <div className="form-group">
      <label>{`${title || "Select the Date Range you would like"}${
        optional ? " (optional)" : ""
      }`}</label>
      <div className="input-group" id="range-group">
        <input
          className="form-control"
          id="startDate"
          onChange={(e) => setWidgetDesign("startDate", get(e, "target.value", ""), prefixPath)}
          type="date"
          value={getWidgetDesign("startDate", prefixPath)}
        />
        <div className="mx-2">to</div>
        <input
          className="form-control"
          id="endDate"
          onChange={(e) => setWidgetDesign("endDate", get(e, "target.value", ""), prefixPath)}
          type="date"
          value={getWidgetDesign("endDate", prefixPath)}
        />
      </div>
    </div>
  );
}
