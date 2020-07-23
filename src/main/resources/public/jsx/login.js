import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { FormInput } from "./components/FormComponents";
import { getQueryString } from "./utils/textUtils";

const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const validateRequired = value => value === "" ? "This field is required." : "";

const validateEmail = value => !emailPattern.test(value) ? "Not a valid email address." : "";

const validatePassword = value => value && value.length < 4 ? "Password must be at least 4 characters." : "";

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            values: {
                email: "",
                password: "",
            },
            errors: {
                email: "",
                password: "",
            },
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
        const errors = {
            email: this.validate(this.state.values.email, "email", true),
            password: this.validate(this.state.values.password, "password", true),
        };
        this.setState({ errors });
        return errors.email === "" && errors.password === "";
    }

    requestLogin = () => {
        if (this.validateAll()) {
            fetch("/login",
                  {
                      method: "POST",
                      headers: { "Content-Type": "application/x-www-form-urlencoded" },
                      body: getQueryString(this.state),
                  })
                .then(response => Promise.all([response.ok, response.text()]))
                .then(data => {
                    if (data[0] && data[1] === "") {
                        window.location = this.props.returnurl === "" ? "/home" : this.props.returnurl;
                    } else {
                        return Promise.reject(data[1]);
                    }
                })
                .catch(message => {
                    alert(message);
                    console.log(message);
                });
        }
    };

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card card-lightgreen">
                    <div className="card-header card-header-lightgreen">Sign into your account</div>
                    <div className="card-body">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.requestLogin();
                            }}
                            noValidate
                        >
                            <FormInput
                                label={"Email address"}
                                id="login-email"
                                name={"email"}
                                type={"email"}
                                placeholder="Email"
                                value={this.state.values.email}
                                error={this.state.errors.email}
                                onChange={this.onInputChange}
                                onBlur={this.onInputBlur}
                                required
                            />
                            <div className={"form-group " + (this.state.errors.email ? "invalid" : "")}>
                                <label htmlFor="email">Email address</label>
                                <input
                                    name="email"
                                    className="form-control"
                                    placeholder="Email"
                                    type="email"
                                    value={this.state.values.email}
                                    onChange={e => this.setState({ values: { ...this.state.values, [e.target.name]: e.target.value }})}
                                    onBlur={this.onInputBlur}
                                    required
                                />
                                {this.state.errors.email &&
                                    <div className="validation-error">{this.state.errors.email}</div>
                                }
                            </div>
                            <div className={"form-group " + (this.state.errors.password ? "invalid" : "")}>
                                <label htmlFor="password">Password</label>
                                <input
                                    name="password"
                                    placeholder="Password"
                                    type="password"
                                    className="form-control"
                                    value={this.state.values.password}
                                    onChange={e => this.setState({ values: { ...this.state.values, [e.target.name]: e.target.value }})}
                                    onBlur={this.onInputBlur}
                                    required
                                />
                                {this.state.errors.password &&
                                    <div className="validation-error">{this.state.errors.password}</div>
                                }
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <a href={"/password-request"}>Forgot your password?</a>
                                <button className="btn bg-lightgreen" type="submit">Login</button>
                            </div>
                        </form>
                    </div>
                    <div className="card-header-lightgreen card-footer">New to CEO?</div>
                    <div className="card-body">
                        <div className="d-flex justify-content-end">
                            <input
                                className="btn bg-lightgreen"
                                type="button"
                                value="Register"
                                name="register"
                                onClick={() => window.location = "/register"}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export function renderLoginPage(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Login
                returnurl={args.returnurl}
            />
        </NavigationBar>,
        document.getElementById("login")
    );
}
