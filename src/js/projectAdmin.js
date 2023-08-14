import React from "react";
import ReactDOM from "react-dom";

import { LoadingModal, NavigationBar } from "./components/PageComponents";
import CreateProjectWizard from "./project/CreateProjectWizard";
import ReviewChanges from "./project/ReviewChanges";
import ManageProject from "./project/ManageProject";

import { ProjectContext } from "./project/constants";

class Project extends React.Component {
  constructor(props) {
    super(props);

    this.blankProject = {
      institution: -1,
      name: "",
      description: "",
      designSettings: {
        userAssignment: {
          userMethod: "none",
          users: [],
          percents: [],
        },
        qaqcAssignment: {
          qaqcMethod: "none",
          percent: 0,
          smes: [],
          timesToReview: 2,
        },
        sampleGeometries: {
          points: true,
          lines: true,
          polygons: true,
        },
      },
      projectOptions: {
        showGEEScript: false,
        showPlotInformation: false,
        collectConfidence: false,
        autoLaunchGeoDash: true,
      },
      plotDistribution: "random",
      imageryId: -1,
      aoiFeatures: [],
      aoiFileName: "",
      boundaryType: "manual",
      numPlots: "",
      plotSpacing: "",
      plotShape: "square",
      plotSize: "",
      shufflePlots: false,
      sampleDistribution: "random",
      sampleResolution: "",
      samplesPerPlot: "",
      allowDrawnSamples: false,
      surveyQuestions: {},
      surveyRules: [],
      templateProjectId: -1,
      useTemplateWidgets: false,
      useTemplatePlots: false,
      projectImageryList: [],
      plots: [],
    };

    this.modes = {
      wizard: CreateProjectWizard,
      review: ReviewChanges,
      manage: ManageProject,
      loading: () => null,
    };

    this.state = {
      projectDetails: { ...this.blankProject, privacyLevel: "institution" },
      originalProject: {},
      institutionImagery: [],
      institutionUserList: [],
      designMode: this.props.projectId > 0 ? "manage" : "wizard",
      modalMessage: null,
      wizardStep: "overview",
      doiPath: "",
    };
  }

  /// Lifecycle Methods

  componentDidMount() {
    this.getDoiPath(this.props.projectId);
    if (this.props.institutionId > 0) {
      this.getInstitutionImagery(this.props.institutionId);
    } else if (!this.props.projectId > 0) {
      alert("Invalid URL.");
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

  resetProject = (defaults) => this.setState({ projectDetails: this.blankProject, ...defaults });

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
        alert("Error retrieving the imagery list. See console for details.");
      });

  getDoiPath = (projectId) => {
    fetch(`/doi?projectId=${projectId}`)
      .then((response) => {
        return (response.ok ? response.json() : Promise.reject(response))})
      .then((data) => this.setState({ doiPath: data.doiPath }))
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
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        <div>
          <CurrentComponent />
        </div>
      </ProjectContext.Provider>
    );
  }
}

export function pageInit(args) {
  ReactDOM.render(
    <NavigationBar userId={args.userId} userName={args.userName} version={args.version}>
      <Project
        institutionId={parseInt(args.institutionId) || -1}
        projectId={parseInt(args.projectId) || -1}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}
