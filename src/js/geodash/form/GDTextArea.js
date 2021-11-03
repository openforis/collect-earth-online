import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDTextArea({title, placeholder, dataKey}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <textarea
                className="form-control"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value)}
                placeholder={placeholder}
                rows="4"
                style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
                value={widgetDesign[dataKey]}
            />
        </div>
    );
}
