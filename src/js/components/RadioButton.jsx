import React from "react";

export default function RadioButton({ id, label, onChange, selected }) {
  return (
    <div>
      <input checked={selected} id={id} onChange={onChange} type="radio" />
      <label className="mb-0 ml-1" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
