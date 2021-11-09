import React, {useContext, useEffect} from "react";
import {isString} from "../../utils/generalUtils";

import {EditorContext} from "../constants";

function cleanString(str, lowerCase) {
    const str1 = str.replace(/ |-/, "");
    return lowerCase ? str1.toLowerCase() : str1;
}

export default function GDSelect({title, items, dataKey, defaultSelection = "-1", lowerCase = false}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    useEffect(() => setWidgetDesign(dataKey, defaultSelection), []);

    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <select
                className="form-control"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value)}
                value={widgetDesign[dataKey]}
            >
                {!widgetDesign[dataKey] && <option className="" value="-1">Please select</option>}
                {items && items.map(i => {
                    const {display, id} = isString(i) ? {display: i, id: cleanString(i, lowerCase)} : i;
                    return <option key={id} value={id}>{display}</option>;
                })}
            </select>
        </div>
    );
}
