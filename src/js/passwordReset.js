import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

class PasswordReset extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            passwordResetKey: "",
            password: "",
            passwordConfirmation: ""
        };
    }

    componentDidMount() {
        this.setState({email: this.props.email, passwordResetKey: this.props.passwordResetKey});
    }

    resetPassword = () => {
        fetch("/password-reset",
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify(this.state)
              })
            .then(response => Promise.all([response.ok, response.json()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("You have successfully reset your password.");
                    window.location = "/login";
                } else {
                    alert(data[1]);
                }
            })
            .catch(err => console.log(err));
    };

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card card-lightgreen" id="reset-form">
                    <div className="card-header card-header-lightgreen">Enter your reset info</div>
                    <div className="card-body">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.resetPassword();
                            }}
                        >
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    autoComplete="off"
                                    className="form-control"
                                    id="email"
                                    onChange={e => this.setState({email: e.target.value})}
                                    placeholder="Enter email"
                                    type="email"
                                    value={this.state.email}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reset-key">Password reset key</label>
                                <input
                                    autoComplete="off"
                                    className="form-control"
                                    id="reset-key"
                                    onChange={e => this.setState({passwordResetKey: e.target.value})}
                                    placeholder="Enter password reset key"
                                    type="text"
                                    value={this.state.passwordResetKey}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">New password</label>
                                <input
                                    autoComplete="off"
                                    className="form-control"
                                    id="password"
                                    onChange={e => this.setState({password: e.target.value})}
                                    placeholder="Enter new password"
                                    type="password"
                                    value={this.state.password}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new-confirm">New password confirmation</label>
                                <input
                                    autoComplete="off"
                                    className="form-control"
                                    id="new-confirm"
                                    onChange={e => this.setState({passwordConfirmation: e.target.value})}
                                    placeholder="Enter new password confirmation"
                                    type="password"
                                    value={this.state.passwordConfirmation}
                                />
                            </div>
                            <button className="btn btn-lightgreen float-right mb-2" type="submit">
                                Reset Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={-1}
            userName=""
            version={args.version}
        >
            <PasswordReset
                email={args.email || ""}
                passwordResetKey={args.passwordResetKey || ""}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
