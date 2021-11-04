import React, {useContext} from "react";

import {EditorContext} from "../constants";

export default function GDSelect({title, items, dataKey, intKeys = false}) {
    const {setWidgetDesign, widgetDesign} = useContext(EditorContext);
    return (
        <div className="form-group">
            <label htmlFor={dataKey}>{title}</label>
            <select
                className="form-control"
                id={dataKey}
                onChange={e => setWidgetDesign(dataKey, intKeys ? parseInt(e.target.value) : e.target.value)}
                value={widgetDesign[dataKey]}
            >
                <option className="" value="-1">Please select type</option>
                {items.map(i => <option key={i} value={i.replace(/ |-/, "")}>{i}</option>)}
            </select>
        </div>
    );
}
