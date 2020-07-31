import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { DynamicForm } from "./components/FormComponents";
import { getQueryString } from "./utils/textUtils";

class Register extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            formElements: [
                {
                    label: "Email address",
                    id: "register-email",
                    name: "email",
                    type: "email",
                    placeholder: "Email",
                    autoComplete: "off",
                    required: true,
                }, {
                    label: "Password",
                    id: "register-password",
                    name: "password",
                    type: "password",
                    placeholder: "Password",
                    autoComplete: "off",
                    required: true,
                }, {
                    label: "Confirm your password",
                    id: "register-password-confirmation",
                    name: "passwordConfirmation",
                    type: "password",
                    placeholder: "Password",
                    autoComplete: "off",
                    required: true,
                }, {
                    label: "Subscribe To Mailinglist",
                    id: "register-on-mailing-list",
                    name: "onMailingList",
                    type: "checkbox",
                    checked: true,
                },
            ],
            onMailingList: true,
        };
    }

    requestRegister = (values) => {
        values["onMailingList"] = this.state.onMailingList;
        fetch("/register",
              {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: getQueryString(values),
              })
            .then(response => Promise.all([response.ok, response.text()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("You have successfully created an accout.");
                    window.location = "/home";
                } else {
                    alert(data[1]);
                }
            })
            .catch(err => console.log(err));
    };

    render() {
        return (
            <div className="d-flex justify-content-center">
                <div className="card card-lightgreen" id="register-form">
                    <div className="card-header card-header-lightgreen">Register a new account</div>
                    <div className="card-body">
                        <DynamicForm
                            onSubmit={this.requestRegister}
                            elements={this.state.formElements}
                        >
                            <div className="d-flex justify-content-end">
                                <button className="btn bg-lightgreen" type="submit">Register</button>
                            </div>
                        </DynamicForm>
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
