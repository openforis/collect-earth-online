import React, {useContext, useEffect} from "react";

import {EditorContext} from "../constants";

export default function GDInput({title, placeholder, dataKey, disabled, defaultText}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    // useEffect(() => {
    //     if (defaultText) setWidgetDesign(dataKey, defaultText);
    // });

    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <input
                className="form-control"
                disabled={disabled}
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value)}
                placeholder={placeholder}
                type="text"
                value={defaultText || widgetDesign[dataKey]}
            />
        </div>
    );
}
