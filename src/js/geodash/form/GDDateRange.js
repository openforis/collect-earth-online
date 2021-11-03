import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDDateRange({title, optional, keyModifier = ""}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    return (
        <div className="form-group">
            <label>{`${title || "Select the Date Range you would like"}${optional ? " (optional)" : ""}`}</label>
            <div className="input-group" id={"range-group" + keyModifier}>
                <input
                    className="form-control"
                    id={"startDate" + keyModifier}
                    onChange={e => setWidgetDesign("startDate" + keyModifier, e.target ? e.target.value : "")}
                    type="date"
                    value={widgetDesign["startDate" + keyModifier]}
                />
                <div className="mx-2">to</div>
                <input
                    className="form-control"
                    id={"endDate" + keyModifier}
                    onChange={e => setWidgetDesign("endDate" + keyModifier, e.target ? e.target.value : "")}
                    type="date"
                    value={widgetDesign["endDate" + keyModifier]}
                />
            </div>
        </div>
    );
}
