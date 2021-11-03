import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDCheck({title, dataKey}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    return (
        <div className="form-group">
            <input
                checked={widgetDesign[dataKey]}
                className="form-control form-check-input"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.checked)}
                type="checkbox"
            />
            <label className="form-check-label" htmlFor={dataKey}>{title}</label>
        </div>
    );
}
