import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import QRCode from "qrcode";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import Modal from "./components/Modal";

function Account(props) {
  const sameAsUser = props.userId === props.accountId;
  return (
    <FormLayout
      className="px-2 pb-2"
      title={sameAsUser ? "Your account" : "User " + props.accountId}
    >
      <UserStats accountId={props.accountId} userName={props.userName} />
      {sameAsUser && <AccountForm accountId={props.accountId} userName={props.userName} />}
      {sameAsUser && <TwoFactorForm userName={props.userName} />}
    </FormLayout>
  );
}

export function UserStats({ accountId, }){

  const [state, setState] = useState({
      stats: {},
      modal: null,
  });
  const { stats, modal } = state;
  const { totalProjects, totalPlots, averageTime, perProject } = stats;

  const getUserStats = () => {
    fetch("/get-user-stats?accountId=" + accountId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((stats) => setState((s)=>({... s,  stats })))
      .catch((response) => {
        console.log(response);
        setState ({modal: {alert: {alertType: "User Stats Alert",
                                   onClose: ()=>{window.location = "/home";},
                                   alertMessage: "No user found with ID " + accountId}}});
        
      });
  };

  useEffect (getUserStats, []);
  
  return (
    <SectionBlock title="User Stats">
      {modal?.alert &&
       <Modal title={modal.alert.alertType}
              onClose={()=>{setState((s)=>({...s, modal: null}));
                            modal.alert.onClose();}}>
         {modal.alert.alertMessage}
       </Modal>}
      <div className="table table-sm" id="user-stats-table">
        <div className="ProjectStats__plots-table mb-2">
          <strong>Project Total Stats:</strong>
          <div className="row pl-2">
            <div className="col-6">
              <StatsCell title="Projects Worked">{totalProjects} projects</StatsCell>
              <StatsCell title="Plots Completed">{totalPlots} plots</StatsCell>
            </div>
            <div className="col-6">
              <StatsCell title="Average Analysis Duration">
                {averageTime
                 ? averageTime >= 60
                 ? `${(averageTime / 60).toFixed(2)} mins/plot`
                 : `${averageTime} secs/plot`
                 : "loading..."}
              </StatsCell>
              <StatsCell title="Average Plots per Project">
                {Number((totalPlots / totalProjects).toFixed(1)) || 0} plots
              </StatsCell>
            </div>
          </div>
        </div>
        {perProject && (
          <div className="ProjectStats__user-table">
            <strong>User Stats:</strong>
            {perProject.map((project) => (
              <StatsRow
                key={project.id}
                analysisTime={project.analysisAverage}
                plots={project.plotCount}
                title={`#${project.id} - ${project.name}`}
                titleHref={`/collection?projectId=${project.id}&institutionId=${project.institutionId}`}
              />
            ))}
          </div>
        )}
      </div>
    </SectionBlock>
  );  
}

export function AccountForm ({ userName, accountId }){
  
  const [ state, setState ] = useState ({
    email: "",
    password: "",
    passwordConfirmation: "",
    currentPassword: "",
    modal: null,
  });

  const { email, password, passwordConfirmation, currentPassword, modal } = state;

  const updateAccount = () => {
    fetch("/account", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        if (data[0] && data[1] === "") {
          setState ({modal: {alert: {alertType: "Update Account Success",
                                     onClose: ()=>{window.location.reload();},
                                     alertMessage: "Your account details have been updated."}}});
          // userName comes from the session, so we need to reload to update the props.          
        } else {
          setState ({modal: {alert: {alertType: "Update Account Error", alertMessage: data[1]}}});
        }
      })
      .catch((err) => console.log(err));
  };

  return (
    <SectionBlock title="Account Settings">
      <>
        {modal?.alert &&
         <Modal title={modal.alert.alertType}
                onClose={()=>{setState((s)=>({...s, modal: null}));}}>
           {modal.alert.alertMessage}
         </Modal>}

        <h1>{userName}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateAccount();
          }}
        >
          <div className="form-group">
            <label htmlFor="email">Reset email</label>
            <input
              autoComplete="off"
              className="form-control"
              id="email"
              onChange={(e) => setState({ email: e.target.value })}
              placeholder="New email"
              type="email"
              value={email}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Reset password</label>
            <div className="form-row">
              <div className="col">
                <input
                  autoComplete="off"
                  className="form-control mb-1"
                  id="password"
                  onChange={(e) => setState({ password: e.target.value })}
                  placeholder="New password"
                  type="password"
                  value={password}
                />
              </div>
              <div className="col">
                <input
                  autoComplete="off"
                  className="form-control"
                  id="password-confirmation"
                  onChange={(e) => setState({ passwordConfirmation: e.target.value })}
                  placeholder="New password confirmation"
                  type="password"
                  value={passwordConfirmation}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="current-password">Verify your identity</label>
            <input
              autoComplete=" off"
              className="form-control"
              id="current-password"
              onChange={(e) => setState({ currentPassword: e.target.value })}
              placeholder="Current password"
              type="password"
              value={currentPassword}
            />
          </div>
          <input
            className="btn btn-outline-lightgreen btn-block"
            defaultValue="Update account settings"
            name="update-account"
            type="submit"
          />
        </form>
      </>
    </SectionBlock>
  );

};

