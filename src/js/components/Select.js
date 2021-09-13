import React from "react";

import {isString} from "../utils/generalUtils";

function Option({option}) {
    const [value, label] = isString(option, "String")
        ? [option, option] : Array.isArray(option)
            ? [option[0], option[1]] : [option.value, option.label];
    return (
        <option key={value} value={value}>{label}</option>
    );
}

export function Select({disabled, label, id, onChange, value, options}) {
    return (
        <div className="form-inline">
            <label htmlFor={id}>{label}</label>
            <select
                className="form-control form-control-sm ml-3"
                disabled={disabled}
                id={id}
                onChange={onChange}
                value={value}
            >
                {Array.isArray(options)
                    /* eslint-disable-next-line react/no-array-index-key */
                    ? options.map((o, i) => (<Option key={i} option={o}/>))
                    /* eslint-disable-next-line react/no-array-index-key */
                    : Object.values(options).map((o, i) => (<Option key={i} option={o}/>))}
            </select>
        </div>
    );
}
