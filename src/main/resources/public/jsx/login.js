import React from "react";
import ReactDOM from "react-dom";
import { GetQueryString } from "./utils/textUtils";

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            password: "",
        };
    }

    requestLogin = (e) => {
        e.preventDefault();
        const params = {
            email: this.state.email,
            password: this.state.password,
        };
        fetch("/login",
              {
                  method: "POST",
                  headers: new Headers({
                      "Content-Type": "application/x-www-form-urlencoded",
                  }),
                  body: GetQueryString(params),
              })
            .then(response => Promise.all([response.ok, response.text()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    window.location = this.props.returnurl === "" ? "/home" : this.props.returnurl;
                    return Promise.resolve();
                } else {
                    return Promise.reject(data[1]);
                }
            })
            .catch(message => {
                alert(message);
                console.log(message);
            });
    };

    setEmail = (newEmail) => this.setState({ email: newEmail });

    setPassword = (newPassword) => this.setState({ password: newPassword });

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card">
                    <div className="card-header">Sign into your account</div>
                    <div className="card-body">
                        <form onSubmit={this.requestLogin}>
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input name="email" placeholder="Enter email" type="email" className="form-control" onChange={(e) => this.setEmail(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input name="password" placeholder="Password" type="password" className="form-control" onChange={(e) => this.setPassword(e.target.value)} />
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <a href={"/password"}>Forgot your password?</a>
                                <button className="btn bg-lightgreen" type="submit">Login</button>
                            </div>
                        </form>
                    </div>
                    <div className="card-header card-footer">New to CEO?</div>
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
        <Login
            returnurl={args.returnurl}
        />,
        document.getElementById("login")
    );
}
