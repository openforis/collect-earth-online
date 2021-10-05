import React from "react";

export default function Switch({id, label, onChange, checked}) {
    return (
        <label className="switch mb-0">
            <input
                id={id}
                checked={checked}
                onChange={onChange}
                type="checkbox"
            />
            <span className="switch-slider"/>
        </label>
    );
}
