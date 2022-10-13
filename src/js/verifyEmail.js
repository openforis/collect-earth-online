import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";

class VerifyEmail extends React.Component {
  componentDidMount() {
    fetch("/verify-email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: this.props.email,
        passwordResetKey: this.props.passwordResetKey,
      }),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        if (data[0] && data[1] === "") {
          alert("You have successfully verified your email.");
          window.location = "/login";
        } else {
          alert(data[1]);
          window.location = "/password-request";
        }
      })
      .catch((err) => console.log(err));
  }

  render() {
    return (
      <div className="d-flex justify-content-center">
        <div className="card card-lightgreen" id="reset-form">
          <div className="card-header card-header-lightgreen">Email Verification</div>
          <div className="card-body">
            <label>Verifying email...</label>
          </div>
        </div>
      </div>
    );
  }
}

export function pageInit(args) {
  ReactDOM.render(
    <NavigationBar userId={-1} userName="" version={args.version}>
      <VerifyEmail email={args.email || ""} passwordResetKey={args.passwordResetKey || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
