import React from "react";
import PropTypes from "prop-types";

const EMAIL_REGEX = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

class EmailInput extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            touched: false,
        };
    }

    validate = (email) => {
        if (this.props.validate) {
            return this.props.validate(email);
        } else {
            return email !== "" && EMAIL_REGEX.test(email);
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
                    type="email"
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

EmailInput.propTypes = {
    helpText: PropTypes.string,
    isRequired: PropTypes.bool.isRequired,
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    valid: PropTypes.func.isRequired,
    value: PropTypes.string,
};

EmailInput.defaultProps = {
    className: "",
    invalidText: "Please provide a valid email address.",
    label: "Email address",
    name: "email",
    placeholder: "Email",
};

export default EmailInput;


