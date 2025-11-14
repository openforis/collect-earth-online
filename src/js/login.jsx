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
      .then((data) => {
        if (data[0] && data[1] === "") {
          window.location = returnurl === "" ? "/home" : returnurl;
        } else {
          setAppState ((s) => ({... s, userEmail: loginAtom.email}));
          setLoginAtom ((s) => ({...s , modal: {alert: {alertType: "Login Error", alertMessage: data[1]}}}));
        }
      })
      .catch((err) => console.log(err));
  };

  return (
      <div className="d-flex justify-content-center">
        {loginAtom.modal?.alert &&
         <Modal title={loginAtom.modal.alert.alertType}
                onClose={()=>{setLoginAtom ((s) => ({...s, modal: null}));}}>
           {loginAtom.modal.alert.alertMessage}
         </Modal>}

        <div className="card card-lightgreen">
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
};



export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "Login",
           id:"login",}]}
      />
      <Login returnurl={params.returnurl || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
