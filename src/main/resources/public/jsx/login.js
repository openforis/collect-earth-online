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
        };
    }

    requestLogin = () => {
        fetch("/login",
              {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: getQueryString({
                      email: this.state.email,
                      password: this.state.password,
                  }),
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
                        >
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    placeholder="Enter email"
                                    type="email"
                                    className="form-control"
                                    onChange={e => this.setState({ email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    placeholder="Password"
                                    type="password"
                                    className="form-control"
                                    onChange={e => this.setState({ password: e.target.value })}
                                />
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <a href={"/password"}>Forgot your password?</a>
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
