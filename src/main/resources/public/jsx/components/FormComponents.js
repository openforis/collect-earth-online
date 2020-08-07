import React from "react";
import { UnicodeIcon } from "../utils/textUtils";

export function FormLayout({ title, children }) {
    return (
        <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                <div className="bg-darkgreen mb-3 no-container-margin">
                    <h1>{title}</h1>
                </div>
                {children}
            </div>
        </div>
    );
}

export function SectionBlock({ title, children }) {
    return (
        <div className={title === "Survey Rules Design" ? "row m-1" : "row mb-3"}>
            <div className="col">
                <h2 className="header px-0" style={{ fontSize: "1.25rem", padding: ".75rem" }}>{title}</h2>
                {children}
            </div>
        </div>
    );
}

export class CollapsibleSectionBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showContent: false,
            height: "0px",
            myRef: null,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.height === "auto" && this.state.height !== "auto") {
            setTimeout(() => this.setState({ height: "0px" }), 1);
        }
    }

    setInnerRef = (ref) => this.setState({ myRef: ref });

    toggleOpenClose = () => this.setState({
        showContent: !this.state.showContent,
        height: this.state.height !== "auto" && this.state.showContent ? "0px" : this.state.myRef.scrollHeight,
    });

    updateAfterTransition = () => {
        if (this.state.showContent) {
            this.setState({ height: "auto" });
        }
    };

    render() {
        const { title, children } = this.props;
        return (
            <div>
                <h2
                    className="header px-0"
                    style={{ fontSize: "1.25rem", padding: ".75rem", cursor: "pointer" }}
                    onClick={() => this.toggleOpenClose()}
                >
                    {title}
                    <span
                        style={{
                            transition: "transform 250ms linear 0s",
                            transform: this.state.showContent ? "rotateZ(180deg)" : "rotateZ(0deg)",
                            float: "right",
                            marginRight: "2rem",
                        }}
                    >
                        <UnicodeIcon icon={"downCaret"}/>
                    </span>
                </h2>
                <div
                    ref={this.setInnerRef}
                    onTransitionEnd={() => this.updateAfterTransition()}
                    style={{
                        height: this.state.height,
                        overflow: "hidden",
                        transition: "height 250ms linear 0s",
                    }}
                >
                    {children}
                </div>
            </div>
        );
    }
}

export function StatsCell({ title, children }) {
    return (
        <div className="row mb-2">
            <div className="col-7">
                {title}
            </div>
            <div className="col-2">
                <span className="badge badge-pill bg-lightgreen">{children}</span>
            </div>
        </div>
    );
}

export function StatsRow({ title, plots, analysisTime }) {
    return (
        <div className="StatsRow row mx-1 py-1 border-bottom">
            <div className="col-8">{title}</div>
            <div className="col-2">
                <span className="badge badge-pill bg-lightgreen">{plots} plots </span>
            </div>
            <div className="col-2">
                {analysisTime ?
                    (
                        <span className="badge badge-pill bg-lightgreen">{analysisTime} sec/plot </span>
                    )
                    : ("--")
                }
            </div>
        </div>
    );
}

export class ExpandableImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fullSize: false,
        };
    }

    getImageStyle = () =>
        this.state.fullSize ? {
            border: "1px solid #808080",
            float: "none",
            position: "fixed",
            top: "60px",
            bottom: "0",
            left: "0",
            right: "0",
            margin: "auto",
            overflow: "auto",
            maxWidth: "99%",
            maxHeight: "calc(98% - 60px)",
            width: "auto",
            height: "auto",
        } : {
            border: "1px solid #808080",
            ...this.props.previewStyles,
        };

    getMainDivStyle = () =>
        this.state.fullSize ? {
            cursor: "pointer",
            position: "fixed",
            zIndex: "100",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.1)",
        } : {
            cursor: "pointer",
        };

    render() {
        const { src } = this.props;
        return (
            <div
                className="ExpandableImage"
                onClick={() => this.setState({ fullSize: !this.state.fullSize })}
                style={this.getMainDivStyle()}
            >
                <img
                    src={src}
                    className={this.state.fullSize ? "ExpandableImage__previewImg fullSize" : "ExpandableImage__previewImg"}
                    style={this.getImageStyle()}
                />
            </div>
        );
    }
}

