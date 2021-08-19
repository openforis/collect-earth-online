import React, {useState} from "react";

export default function RequiredInput({id, label, maxLength, onChange, value, type, placeholder}) {
    const [touched, setTouched] = useState(false);

    return (
        <div style={{display: "flex", flexDirection: "column"}}>
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
                    onFocus={() => console.log("focus")}
                    placeholder={placeholder}
                    required
                    style={touched && value.length === 0 ? {borderColor: "red"} : {}}
                    type={type || "text"}
                    value={value}
                />
            )}
            {touched && value.length === 0 && (
                <div className="invalid-feedback" style={{display: "block"}}>
                    {`${label || "This field "} is required.`}
                </div>
            )}
        </div>
    );
}
