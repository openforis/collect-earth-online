import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import Modal from "./components/Modal";

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      modal: null,
    };
  }

  requestLogin = () => {
    fetch("/login", {
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
          window.location = this.props.returnurl === "" ? "/home" : this.props.returnurl;
        } else {
          this.setState ({modal: {alert: {alertType: "Login Error", alertMessage: data[1]}}});
        }
      })
      .catch((err) => console.log(err));
  };

  render() {
    return (
      <div className="d-flex justify-content-center">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

        <div className="card card-lightgreen">
          <div className="card-header card-header-lightgreen">Sign into your account</div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                this.requestLogin();
              }}
            >
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  className="form-control"
                  id="email"
                  onChange={(e) => this.setState({ email: e.target.value })}
                  placeholder="Enter email"
                  type="email"
                  value={this.state.email}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  className="form-control"
                  id="password"
                  onChange={(e) => this.setState({ password: e.target.value })}
                  placeholder="Password"
                  type="password"
                  value={this.state.password}
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <a href="/password-request">Forgot your password?</a>
                <button className="btn btn-lightgreen" type="submit">
                  Login
                </button>
              </div>
            </form>
          </div>
          <div className="card-header-lightgreen card-footer">New to CEO?</div>
          <div className="card-body">
            <div className="d-flex justify-content-end">
              <input
                className="btn btn-lightgreen"
                name="register"
                onClick={() => window.location.assign("/register")}
                type="button"
                value="Register"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumb={{display: "Login",
                id:"login",
                onClick:()=>{}}}
      />
      <Login returnurl={params.returnurl || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
