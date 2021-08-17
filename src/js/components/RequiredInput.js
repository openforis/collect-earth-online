import React, {useState} from "react";

export default function RequiredInput({id, label, maxLength, onChange, value, textarea}) {
    const [touched, setTouched] = useState(false);

    return (
        <>
            {label && (
                <label htmlFor={id}>
                    <span style={{color: "red"}}>*</span>
                    {label}
                </label>
            )}
            {textarea ? (
                <textarea
                    className="form-control"
                    id={id}
                    maxLength={maxLength}
                    onBlur={() => setTouched(true)}
                    onChange={onChange}
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
                    required
                    style={touched && value.length === 0 ? {borderColor: "red"} : {}}
                    type="text"
                    value={value}
                />
            )}
            {touched && value.length === 0 && (
                <div className="invalid-feedback" style={{display: "block"}}>
                    {`${label} is required.`}
                </div>
            )}
        </>
    );
}
