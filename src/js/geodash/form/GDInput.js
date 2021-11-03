import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDInput({title, placeholder, dataKey}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <input
                className="form-control"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value)}
                placeholder={placeholder}
                type="text"
                value={widgetDesign[dataKey]}
            />
        </div>
    );
}
