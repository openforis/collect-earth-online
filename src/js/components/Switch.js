import React from "react";

export default function Switch({label, onChange, checked}) {
    return (
        <label className="switch mb-0">
            <input
                checked={checked}
                onChange={onChange}
                type="checkbox"
            />
            <span className="switch-slider"/>
        </label>
    );
}
