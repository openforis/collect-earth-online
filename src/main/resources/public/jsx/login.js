import React from "react";
import ReactDOM from "react-dom";

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            password: "",
        };
    }

    getQueryString = (params) => Object.keys(params)
        .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");

    submit = (e) => {
        e.preventDefault();
        const params = {
            email: this.state.email,
            password: this.state.password,
        };
        fetch(this.props.documentRoot + "/login",
              {
                  method: "POST",
                  headers: new Headers({
                      "Content-Type": "application/x-www-form-urlencoded",
                  }),
                  body: this.getQueryString(params),
              })
            .then(response => Promise.all([response.ok, response.text()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    const redirectUrl = this.props.returnurl !== "" ? this.props.returnurl : this.props.returnurl + "/home";
                    window.location = this.props.documentRoot + redirectUrl;
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

    setEmail = (e) => this.setState({ email: e.target.value });
    setPassword = (e) => this.setState({ password: e.target.value });

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card">
                    <div className="card-header">Sign into your account</div>
                    <div className="card-body">
                        <form onSubmit={this.submit}>
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input name="email" placeholder="Enter email" type="email" className="form-control" onChange={this.setEmail} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input name="password" placeholder="Password" type="password" className="form-control" onChange={this.setPassword} />
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <a href={this.props.documentRoot + "/password"}>Forgot your password?</a>
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
                                onClick={() => window.location = this.props.documentRoot + "/register"}
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
            documentRoot={args.documentRoot}
            returnurl={args.returnurl}
        />,
        document.getElementById("login")
    );
}
