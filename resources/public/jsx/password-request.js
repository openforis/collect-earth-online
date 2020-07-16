import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import { getQueryString } from "./utils/textUtils";

class PasswordRequest extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
        };
    }

    requestPassword = () => {
        fetch("/password-request",
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
                    alert("The reset key has been sent to your email.");
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
                <div className="card card-lightgreen" id="request-form">
                    <div className="card-header card-header-lightgreen">Enter your login email</div>
                    <div className="card-body">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.requestPassword();
                            }}
                        >
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Email"
                                    value={this.state.email}
                                    type="email"
                                    onChange={e => this.setState({ email: e.target.value })}
                                />
                            </div>
                            <button className="btn bg-lightgreen float-right mb-2" type="submit">
                                Request Password Reset Key
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
            <PasswordRequest />
        </NavigationBar>,
        document.getElementById("app")
    );
}