function OtpKey ({ secret, uri, userName }) {
  const [qrCode, setQrCode] = useState (null);
  const [copyStatus, setCopyStatus] = useState (null);

  useEffect (() => {
    QRCode.toDataURL (uri, {margin: 2, width: 220})
      .then ((dataUrl) => setQrCode (dataUrl))
      .catch ((err) => console.log (err));
  }, [uri]);

  const copySecret = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText (secret)
        .then (() => setCopyStatus ("copied"))
        .catch (() => setCopyStatus ("failed"));
    } else {
      setCopyStatus ("failed");
    }
  };

  return (
    <div className="d-flex flex-column align-items-center mb-3">
      {qrCode
       ? <img alt="Two-factor authentication QR code" height={220} src={qrCode} width={220} />
       : <div className="d-flex align-items-center justify-content-center" style={{height: 220}}>
           Generating QR code...
         </div>}
      <code className="my-2" id="otp-secret" style={{fontSize: "1.1rem", userSelect: "all"}}>
        {secret.match (/.{1,4}/g).join (" ")}
      </code>
      <div className="d-flex">
        <button className="btn btn-outline-lightgreen btn-sm mr-2" onClick={copySecret} type="button">
          {copyStatus === "copied" ? "Copied!" : "Copy text code"}
        </button>
        <a
          className={"btn btn-outline-lightgreen btn-sm" + (qrCode ? "" : " disabled")}
          download={"ceo-2fa-" + (userName || "account").replace (/[^a-zA-Z0-9]+/g, "-") + ".png"}
          href={qrCode || "#"}
        >
          Save QR code
        </a>
      </div>
      {copyStatus === "failed" &&
       <small className="text-danger mt-1">Could not copy. Select the text code above and copy it manually.</small>}
    </div>
  );
}

