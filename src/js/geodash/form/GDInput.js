import React, {useContext, useEffect} from "react";

import {EditorContext} from "../constants";

export default function GDInput({title, placeholder, dataKey, disabled, defaultText = "", prefixPath = ""}) {
    const {setWidgetDesign, getWidgetDesign} = useContext(EditorContext);
    useEffect(() => setWidgetDesign(dataKey, defaultText, prefixPath), []);

    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <input
                className="form-control"
                disabled={disabled}
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value, prefixPath)}
                placeholder={placeholder}
                type="text"
                value={getWidgetDesign(dataKey, prefixPath) || defaultText}
            />
        </div>
    );
}
