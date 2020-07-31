import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { DynamicForm } from "./components/FormComponents";
import { getQueryString } from "./utils/textUtils";

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            formElements: [
                {
                    label: "Email address",
                    id: "login-email",
                    name: "email",
                    type: "email",
                    placeholder: "Email",
                    required: true,
                }, {
                    label: "Password",
                    id: "login-password",
                    name: "password",
                    type: "password",
                    placeholder: "Password",
                    required: true,
                },
            ],
        };
    }

    requestLogin = (values) => {
        fetch("/login",
              {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: getQueryString(values),
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
                        <DynamicForm
                            onSubmit={this.requestLogin}
                            elements={this.state.formElements}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <a href={"/password-request"}>Forgot your password?</a>
                                <button className="btn bg-lightgreen" type="submit">Login</button>
                            </div>
                        </DynamicForm>
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
