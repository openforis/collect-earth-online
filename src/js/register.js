import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import {NavigationBar} from "./components/PageComponents";
import EmailInput from "./components/form/email-input";
import PasswordInput from "./components/form/password-input";
import Checkbox from "./components/form/checkbox";
import {getQueryString} from "./utils/generalUtils";

const EMAIL_REGEX = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

class Register extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
            password: "",
            passwordConfirmation: "",
            acceptTerms: false,
            onMailingList: true,
            disabled: true,
            emailTouched: false,
            passwordTouched: false,
            confirmPasswordTouched: false,
        };
    }

    validEmail = (email) => "" !== email && EMAIL_REGEX.test(email);

    validPassword = (password) => "" !== password && _.trim(password).length >= 8;

    passwordsMatch = () => this.validPassword(this.state.password) &&
                           this.validPassword(this.state.passwordConfirmation) &&
                           this.state.password === this.state.passwordConfirmation;

    valid = () => this.validEmail(this.state.email) && this.passwordsMatch() && this.state.acceptTerms;

    register = () => {
        fetch("/register",
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: getQueryString(this.state),
              })
            .then(response => Promise.all([response.ok, response.json()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("You have successfully created an account.");
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
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.register();
                            }}
                        >
                            <EmailInput
                                onChange={e => this.setState({email: e.target.value})}
                                value={this.state.email}
                            />
                            <PasswordInput
                                label="Enter your password"
                                value={this.state.password}
                                onChange={e => this.setState({password: e.target.value})}
                            />
                            <PasswordInput
                                label="Confirm your password"
                                placeholder="Password confirmation"
                                name="password-confirm"
                                value={this.state.passwordConfirmation}
                                onChange={e => this.setState({passwordConfirmation: e.target.value})}
                                validate={() => this.passwordsMatch()}
                                invalidText="Passwords must match."
                            />
                            <Checkbox
                                className="mb-3"
                                name="mailing-list"
                                label="Subscribe to our mailing list"
                                isSelected={this.state.onMailingList}
                                onCheckboxChange={() => this.setState({onMailingList: !this.state.onMailingList})}
                            />
                            <Checkbox
                                className="mb-3"
                                name="accept-terms"
                                isSelected={this.state.acceptTerms}
                                onCheckboxChange={() => this.setState({acceptTerms: !this.state.acceptTerms})}
                                isRequired
                                helpText="You must agree to the Terms of Service before registering."
                            >
                                I agree to the <a target="_blank" href="/terms">Terms of Service</a>.
                            </Checkbox>
                            <button className="btn btn-lightgreen float-right mb-2" disabled={!this.valid()} type="submit">
                                Register
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
        <NavigationBar userName={""} userId={-1}>
            <Register />
        </NavigationBar>,
        document.getElementById("app")
    );
}
