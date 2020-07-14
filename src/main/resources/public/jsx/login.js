import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { getQueryString } from "./utils/textUtils";

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            password: "",
            emailError: "",
            passwordError: "",
        };
    }

    handleEmailValidation = () => {
        let error = "";
        if (this.state.email === "") {
            error = "This field is required.";
        } else {
            const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!emailPattern.test(this.state.email)) {
                error = "Is not a valid email address.";
            }
        }
        this.setState({ emailError: error });
        return error;
    }

    handlePasswordValidation = () => {
        let error = "";
        if (this.state.password === "") {
            error = "This field is required.";
        } else {
            /*
            if (this.state.password.length < 8) {
                error = "Password must be at least 8 characters.";
            }
            */
        }
        this.setState({ passwordError: error });
        return error;
    }

    validate = () => {
        const emailError = this.handleEmailValidation();
        const passwordError = this.handlePasswordValidation();
        return emailError === "" && passwordError === "";
    }

    requestLogin = () => {
        const isValid = this.validate();
        if (isValid) {
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
                            <div className={"form-group " + (this.state.emailError ? "invalid" : "")}>
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    className="form-control"
                                    placeholder="Email"
                                    type="email"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value })}
                                    onBlur={this.handleEmailValidation}
                                />
                                {this.state.emailError &&
                                    <div className="validation-error">{this.state.emailError}</div>
                                }
                            </div>
                            <div className={"form-group " + (this.state.passwordError ? "invalid" : "")}>
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    placeholder="Password"
                                    type="password"
                                    className="form-control"
                                    value={this.state.password}
                                    onChange={e => this.setState({ password: e.target.value })}
                                    onBlur={this.handlePasswordValidation}
                                />
                                {this.state.passwordError &&
                                    <div className="validation-error">{this.state.passwordError}</div>
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