export function TwoFactorForm ({ userName }) {
  const [state, setState] = useState ({
    enabled: null,
    otpKey: null,
    otpCode: "",
    currentPassword: "",
    modal: null,
  });

  const { enabled, otpKey, otpCode, currentPassword, modal } = state;

  const showAlert = (alertType, alertMessage) =>
        setState ((s) => ({...s, modal: {alert: {alertType, alertMessage}}}));

  const postTwoFactor = (url, body) =>
        fetch (url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify (body),
        })
        .then ((response) => Promise.all ([response.ok, response.json ()]));

  const getTwoFactorStatus = () => {
    fetch ("/get-two-factor-status")
      .then ((response) => (response.ok ? response.json () : Promise.reject (response)))
      .then ((data) => setState ((s) => ({...s, enabled: data.enabled})))
      .catch ((err) => console.log (err));
  };

  useEffect (getTwoFactorStatus, []);

  const startSetup = () => {
    postTwoFactor ("/setup-two-factor", {})
      .then (([ok, data]) => {
        if (ok) {
          setState ((s) => ({...s, otpKey: data, otpCode: ""}));
        } else {
          showAlert ("Two-Factor Authentication Error", data);
        }
      })
      .catch ((err) => {
        console.log (err);
        showAlert ("Two-Factor Authentication Error", "Unable to start the setup. Please try again.");
      });
  };

  const setOtpCode = (e) => {
    e.persist ();
    setState ((s) => ({...s, otpCode: e.target.value.replace (/\D/g, "").slice (0, 6)}));
  };

  const setCurrentPassword = (e) => {
    e.persist ();
    setState ((s) => ({...s, currentPassword: e.target.value}));
  };

  const confirmSetup = () => {
    postTwoFactor ("/enable-two-factor", {otpCode, currentPassword})
      .then (([ok, data]) => {
        if (ok) {
          setState ((s) => ({...s,
                             enabled: true,
                             otpCode: "",
                             currentPassword: "",
                             modal: {alert: {alertType: "Two-Factor Authentication",
                                             alertMessage: "Two-factor authentication is now on. You will need a code from your authenticator app every time you log in."}}}));
        } else {
          setState ((s) => ({...s, otpCode: ""}));
          showAlert ("Two-Factor Authentication Error", data);
        }
      })
      .catch ((err) => {
        console.log (err);
        showAlert ("Two-Factor Authentication Error", "Unable to turn on two-factor authentication. Please try again.");
      });
  };

  const showKey = () => {
    fetch ("/get-two-factor-key")
      .then ((response) => Promise.all ([response.ok, response.json ()]))
      .then (([ok, data]) => {
        if (ok) {
          setState ((s) => ({...s, otpKey: data}));
        } else {
          showAlert ("Two-Factor Authentication Error", data);
        }
      })
      .catch ((err) => {
        console.log (err);
        showAlert ("Two-Factor Authentication Error", "Unable to load your key. Please try again.");
      });
  };

  const disableTwoFactor = () => {
    postTwoFactor ("/disable-two-factor", {otpCode, currentPassword})
      .then (([ok, data]) => {
        if (ok) {
          setState ((s) => ({...s,
                             enabled: false,
                             otpKey: null,
                             otpCode: "",
                             currentPassword: "",
                             modal: {alert: {alertType: "Two-Factor Authentication",
                                             alertMessage: "Two-factor authentication is now off. The old key no longer works."}}}));
        } else {
          setState ((s) => ({...s, otpCode: ""}));
          showAlert ("Two-Factor Authentication Error", data);
        }
      })
      .catch ((err) => {
        console.log (err);
        showAlert ("Two-Factor Authentication Error", "Unable to turn off two-factor authentication. Please try again.");
      });
  };

  const renderSetup = () => (
    <>
      <p>
        1. Scan this QR code with your authenticator app (such as Google Authenticator,
        Microsoft Authenticator or Authy), or type the text code into it.
      </p>
      <OtpKey secret={otpKey.secret} uri={otpKey.uri} userName={userName} />
      <form
        onSubmit={(e) => {
          e.preventDefault ();
          confirmSetup ();
        }}
      >
        <div className="form-group">
          <label htmlFor="otp-setup-code">
            2. Enter the 6-digit code shown in your app and your current password
          </label>
          <div className="form-row">
            <div className="col">
              <input
                autoComplete="one-time-code"
                className="form-control"
                id="otp-setup-code"
                inputMode="numeric"
                onChange={setOtpCode}
                placeholder="6-digit code"
                type="text"
                value={otpCode}
              />
            </div>
            <div className="col">
              <input
                autoComplete="off"
                className="form-control"
                id="otp-setup-password"
                onChange={setCurrentPassword}
                placeholder="Current password"
                type="password"
                value={currentPassword}
              />
            </div>
          </div>
        </div>
        <div className="d-flex">
          <button
            className="btn btn-outline-secondary mr-2"
            onClick={() => setState ((s) => ({...s, otpKey: null, otpCode: "", currentPassword: ""}))}
            type="button"
          >
            Cancel
          </button>
          <input
            className="btn btn-outline-lightgreen flex-grow-1"
            disabled={otpCode.length !== 6 || currentPassword === ""}
            name="enable-two-factor"
            type="submit"
            value="Turn on two-factor authentication"
          />
        </div>
      </form>
    </>
  );

  const renderEnabled = () => (
    <>
      <p>
        Two-factor authentication is <strong>on</strong>. Logging in requires your password
        and a code from your authenticator app.
      </p>
      {otpKey
       ? <>
           <OtpKey secret={otpKey.secret} uri={otpKey.uri} userName={userName} />
           <p className="small">
             Anyone you send this key to can add it to their own authenticator app and will see
             the same codes as you. With your email and password, they can log into this account.
             To revoke their access, change your password, or turn two-factor authentication off
             and on again to get a new key.
           </p>
           <button
             className="btn btn-outline-secondary btn-block mb-3"
             onClick={() => setState ((s) => ({...s, otpKey: null}))}
             type="button"
           >
             Hide key
           </button>
         </>
       : <button
           className="btn btn-outline-lightgreen btn-block mb-3"
           onClick={showKey}
           type="button"
         >
           Show key (QR code and text code)
         </button>}
      <form
        onSubmit={(e) => {
          e.preventDefault ();
          disableTwoFactor ();
        }}
      >
        <div className="form-group">
          <label htmlFor="otp-disable-code">Turn off two-factor authentication</label>
          <div className="form-row">
            <div className="col">
              <input
                autoComplete="one-time-code"
                className="form-control"
                id="otp-disable-code"
                inputMode="numeric"
                onChange={setOtpCode}
                placeholder="6-digit code"
                type="text"
                value={otpCode}
              />
            </div>
            <div className="col">
              <input
                autoComplete="off"
                className="form-control"
                id="otp-disable-password"
                onChange={setCurrentPassword}
                placeholder="Current password"
                type="password"
                value={currentPassword}
              />
            </div>
          </div>
        </div>
        <input
          className="btn btn-outline-danger btn-block"
          disabled={otpCode.length !== 6 || currentPassword === ""}
          name="disable-two-factor"
          type="submit"
          value="Turn off two-factor authentication"
        />
      </form>
    </>
  );

  const renderDisabled = () => (
    <>
      <p>
        Two-factor authentication is <strong>off</strong>. Turn it on to require a 6-digit code
        from an authenticator app, in addition to your password, every time you log in.
      </p>
      <button className="btn btn-outline-lightgreen btn-block" onClick={startSetup} type="button">
        Set up two-factor authentication
      </button>
    </>
  );

  return (
    <SectionBlock title="Two-Factor Authentication">
      <>
        {modal?.alert &&
         <Modal title={modal.alert.alertType}
                onClose={() => setState ((s) => ({...s, modal: null}))}>
           {modal.alert.alertMessage}
         </Modal>}

        {enabled === null
         ? <p>Loading...</p>
         : enabled
         ? renderEnabled ()
         : otpKey
         ? renderSetup ()
         : renderDisabled ()}
      </>
    </SectionBlock>
  );
}


export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "Account",
           id:"account"}]}
      />
      <Account
        accountId={parseInt(params.accountId || session.userId)}
        userId={session.userId}
        userName={session.userName}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}
