import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      passwordConfirmation: "",
      acceptTOS: false,
      acceptDataTOS: false,
      modal: null,
      userId: null
    };
  }
  fetchUserIfExists = () => {
    console.log(this.state.email);
    this.setState ({userId: 1});
  };
  register = () => {
    if (!this.state.acceptTOS || !this.state.acceptDataTOS) {
      this.setState({modal: {alert: {alertType: "Registration Alert",
                                     alertMessage: "You must accept both terms of service to continue."}}});
    } else {
      fetch("/register", {
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
            this.setState({modal: {alert: {alertType: "Registration Alert",
                                           alertMessage: "You have successfully created an account.  Please check your email for a link to verify your account."}}});           
            window.location = "/home";
          } else {
            this.setState({modal: {alert: {alertType: "Registration Alert",
                                           alertMessage: data[1]}}});
          }
        })
        .catch((err) => console.log(err));
    }
  };

  render() {
    return (
      <div className="d-flex justify-content-center">
        {this.state.modal?.alert
         && (<Modal title={this.state.modal?.alert?.alertType}
                    onClose={()=>{this.setState({modal: null});}}>
               {this.state.modal?.alert?.alertMessage}
             </Modal>)}
        <div className="card card-lightgreen" id="register-form">
          <div className="card-header card-header-lightgreen">Register a new account</div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                this.register();
              }}
            >
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  autoComplete="off"
                  className="form-control"
                  id="email"
                  onChange={(e) => this.setState({ email: e.target.value })}
                  onBlur={() => this.fetchUserIfExists()}
                  placeholder="Email"
                  type="email"
                  value={this.state.email}
                />
              </div>
              {this.state.userId === 0 && 
               <React.Fragment>
                 <div className="form-group">
                   <label htmlFor="password">Enter your password</label>
                   <input
                     autoComplete="off"
                     className="form-control"
                     id="password"
                     onChange={(e) => this.setState({ password: e.target.value })}
                     placeholder="Password"
                     type="password"
                     value={this.state.password}
                   />
                 </div>
                 
                 <div className="form-group">
                   <label htmlFor="password-confirmation">Confirm your password</label>
                   <input
                     autoComplete="off"
                     className="form-control"
                     id="password-confirmation"
                     onChange={(e) => this.setState({ passwordConfirmation: e.target.value })}
                     placeholder="Password confirmation"
                     type="password"
                     value={this.state.passwordConfirmation}
                   />
                 </div>
                 <div className="form-check">
                   <input
                     checked={this.state.acceptTOS}
                     className="form-check-input"
                     id="tos-check"
                     onChange={() => this.setState({ acceptTOS: !this.state.acceptTOS })}
                     type="checkbox"
                   />
                   <label className="form-check-label" htmlFor="tos-check">
                     I agree to the{" "}
                     <a href="/terms-of-service" target="_blank">
                       Terms of Service
                     </a>
                     .
                   </label>
                 </div>
                 <div className="form-check mb-3">
                   <input
                     checked={this.state.acceptDataTOS}
                     className="form-check-input"
                     id="data-tos-check"
                     onChange={() => this.setState({ acceptDataTOS: !this.state.acceptDataTOS })}
                     type="checkbox"
                   />
                 </div>
               </React.Fragment>}
              
              <button className="btn btn-lightgreen float-right mb-2"
                       type="submit"
                       disabled={!this.state.userId}>
                 { this.state.userId && this.state.userId > 0 ? "Resend Validation Email" : "Register"}
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
      <Register />
    </NavigationBar>,
    document.getElementById("app")
  );
}
