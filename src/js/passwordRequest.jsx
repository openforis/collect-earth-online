import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";

class PasswordRequest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      modal: null,
    };
  }

  requestPassword = () => {
    fetch("/password-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.state),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        if (data[0] && data[1] === "") {
          this.setState ({modal: {alert: {alertType: "Password Reset Request",
                                          onClose: ()=>{window.location = "/home";},
                                          alertMessage: "The reset key has been sent to your email."}}});          
        } else {
          this.setState ({modal: {alert: {alertType: "Password Reset Error", alertMessage: data[1]}}});
        }
      })
      .catch((err) => console.log(err));
  };

  render() {
    return (
      <div className="d-flex justify-content-center">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});
                              this.state.modal.alert.onClose();}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

        <div className="card card-lightgreen" id="request-form">
          <div className="card-header card-header-lightgreen">Enter your login email</div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                this.requestPassword();
              }}
            >
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  autoComplete="off"
                  className="form-control"
                  id="email"
                  onChange={(e) => this.setState({ email: e.target.value })}
                  placeholder="Email"
                  type="email"
                  value={this.state.email}
                />
              </div>
              <button className="btn btn-lightgreen float-right mb-2" type="submit">
                Request Password Reset Key
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={-1} userName="" version={session.versionDeployed}>
      <PasswordRequest />
    </NavigationBar>,
    document.getElementById("app")
  );
}
