import React from "react";
import PropTypes from "prop-types";

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

class UrlInput extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            touched: false,
        };
    }

    valid = (url) => this.props.isRequired || url !== "" ? URL_REGEX.test(url) : true;

    render() {
        return (
            <div className={["form-group", this.props.className.split(" ")].join(" ")}>
                <label htmlFor={this.props.name}>{this.props.label}<span style={{color: "red"}} >{this.props.isRequired ? "*" : ""}</span></label>
                <input
                    aria-describedby={this.props.name + "HelpBlock"}
                    className={this.state.touched ? (this.valid(this.props.value) ? "form-control is-valid" : "form-control is-invalid") : "form-control"}
                    id={this.props.name}
                    maxLength={this.props.maxLength}
                    name={this.props.name}
                    onBlur={() => this.setState({touched: true})}
                    onChange={this.props.onChange}
                    placeholder={this.props.placeholder}
                    required={this.props.isRequired}
                    type="url"
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

UrlInput.propTypes = {
    helpUrl: PropTypes.string,
    invalidText: PropTypes.string,
    isRequired: PropTypes.bool.isRequired,
    label: PropTypes.string,
    maxLength: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    valid: PropTypes.func,
    value: PropTypes.string,
};

UrlInput.defaultProps = {
    className: "",
    invalidText: "Invalid URL. Must begin with http:// or https://.",
    isRequired: false,
    maxLength: "400",
    placeholder: "http://example.com",
};

export default UrlInput;
