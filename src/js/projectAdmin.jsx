import React from "react";
import ReactDOM from "react-dom";

import { LoadingModal, NavigationBar, SuccessModal } from "./components/PageComponents";
import CreateProjectWizard from "./project/CreateProjectWizard";
import ReviewChanges from "./project/ReviewChanges";
import ManageProject from "./project/ManageProject";

import { ProjectContext, blankProject } from "./project/constants";
import Modal from "./components/Modal";

class Project extends React.Component {
  constructor(props) {
    super(props);

    this.modes = {
      wizard: CreateProjectWizard,
      review: ReviewChanges,
      manage: ManageProject,
      loading: () => null,
    };

    this.state = {
      projectDetails: { ...blankProject, privacyLevel: "institution" },
      originalProject: {},
      institutionImagery: [],
      institutionUserList: [],
      designMode: this.props.projectId > 0 ? "manage" : "wizard",
      modalMessage: null,
      wizardStep: "overview",
      doiPath: "",
      successMessage: "",
      projectDraftId: this.props.projectDraftId,
      modal: null
    };
  }

  /// Lifecycle Methods

  componentDidMount() {
    this.getDoiPath(this.props.projectId);
    if (this.props.institutionId > 0) {
      this.getInstitutionImagery(this.props.institutionId);
    } else if (!this.props.projectId > 0) {
      this.setState ({modal: {alert: {alertType: "Project Admin Alert", alertMessage: "Invalid URL."}}});
      window.location = "/home";
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { plotDistribution, sampleDistribution, institution } = this.state.projectDetails;

    if (plotDistribution !== prevState.projectDetails.plotDistribution) {
      const newSampleDistribution =
        ["random", "gridded"].includes(plotDistribution) &&
        ["csv", "shp"].includes(sampleDistribution)
          ? "random"
          : plotDistribution === "shp" && ["random", "gridded"].includes(sampleDistribution)
          ? "shp"
          : sampleDistribution;
      if (newSampleDistribution !== sampleDistribution) {
        this.setProjectDetails({ sampleDistribution: newSampleDistribution });
      }
    }

    if (institution !== prevState.projectDetails.institution) {
      this.getInstitutionImagery(institution);
    }
  }

  /// Updating State

  setProjectDetails = (newValue, callBack = () => null) =>
    this.setState({ projectDetails: { ...this.state.projectDetails, ...newValue } }, callBack);

  resetProject = (defaults) => this.setState({ projectDetails: blankProject, ...defaults });

  setContextState = (newState) => this.setState(newState);

  /// API Calls

  getInstitutionImagery = (institutionId) =>
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        const sorted = [
          ...data.filter((a) => a.title.toLocaleLowerCase().includes("mapbox")),
          ...data.filter((a) => !a.title.toLocaleLowerCase().includes("mapbox")),
        ];
        this.setState({ institutionImagery: sorted });
        this.setProjectDetails({ imageryId: sorted[0].id });
      })
      .catch((response) => {
        console.log(response);
        this.setState ({modal: {alert: {alertType: "Imagery Error", alertMessage: "Error retrieving the imagery list. See console for details."}}});
      });

  getDoiPath = (projectId) => {
    fetch(`/doi?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.setState({ doiPath: data.doiPath }));
  }

  /// Functions

  processModal = (message, callBack) => {
    this.setState({ modalMessage: message }, () =>
      callBack().finally(() => this.setState({ modalMessage: null }))
    );
  };

  render() {
    const CurrentComponent = this.modes[this.state.designMode];
    return (
      <ProjectContext.Provider
        value={{
          institutionId: this.props.institutionId,
          projectId: this.props.projectId,
          projectDraftId: this.props.projectDraftId,
          ...this.state.projectDetails, // TODO: Do not spread projectDetails into context.
          originalProject: this.state.originalProject,
          designMode: this.state.designMode,
          institutionImagery: this.state.institutionImagery,
          institutionUserList: this.state.institutionUserList,
          setProjectDetails: this.setProjectDetails,
          setContextState: this.setContextState,
          resetProject: this.resetProject,
          processModal: this.processModal,
          wizardStep: this.state.wizardStep,
          doiPath: this.state.doiPath,
        }}
      >
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        {this.state.successMessage && <SuccessModal message={this.state.successMessage} onClose={() => this.setState({ successMessage: ""})}/>}
        <div>
          <CurrentComponent />
        </div>
      </ProjectContext.Provider>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <Project
        institutionId={parseInt(params.institutionId) || -1}
        projectId={parseInt(params.projectId) || -1}
        projectDraftId={parseInt(params.projectDraftId) || -1}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}
