import React, {useState} from "react";

export default function RequiredInput({id, label, maxLength, onChange, value, type, placeholder, required = true}) {
    const [touched, setTouched] = useState(false);
    const error = required && touched && value.length > 0;
    return (
        <div style={{display: "flex", flexDirection: "column", alignItems: "start"}}>
            {label && (
                <label htmlFor={id}>
                    <span style={{color: "red"}}>*</span>
                    {label}
                </label>
            )}
            {type === "textarea" ? (
                <textarea
                    className="form-control"
                    id={id}
                    maxLength={maxLength}
                    onBlur={() => setTouched(true)}
                    onChange={onChange}
                    placeholder={placeholder}
                    required
                    rows="4"
                    value={value}
                />
            ) : (
                <input
                    className="form-control mb-1 mr-sm-2"
                    id={id}
                    maxLength={maxLength}
                    onBlur={() => setTouched(true)}
                    onChange={onChange}
                    placeholder={placeholder}
                    required
                    style={error ? {borderColor: "red"} : {}}
                    type={type || "text"}
                    value={value}
                />
            )}
            {error && (
                <div className="invalid-feedback" style={{display: "block"}}>
                    {`${label || "This field "} is required.`}
                </div>
            )}
        </div>
    );
}
