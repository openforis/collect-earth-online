import React from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";
import { NavigationBar } from "./components/PageComponents";
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
    </FormLayout>
  );
}

class UserStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stats: {},
      modal: null,
    };
  }

  componentDidMount() {
    this.getUserStats();
  }

  getUserStats = () => {
    fetch("/get-user-stats?accountId=" + this.props.accountId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((stats) => this.setState({ stats }))
      .catch((response) => {
        console.log(response);
        this.setState ({modal: {alert: {alertType: "User Stats Alert",
                                        onClose: ()=>{window.location = "/home";},
                                        alertMessage: "No user found with ID " + this.props.accountId}}});
        
      });
  };

  render() {
    const { totalProjects, totalPlots, averageTime, perProject } = this.state.stats;
    return (
      <SectionBlock title="User Stats">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});
                              this.state.modal.alert.onClose();}}>
           {this.state.modal.alert.alertMessage}
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
                  titleHref={`/collection?projectId=${project.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </SectionBlock>
    );
  }
}

class AccountForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      passwordConfirmation: "",
      currentPassword: "",
      modal: null,
    };
  }

  updateAccount = () => {
    fetch("/account", {
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
          this.setState ({modal: {alert: {alertType: "Update Account Success",
                                          onClose: ()=>{window.location.reload();},
                                          alertMessage: "Your account details have been updated."}}});
          // userName comes from the session, so we need to reload to update the props.          
        } else {
          this.setState ({modal: {alert: {alertType: "Update Account Error", alertMessage: data[1]}}});
        }
      })
      .catch((err) => console.log(err));
  };

  render() {
    return (
      <SectionBlock title="Account Settings">
        <>
          {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

          <h1>{this.props.userName}</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              this.updateAccount();
            }}
          >
            <div className="form-group">
              <label htmlFor="email">Reset email</label>
              <input
                autoComplete="off"
                className="form-control"
                id="email"
                onChange={(e) => this.setState({ email: e.target.value })}
                placeholder="New email"
                type="email"
                value={this.state.email}
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
                    onChange={(e) => this.setState({ password: e.target.value })}
                    placeholder="New password"
                    type="password"
                    value={this.state.password}
                  />
                </div>
                <div className="col">
                  <input
                    autoComplete="off"
                    className="form-control"
                    id="password-confirmation"
                    onChange={(e) => this.setState({ passwordConfirmation: e.target.value })}
                    placeholder="New password confirmation"
                    type="password"
                    value={this.state.passwordConfirmation}
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
                onChange={(e) => this.setState({ currentPassword: e.target.value })}
                placeholder="Current password"
                type="password"
                value={this.state.currentPassword}
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
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <Account
        accountId={parseInt(params.accountId || session.userId)}
        userId={session.userId}
        userName={session.userName}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}
