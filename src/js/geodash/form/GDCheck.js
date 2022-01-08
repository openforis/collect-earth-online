import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDCheck({title, dataKey, prefixPath = ""}) {
    const {setWidgetDesign, getWidgetDesign} = useContext(EditorContext);

    return (
        <div className="form-group mx-4">
            <input
                checked={getWidgetDesign(dataKey, prefixPath)}
                className="form-check-input"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.checked, prefixPath)}
                type="checkbox"
            />
            <label className="form-check-label" htmlFor={dataKey}>{title}</label>
        </div>
    );
}
