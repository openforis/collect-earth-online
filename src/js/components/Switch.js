import React from "react";

export default function Switch({id, onChange, checked}) {
    return (
        <label className="switch mb-0">
            <input
                checked={checked}
                id={id}
                onChange={onChange}
                type="checkbox"
            />
            <span className="switch-slider"/>
        </label>
    );
}
