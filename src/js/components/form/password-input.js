import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";

class PasswordInput extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            touched: false,
        };
    }

    validate = (password) => {
        if (this.props.validate) {
            return this.props.validate(password);
        } else {
            const _password = _.trim(password);
            return _password !== "" && _password.length >= 8 && _password.length < 60;
        }
    };

    render() {
        return (
            <div className={["form-group", this.props.className.split(" ")].join(" ")}>
                <label htmlFor={this.props.name}>{this.props.label}</label>
                <input
                    aria-describedby={this.props.name + "HelpBlock"}
                    className={this.state.touched ? (this.validate(this.props.value) ? "form-control is-valid" : "form-control is-invalid") : "form-control"}
                    id={this.props.name}
                    name={this.props.name}
                    onChange={this.props.onChange}
                    onBlur={() => this.setState({touched: true})}
                    placeholder={this.props.placeholder}
                    required={this.props.isRequired}
                    type="password"
                    value={this.props.value}
                />
                <div className="invalid-feedback">
                    {this.props.invalidText}
                </div>
                <small
                    className="form-text text-muted"
                    id={name + "HelpBlock"}
                >
                    {this.props.helpText}
                </small>
            </div>
        );
    }
}

PasswordInput.propTypes = {
    helpText: PropTypes.string,
    isRequired: PropTypes.bool.isRequired,
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    validate: PropTypes.func,
    value: PropTypes.string,
};

PasswordInput.defaultProps = {
    className: "",
    invalidText: "Password must be at least 8 characters.",
    label: "Password",
    name: "password",
    placeholder: "Password",
};

export default PasswordInput;
