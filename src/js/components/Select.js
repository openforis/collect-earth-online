import React from "react";

import {isString} from "../utils/generalUtils";

function Option({option, valueKey = "value", labelKey = "label"}) {
    const [value, label] = isString(option, "String")
        ? [option, option]
        : Array.isArray(option)
            ? [option[0], option[1]]
            : [option[valueKey], option[labelKey]];
    return (
        <option key={value} value={value}>{label}</option>
    );
}

export default function Select({
    disabled,
    label,
    id,
    onChange,
    value,
    options,
    valueKey,
    labelKey
}) {
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
                    ? options.map((o, i) =>
                        /* eslint-disable-next-line react/no-array-index-key */
                        <Option key={i} labelKey={labelKey} option={o} valueKey={valueKey}/>)
                    : Object.values(options).map((o, i) =>
                        /* eslint-disable-next-line react/no-array-index-key */
                        <Option key={i} labelKey={labelKey} option={o} valueKey={valueKey}/>)}
            </select>
        </div>
    );
}
