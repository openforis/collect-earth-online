import React, {useContext} from "react";
import {isString} from "../../utils/generalUtils";

import {EditorContext} from "../constants";

function cleanString(str) {
    return str.replace(/ |-/, "");
}

export default function GDSelect({title, items, dataKey, prefixPath = ""}) {
    const {setWidgetDesign, getWidgetDesign} = useContext(EditorContext);
    const val = getWidgetDesign(dataKey, prefixPath);
    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <select
                className="form-control"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, e.target.value, prefixPath)}
                value={val}
            >
                {val === "-1" && <option className="" value="-1">Please select</option>}
                {items && items.map(i => {
                    const {display, id} = isString(i) ? {display: i, id: cleanString(i)} : i;
                    return <option key={id} value={id}>{display}</option>;
                })}
            </select>
        </div>
    );
}
