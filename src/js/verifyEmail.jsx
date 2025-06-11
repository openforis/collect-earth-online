import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";

class VerifyEmail extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      modal: null
    };
  }
  
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
          this.setState ({modal: {alert: {alertType: "Verify Email",
                                          onClose: ()=> {window.location = "/login";},
                                          alertMessage: "You have successfully verified your email."}}});
          
        } else {
          this.setState ({modal: {alert: {alertType: "Verify Email",
                                          onClose: ()=>{ window.location = "/password-request";},
                                          alertMessage: data[1]}}});          
        }
      })
      .catch((err) => console.log(err));
  }

  render() {
    return (
      <div className="d-flex justify-content-center">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});
                              this.state.modal.alerts.onClose();}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
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

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={-1} userName="" version={session.versionDeployed}>
      <VerifyEmail email={params.email || ""} passwordResetKey={params.passwordResetKey || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
