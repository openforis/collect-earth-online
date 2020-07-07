import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { getQueryString } from "./utils/textUtils";

class PasswordReset extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            passwordResetKey: "",
            password: "",
            passwordConfirmation: "",
        };
    }

    componentDidMount() {
        this.setState({ email: this.props.email, passwordResetKey: this.props.passwordResetKey });
    }

    resetPassword = () => {
        fetch("/password-reset",
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: getQueryString(this.state),
              })
            .then(response => Promise.all([response.ok, response.text()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("You have successfully reset your password.");
                    window.location = "/login";
                } else {
                    alert(data[1]);
                }
            })
            .catch(message => console.log(message));
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
                                    id="email"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Enter email"
                                    type="email"
                                    value={this.state.email}
                                    onChange={e => this.setState({ email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reset-key">Password reset key</label>
                                <input
                                    id="reset-key"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Enter password reset key"
                                    type="text"
                                    value={this.state.passwordResetKey}
                                    onChange={e => this.setState({ passwordResetKey: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">New password</label>
                                <input
                                    id="password"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Enter new password"
                                    type="password"
                                    value={this.state.password}
                                    onChange={e => this.setState({ password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new-confirm">New password confirmation</label>
                                <input
                                    id="new-confirm"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Enter new password confirmation"
                                    type="password"
                                    value={this.state.passwordConfirmation}
                                    onChange={e => this.setState({ passwordConfirmation: e.target.value })}
                                />
                            </div>
                            <button className="btn bg-lightgreen float-right mb-2" type="submit">
                                Reset Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        );
    }
}

export function renderPasswordResetPage(args) {
    ReactDOM.render(
        <NavigationBar userName={""} userId={-1}>
            <PasswordReset email={args.email} passwordResetKey={args.passwordResetKey} />
        </NavigationBar>,
        document.getElementById("password-reset")
    );
}
