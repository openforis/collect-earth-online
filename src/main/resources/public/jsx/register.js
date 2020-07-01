import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { getQueryString } from "./utils/textUtils";

class Register extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            password: "",
            passwordConfirmation: "",
        };
    }

    register = () => {
        fetch("/register",
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: getQueryString({
                      email: this.state.email,
                      password: this.state.password,
                      passwordConfirmation: this.state.passwordConfirmation,
                  }),
              })
            .then(response => Promise.all([response.ok, response.text()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("You have successfully created an accout.");
                    window.location = "/home";
                } else {
                    return Promise.reject(data[1]);
                }
            })
            .catch(message => {
                alert(message);
                console.log(message);
            });
    };

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card card-lightgreen" id="register-form">
                    <div className="card-header card-header-lightgreen">Register a new account</div>
                    <div className="card-body">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.register();
                            }}
                        >
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    autoComplete="off"
                                    placeholder="Email"
                                    value={this.state.email}
                                    type="email"
                                    className="form-control"
                                    onChange={e => this.setState({ email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Enter your password</label>
                                <input
                                    id="password"
                                    autoComplete="off"
                                    placeholder="Password"
                                    value={this.state.password}
                                    type="password"
                                    className="form-control"
                                    onChange={e => this.setState({ password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password-confirmation">Confirm your password</label>
                                <input
                                    id="password-confirmation"
                                    autoComplete="off"
                                    placeholder="Password confirmation"
                                    value={this.state.passwordConfirmation}
                                    type="password"
                                    className="form-control"
                                    onChange={e => this.setState({ passwordConfirmation: e.target.value })}
                                />
                            </div>
                            <button className="btn bg-lightgreen float-right mb-2" type="submit">
                                Register
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        );
    }
}

export function renderRegisterPage(args) {
    ReactDOM.render(
        <NavigationBar userName={""} userId={-1}>
            <Register />
        </NavigationBar>,
        document.getElementById("register")
    );
}
