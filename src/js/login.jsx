import { useState } from "react";
import ReactDOM from "react-dom";
import { useSetAtom, useAtomValue } from "jotai";
import { stateAtom } from "./utils/constants";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import Modal from "./components/Modal";

export function Login ({returnurl}) {
  const [loginAtom, setLoginAtom] = useState ({email: "",
                                               password: "",
                                               modal: null});
  const setAppState = useSetAtom (stateAtom);
  const requestLogin = () => {
    fetch("/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginAtom),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then(([ok, error]) => {
        if (ok) {
          window.location = returnurl === "" ? "/home" : returnurl;
        } else {
          setAppState ((s) => ({... s, userEmail: loginAtom.email}));
          setLoginAtom ((s) => ({...s , modal: error?.reason === "password-reset-required"
                                 ? {resetRequest: {message: error.message, email: s.email, sending: false}}
                                 : {alert: {alertType: "Login Error", alertMessage: error?.message}}}));
        }
      })
      .catch((err) => {
        console.log(err);
        setLoginAtom ((s) => ({...s , modal: {alert: {alertType: "Login Error", alertMessage: "Unable to log in. Please try again."}}}));
      });
  };

  const requestPasswordReset = (email) => {
    setLoginAtom ((s) => ({...s, modal: {resetRequest: {...s.modal.resetRequest, sending: true}}}));
    fetch("/password-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({email}),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then(([ok, message]) => {
        setLoginAtom ((s) => ({...s, modal: {alert: ok && message === ""
                                             ? {alertType: "Password Reset Request", alertMessage: `A password reset link has been sent to ${email}.`}
                                             : {alertType: "Password Reset Error", alertMessage: message}}}));
      })
      .catch((err) => {
        console.log(err);
        setLoginAtom ((s) => ({...s, modal: {alert: {alertType: "Password Reset Error", alertMessage: "Unable to send the reset link. Please try again."}}}));
      });
  };

  const closeModal = () => setLoginAtom ((s) => ({...s, modal: null}));

  return (
      <div className="d-flex justify-content-center">
        {loginAtom.modal?.alert &&
         <Modal title={loginAtom.modal.alert.alertType}
                onClose={closeModal}>
           {loginAtom.modal.alert.alertMessage}
         </Modal>}

        {loginAtom.modal?.resetRequest &&
         <Modal title="Password Reset Required"
                closeText="Cancel"
                confirmText="Reset password"
                confirmDisabled={loginAtom.modal.resetRequest.sending}
                onClose={closeModal}
                onConfirm={() => requestPasswordReset(loginAtom.modal.resetRequest.email)}>
           {loginAtom.modal.resetRequest.message}
           <p className="mt-3 mb-0">Email: <strong>{loginAtom.modal.resetRequest.email}</strong></p>
         </Modal>}

        <div className="card card-darkgreen">
          <div className="card-header card-header-lightgreen">Sign into your account</div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestLogin();
              }}
            >
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  className="form-control"
                  id="email"
                  onChange={(e) => {
                    e.persist ();
                    setLoginAtom((s) => ({...s,  email: e.target.value }));
		  }}
                  placeholder="Enter email"
                  type="email"
                  value={loginAtom.email}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  className="form-control"
                  id="password"
                  onChange={(e) =>{
                    e.persist();		    
		    setLoginAtom ((s) => ({...s,  password: e.target.value }));
		  }}
                  placeholder="Password"
                  type="password"
                  value={loginAtom.password}
                />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <a href="/password-request">Forgot your password?</a>
                <button className="btn btn-darkgreen" type="submit">
                  Login
                </button>
              </div>
            </form>
          </div>
          <div className="card-header-lightgreen card-footer">New to CEO?</div>
          <div className="card-body">
            <div className="d-flex justify-content-end">
              <input
                className="btn btn-darkgreen"
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
};



export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "Login",
           id:"login"}]}
      />
      <Login returnurl={params.returnurl || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
