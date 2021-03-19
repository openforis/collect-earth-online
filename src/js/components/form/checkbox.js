import React from "react";
import PropTypes from "prop-types";

const Checkbox = ({children, className, label, name, isSelected, helpText, onCheckboxChange, isRequired}) => (
    <div className={["form-check", className.split(" ")].join(" ")}>
        <input
            id={name}
            name={name}
            type="checkbox"
            className="form-check-input"
            checked={isSelected}
            onChange={onCheckboxChange}
            required={isRequired}
            aria-describedby={name + "HelpBlock"}
        />
        <label htmlFor={name}>{children ? children : label }</label>
        <small
            id={name + "HelpBlock"}
            className="form-text text-muted"
        >
            {helpText}
        </small>
    </div>
);

Checkbox.propTypes = {
    helpText: PropTypes.string,
    isSelected: PropTypes.bool.isRequired,
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    onCheckboxChange: PropTypes.func.isRequired,
};

Checkbox.defaultProps = {
    className: "",
    isSelected: false,
};

export default Checkbox;