const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const validateRequired = value => value === "" || value === false ? "This field is required." : "";

const validateEmail = value => !emailPattern.test(value) ? "Not a valid email address." : "";

const validatePassword = value => value && value.length < 4 ? "Password must be at least 4 characters." : "";

export class Form extends React.Component {
    constructor(props) {
        super(props);
    }

    onFormSubmit = (e) => {
        e.preventDefault();
        this.props.onSubmit(e);
    }

    render() {
        return (
            <form onSubmit={this.onFormSubmit} noValidate>
                {this.props.children}
            </form>
        );
    }

}

export class DynamicForm extends React.Component {
    constructor(props) {
        super(props);
        const values = {};
        const errors = {};
        this.props.elements.map(element => {
            const { name } = element;
            values[name] = element.type === "checkbox" ? !!element.checked : element.value ? element.value : "";
            errors[name] = "";
        });
        this.state = {
            values,
            errors,
        };
    }

    onInputChange = e => {
        const { name, value } = e.target;
        this.setState({ values: { ...this.state.values, [name]: value }});
    }

    onInputBlur = e => {
        const { name, type, required } = e.target;
        const value = this.state.values[name];
        const error = this.validate(value, type, required);
        this.setState({ errors: { ...this.state.errors, [name]: error }});
    }

    onCheckboxChange = e => {
        const { name } = e.target;
        this.setState({ values: { ...this.state.values, [name]: !this.state.values[name] }});
    }

    validate = (value, type, required) => {
        let error = "";
        if (required) {
            error = validateRequired(value);
        }
        if (error === "") {
            if (type === "email") {
                error = validateEmail(value);
            } else if (type === "password") {
                error = validatePassword(value);
            }
        }
        return error;
    }

    validateAll = () => {
        const errors = {};
        this.props.elements.map(element => {
            const { name, type, required } = element;
            errors[name] = this.validate(this.state.values[name], type, required);
        });
        this.setState({ errors });
        return Object.values(errors).reduce((acc, curr) => acc && curr === "", true);
    }

    onFormSubmit = (e) => {
        e.preventDefault();
        if (this.validateAll()) {
            this.props.onSubmit(this.state.values);
        }
    }

    render() {
        return (
            <form onSubmit={this.onFormSubmit} noValidate>
                {this.props.elements.map(element =>
                    element.type === "checkbox"
                    ?
                        <FormInputCheckbox
                            key={element.id}
                            label={element.label}
                            id={element.id}
                            name={element.name}
                            type={element.type}
                            checked={this.state.values[element.name]}
                            error={this.state.errors[element.name]}
                            onChange={this.onCheckboxChange}
                            required={element.required}
                        />
                    :
                        <FormInput
                            key={element.id}
                            label={element.label}
                            id={element.id}
                            name={element.name}
                            type={element.type}
                            placeholder={element.placeholder}
                            autoComplete={element.autoComplete}
                            value={this.state.values[element.name]}
                            error={this.state.errors[element.name]}
                            onChange={this.onInputChange}
                            onBlur={this.onInputBlur}
                            required={element.required}
                        />
                )}
                {this.props.children}
            </form>
        );
    }

}

export class FormInputCheckbox extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { label, id, name, type, checked } = this.props;
        return (
            <div className={"form-group form-check mb-3" + (this.props.error ? "invalid" : "")}>
                <input
                    id={id}
                    name={name}
                    type={type}
                    checked={checked}
                    onChange={this.props.onChange}
                    className="form-check-input"
                />
                <label className="form-check-label" htmlFor={id}>{label}</label>
                {this.props.error &&
                    <div className="validation-error">{this.props.error}</div>
                }
            </div>
        );
    }
}

export class FormInput extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { label, id, name, type, placeholder, value, required, autoComplete } = this.props;
        return (
            <div className={"form-group " + (this.props.error ? "invalid" : "")}>
                <label htmlFor={id}>{label}</label>
                <input
                    id={id}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={this.props.onChange}
                    onBlur={this.props.onBlur}
                    className="form-control"
                    required={required}
                />
                {this.props.error &&
                    <div className="validation-error">{this.props.error}</div>
                }
            </div>
        );
    }
}
