import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import Modal from "./components/Modal";

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      passwordConfirmation: "",
      acceptTOS: false,
      modal: null,
      userId: null
    };
  }

  fetchUserIfExists = () => {    
    fetch(`/check-email-taken?email=${this.state.email}`)
      .then((response) => Promise.all([response.ok, response.text()]))
      .then(([response, data]) => {        
	this.setState ({userId: data === "true"});
      });    
  };

  resendValidationEmail = () => {  
    fetch (`/resend-validation-email?email=${this.state.email}`, {
      method: "POST"
    })
      .then((response) => Promise.all([response.ok, response.text()]))
      .then ((response) => {
	this.setState ({modal: {alert: {alertType: "Resend Validation Alert",
                                         alertMessage: response[1]}}});
      });
  };


  register = () => {
    if (!this.state.acceptTOS) {
      this.setState({modal: {alert: {alertType: "Registration Alert",
                                     alertMessage: "You must accept the terms of service to continue."}}});
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
                                           onClose: ()=>{window.location = "/home";},
                                           alertMessage: "You have successfully created an account.  Please check your email for a link to verify your account."}}});            
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
                    onClose={()=>{this.setState({modal: null});                                  
                                  this.state.modal.alert.onClose();}}>
               {this.state.modal?.alert?.alertMessage}
             </Modal>)}
        <div className="card card-lightgreen" id="register-form">
          <div className="card-header card-header-lightgreen">Register a new account</div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                this.state.userId ? this.resendValidationEmail () : this.register() ;
              }}
            >
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  autoComplete="off"
                  className="form-control"
                  id="email"
                  onChange={(e) => this.setState({ email: e.target.value ,
                                                   userId: null})}
                  onBlur={() => this.fetchUserIfExists()}
                  placeholder="Email"
                  type="email"
                  value={this.state.email}
                />
              </div>
              {this.state.userId === false && 
               <>
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
                 
               </>}
              
              <button className="btn btn-lightgreen float-right mb-2"
                       type="submit"
                       disabled={this.state.userId === null}>
                 { this.state.userId ? "Resend Validation Email" : "Register"}
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
      <BreadCrumbs
        crumbs={[
          {display: "Registration",
           id: "registration"}]}
      />
      <Register />
    </NavigationBar>,
    document.getElementById("app")
  );
}
