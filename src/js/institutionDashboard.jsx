import React from "react";
import ReactDOM from "react-dom";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import SvgIcon from "./components/svg/SvgIcon";

class InstitutionDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projectList: [],
      modalMessage: null,
    };
  }

  /// Lifecycle

  componentDidMount() {
    this.processModal(
      "Loading project list",
      this.getProjectList().catch((response) => {
        console.error(response);
        alert("Error retrieving the project list. See console for details.");
      })
    );
  }

  /// API Calls

  getProjectList = () =>
    fetch(`/get-institution-dash-projects?institutionId=${this.props.institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.setState({ projectList: data }));

  /// Helpers

  processModal = (message, promise) =>
    this.setState({ modalMessage: message }, () =>
      promise.finally(() => this.setState({ modalMessage: null }))
    );

  render() {
    const { projectList } = this.state;
    return (
      <div className="row justify-content-center" id="institution-dashboard">
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        <div
          className="bg-darkgreen mb-3 no-container-margin"
          style={{ width: "100%", margin: "0 10px 0 10px" }}
        >
          <h1>Institution Dashboard</h1>
        </div>
        {projectList.length > 0 ? (
          <table id="srd" style={{ width: "1000px", margin: "10px", color: "rgb(49, 186, 176)" }}>
            <thead>
              <tr>
                <th style={{ paddingRight: "1rem", whiteSpace: "nowrap" }}>Project Id</th>
                <th style={{ paddingRight: "1rem", whiteSpace: "nowrap" }}>Project Name</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Users Assigned</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Contributors</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Total Plots</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Plot Assignments</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Flagged Plots</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Analyzed Plots</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Partial Plots</th>
                <th style={{ textAlign: "center", paddingRight: "1rem" }}>Unanalyzed Plots</th>
              </tr>
            </thead>
            <tbody>
              {projectList &&
                projectList.map(({ id, name, stats }) => (
                  <tr key={id}>
                    <td>{id}</td>
                    <td style={{ minWidth: "15rem" }}>{name}</td>
                    <td style={{ textAlign: "center" }}>{stats.usersAssigned}</td>
                    <td style={{ textAlign: "center" }}>{stats.contributors}</td>
                    <td style={{ textAlign: "center" }}>{stats.totalPlots}</td>
                    <td style={{ textAlign: "center" }}>{stats.plotAssignments}</td>
                    <td style={{ textAlign: "center" }}>{stats.flaggedPlots}</td>
                    <td style={{ textAlign: "center" }}>{stats.analyzedPlots}</td>
                    <td style={{ textAlign: "center" }}>{stats.partialPlots}</td>
                    <td style={{ textAlign: "center" }}>{stats.unanalyzedPlots}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="mx-4 d-flex">
            <SvgIcon icon="alert" size="1.2rem" />
            <p style={{ marginLeft: "0.4rem" }}>
              Your dashboard is empty. In order to view project data here, please create a new
              project.
            </p>
          </div>
        )}
      </div>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.version}>
      <InstitutionDashboard institutionId={params.institutionId || "0"} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
