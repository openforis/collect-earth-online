import React from "react";
import _ from "lodash";

import AOIMap from "./AOIMap";
import SurveyQuestionsDesigner from "../survey/SurveyQuestionsDesigner";
import SurveyCollectionPreview from "../survey/SurveyCollectionPreview";
import SurveyRulesDesigner from "../survey/SurveyRulesDesigner";
import PlotStep from "./PlotStep";
import SvgIcon from "../components/svg/SvgIcon";
import { ImagerySelection } from "./ImagerySelection";
import { Overview, OverviewIntro } from "./Overview";
import { SampleDesign, SampleReview, SamplePreview } from "./SampleDesign";

import { mercator } from "../utils/mercator";
import { last, lengthObject, removeFromSet, someObject, filterObject } from "../utils/sequence";
import { ProjectContext, plotLimit, perPlotLimit, sampleLimit } from "./constants";

export default class CreateProjectWizard extends React.Component {
  constructor(props) {
    super(props);

    this.steps = {
      overview: {
        title: "Project Overview",
        description: "General information about the project",
        StepComponent: () => (
          <Overview
            clearTemplateSelection={this.clearTemplateSelection}
            setProjectTemplate={this.setProjectTemplate}
            templateProjectList={this.state.templateProjectList}
            toggleTemplatePlots={this.toggleTemplatePlots}
          />
        ),
        helpDescription: "Introduction",
        StepHelpComponent: OverviewIntro,
        validate: this.validateOverview,
      },
      imagery: {
        title: "Imagery Selection",
        description: "Imagery available to use during collection",
        StepComponent: ImagerySelection,
        helpDescription: "Imagery Preview",
        StepHelpComponent: () => (
          <AOIMap
            canDrag={false}
            context={this.context}
            imagery={this.context.institutionImagery.filter(
              ({ title }) => title === "Mapbox Satellite"
            )}
          />
        ),
        validate: this.validateImagery,
      },
      plots: {
        title: "Plot Design",
        description: "Area of interest and plot generation for collection",
        StepComponent: () => <PlotStep getTotalPlots={this.getTotalPlots} />,
        helpDescription: "Collection Map Preview",
        StepHelpComponent: () => (
          <AOIMap
            canDrag={
              !this.context.useTemplatePlots &&
              !["csv", "shp"].includes(this.context.plotDistribution) &&
              this.context.boundaryType === "manual"
            }
            context={this.context}
            imagery={this.context.institutionImagery.filter(
              ({ title }) => title === "Mapbox Satellite"
            )}
          />
        ),
        validate: this.validatePlotData,
      },
      samples: {
        title: "Sample Design",
        description: "Sample generation for collection",
        StepComponent: () =>
          this.context.useTemplatePlots ? (
            <SampleReview />
          ) : (
            <SampleDesign
              getSamplesPerPlot={this.getSamplesPerPlot}
              getTotalPlots={this.getTotalPlots}
            />
          ),
        helpDescription: "Collection Map Preview",
        StepHelpComponent: SamplePreview,
        validate: this.validateSampleData,
      },
      questions: {
        title: "Survey Questions",
        description: "Questions to be answered during collection",
        StepComponent: SurveyQuestionsDesigner,
        helpDescription: "Question Preview",
        StepHelpComponent: () => (
          <SurveyCollectionPreview surveyQuestions={this.context.surveyQuestions} />
        ),
        validate: this.validateSurveyQuestions,
      },
      rules: {
        title: "Survey Rules",
        description: "Rules to ensure correct answers",
        StepComponent: SurveyRulesDesigner,
        helpDescription: "Question Preview",
        StepHelpComponent: () => (
          <SurveyCollectionPreview surveyQuestions={this.context.surveyQuestions} />
        ),
        validate: () => [],
      },
    };

    this.state = {
      complete: new Set(),
      templateProject: {},
      templatePlots: [],
      templateProjectList: [{ id: -1, name: "Loading..." }],
    };
  }

  /// Lifecycle Methods

  componentDidMount() {
    Promise.all([this.getTemplateProjects(), this.getInstitutionUserList()]).catch((error) => {
      console.error(error);
      alert("Error retrieving the project data. See console for details.");
    });
    if (this.context.name !== "" || this.context.description !== "") this.checkAllSteps();
  }

  /// API Calls

  getTemplateProjects = () =>
    fetch("/get-template-projects")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) =>
        this.setState({
          templateProjectList:
            data && data.length > 0 ? data : [{ id: -1, name: "No template projects found" }],
        })
      )
      .catch((error) => {
        this.setState({ templateProjectList: [{ id: -1, name: "Failed to load" }] });
        Promise.reject(error);
      });

  getInstitutionUserList = () => {
    const { institutionId } = this.context;
    if (institutionId > 0) {
      fetch(`/get-institution-users?institutionId=${institutionId}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => this.context.setContextState({ institutionUserList: data }));
    }
  };

  getTemplateProject = (projectId) =>
    Promise.all([
      this.getTemplateById(projectId),
      this.getProjectPlots(projectId),
      this.getProjectImagery(projectId),
    ])
      .then(() => this.context.setProjectDetails({ templateProjectId: projectId }))
      .catch((error) => {
        this.setState({ templatePlots: [], templateProject: {} });
        this.context.setProjectDetails({ templateProjectId: -1 });
        console.error(error);
        alert("Error getting complete template info. See console for details.");
      });

  getTemplateById = (projectId) =>
    fetch(`/get-template-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.setState({ templateProject: data });
        const clearedTemplateAssignments = this.clearTemplateUserAssignments(data);
        const institutionImageryIds = this.context.institutionImagery.map((i) => i.id);
        this.context.setProjectDetails(
          {
            ...clearedTemplateAssignments,
            templateProjectId: projectId,
            imageryId: institutionImageryIds.includes(data.imageryId)
              ? data.imageryId
              : institutionImageryIds[0],
            useTemplatePlots: true,
            useTemplateWidgets: true,
          },
          this.checkAllSteps
        );
      });

  getProjectPlots = (projectId) =>
    fetch(`/get-project-plots?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.setState({ templatePlots: data });
        this.context.setProjectDetails({ plots: data });
      });

  // TODO: just return with the project info because we only need the integer ID
  getProjectImagery = (projectId) =>
    fetch("/get-project-imagery?projectId=" + projectId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.context.setProjectDetails({
          projectImageryList: data.map((i) => i.id)
        });
      });

  /// Validations

  getTotalPlots = () => {
    if (this.context.plotDistribution === "random" && this.context.numPlots) {
      return this.context.numPlots * this.context.aoiFeatures.length;
    } else if (
      this.context.plotDistribution === "gridded" &&
      this.context.plotSize &&
      this.context.plotSpacing
    ) {
      return this.context.aoiFeatures.reduce((acc, cur) => {
        const boundaryExtent = mercator.parseGeoJson(cur, true).getExtent();
        const buffer = this.context.plotSize;
        const xRange = boundaryExtent[2] - boundaryExtent[0] - buffer;
        const yRange = boundaryExtent[3] - boundaryExtent[1] - buffer;
        const xSteps = Math.floor(xRange / this.context.plotSpacing) + 1;
        const ySteps = Math.floor(yRange / this.context.plotSpacing) + 1;
        return acc + xSteps * ySteps;
      }, 0);
    } else {
      return 0;
    }
  };

  getSamplesPerPlot = () => {
    if (this.context.sampleDistribution === "random" && this.context.samplesPerPlot) {
      return this.context.samplesPerPlot;
    } else if (
      this.context.sampleDistribution === "gridded" &&
      this.context.plotSize &&
      this.context.sampleResolution
    ) {
      const steps =
        Math.floor(
          (this.context.plotSize - this.context.plotSize / 12.5) / this.context.sampleResolution + 1
        ) ** 2;
      return this.context.plotShape === "circle" ? Math.floor(steps * (3.14 / 4)) : steps;
    } else if (this.context.sampleDistribution === "center") {
      return 1;
    } else {
      return 0;
    }
  };

  validateOverview = () => {
    const { name, description } = this.context;
    const errorList = [
      (name === "" || description === "") && "A project must contain a name and description.",
    ];
    return errorList.filter((e) => e);
  };

  validateImagery = () => {
    const { privacyLevel, imageryId, institutionImagery, projectImageryList } = this.context;
    const requiresPublic =
      ["public", "users"].includes(privacyLevel) &&
      [...projectImageryList, imageryId].every((id) =>
        institutionImagery.some((il) => il.id === id && il.visibility === "private")
      );
    const errorList = [
      requiresPublic &&
        `Projects with privacy level of ${privacyLevel} require at least one public imagery.`,
      imageryId <= 0 && "Select a valid Basemap.",
    ];
    return errorList.filter((e) => e);
  };

  validatePlotData = () => {
    const {
      projectId,
      aoiFeatures,
      plotDistribution,
      numPlots,
      plotSpacing,
      plotSize,
      plotFileName,
      useTemplatePlots,
      originalProject,
      designSettings: {
        userAssignment: { userMethod, users, percents },
        qaqcAssignment: { qaqcMethod, smes, percent, timesToReview },
      },
    } = this.context;
    const totalPlots = this.getTotalPlots();
    const plotFileNeeded =
      !useTemplatePlots &&
      (projectId === -1 || plotDistribution !== originalProject.plotDistribution);
    const errorList = [
      ["random", "gridded"].includes(plotDistribution) &&
        !aoiFeatures.length &&
        "Please select a valid boundary.",
      plotDistribution === "random" &&
        !numPlots &&
        "A number of plots is required for random plot distribution.",
      plotDistribution === "gridded" &&
        !plotSpacing &&
        "A plot spacing is required for gridded plot distribution.",
      plotDistribution !== "shp" && (!plotSize || plotSize === 0) && "A plot size is required.",
      plotDistribution === "csv" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".csv") &&
        "A plot CSV (.csv) file is required.",
      plotDistribution === "shp" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".zip") &&
        "A plot SHP (.zip) file is required.",
      totalPlots > plotLimit &&
        "The plot size limit has been exceeded. Check the Plot Design section for detailed info.",
      ["equal", "percent"].includes(userMethod) &&
        users.length === 0 &&
        "At least one user must be added to the plot assignment.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc + p, 0) !== 100 &&
        "The assigned plot percentages must equal 100%.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc || p === 0, false) &&
        "All plot assignment percentages must be greater than 0%.",
      ["overlap", "sme"].includes(qaqcMethod) &&
        percent === 0 &&
        "The assigned Quality Control percentage must be greater than 0%.",
      ["random", "gridded"].includes(plotDistribution) &&
        qaqcMethod === "overlap" &&
        users.length > Math.round((totalPlots * (percent / 100)) / users.length) &&
        `Too few plots per user for Quality Control Overlap. Each user must have at least ${users.length} plots.`,
      qaqcMethod === "sme" && smes.length === 0 && "At least one user must be added as an SME.",
      qaqcMethod === "overlap" &&
        users.length === 1 &&
        "At least two assigned users are required for overlap mode.",
      qaqcMethod === "overlap" && timesToReview < 2 && "# of Reviews must be at least 2.",
      qaqcMethod === "overlap" &&
        timesToReview > users.length &&
        users.length > 1 &&
        "# of Reviews cannot be greater than the number of assigned users.",
      userMethod !== "none" &&
        qaqcMethod === "sme" &&
        _.intersection(users, smes).length > 0 &&
        "Users cannot be an Assigned User and an SME. Please remove the duplicate users.",
    ];
    return errorList.filter((e) => e);
  };

  validateSampleData = () => {
    const {
      allowDrawnSamples,
      designSettings: { sampleGeometries },
      originalProject,
      plotFileName,
      plotShape,
      plotSize,
      projectId,
      sampleDistribution,
      sampleFileName,
      sampleResolution,
      useTemplatePlots,
    } = this.context;
    const totalPlots = this.getTotalPlots();
    const samplesPerPlot = this.getSamplesPerPlot();
    const sampleFileNeeded =
      !useTemplatePlots &&
      (projectId === -1 ||
        sampleDistribution !== originalProject.sampleDistribution ||
        plotFileName);
    const errorList = [
      sampleDistribution === "random" &&
        !samplesPerPlot &&
        "A number of samples per plot is required for random sample distribution.",
      sampleDistribution === "gridded" &&
        !sampleResolution &&
        "A sample spacing is required for gridded sample distribution.",
      sampleDistribution === "csv" &&
        sampleFileNeeded &&
        !(sampleFileName || "").includes(".csv") &&
        "A sample CSV (.csv) file is required.",
      sampleDistribution === "shp" &&
        sampleFileNeeded &&
        !(sampleFileName || "").includes(".zip") &&
        "A sample SHP (.zip) file is required.",
      sampleDistribution === "gridded" &&
        plotShape === "circle" &&
        sampleResolution >= plotSize / Math.sqrt(2) &&
        `You must use a sample spacing that is less than ${
          Math.round((plotSize / Math.sqrt(2)) * 100) / 100
        } meters.`,
      sampleDistribution === "gridded" &&
        plotShape === "square" &&
        sampleResolution >= plotSize &&
        "The sample spacing must be less than the plot width.",
      (samplesPerPlot > perPlotLimit || totalPlots * samplesPerPlot > sampleLimit) &&
        "The sample size limit has been exceeded. Check the Sample Design section for detailed info.",
      allowDrawnSamples &&
        !Object.values(sampleGeometries).some((g) => g) &&
        "At least one geometry type must be enabled.",
    ];
    return errorList.filter((e) => e);
  };

  allAnswersHidden = (answers) => {
    const hiddenAnswers = filterObject(answers, ([_id, ans]) => ans.hide);
    return lengthObject(answers) === lengthObject(hiddenAnswers);
  }

  validateSurveyQuestions = () => {
    const { surveyQuestions } = this.context;
    const errorList = [
      lengthObject(surveyQuestions) === 0 && "A survey must include at least one question.",
      someObject(surveyQuestions, ([_id, sq]) => (lengthObject(sq.answers) === 0 || this.allAnswersHidden(sq.answers))) &&
        "All survey questions must contain at least one (unhidden) answer.",
    ];
    return errorList.filter((e) => e);
  };

  /// Changing Step

  getSteps = () => {
    const { projectId, originalProject } = this.context;
    return projectId === -1 || originalProject.availability === "unpublished"
      ? this.steps
      : filterObject(this.steps, ([key, _val]) =>
          ["overview", "imagery", "questions"].includes(key)
        );
  };

  checkAllSteps = () => {
    const validSteps = Object.entries(this.getSteps())
      .filter(([_key, val]) => val.validate().length === 0)
      .map(([key, _val]) => key);
    this.setState({ complete: new Set(validSteps) });
  };

  tryChangeStep = (newStep, alertUser = true) => {
    const errorList = this.getSteps()[this.context.wizardStep].validate();
    this.setState({
      complete:
        errorList.length > 0
          ? removeFromSet(this.state.complete, this.context.wizardStep)
          : this.state.complete.add(this.context.wizardStep),
    });
    if (alertUser && errorList.length > 0) {
      alert(errorList.join("\n"));
    } else {
      this.context.setContextState({ wizardStep: newStep });
    }
  };

  nextStep = () => {
    const stepKeys = Object.keys(this.getSteps());
    this.tryChangeStep(
      stepKeys[Math.min(stepKeys.length - 1, stepKeys.indexOf(this.context.wizardStep) + 1)]
    );
  };

  prevStep = () => {
    const stepKeys = Object.keys(this.getSteps());
    this.tryChangeStep(stepKeys[Math.max(0, stepKeys.indexOf(this.context.wizardStep) - 1)], false);
  };

  finish = () => {
    const failedStep = Object.entries(this.getSteps()).find(([_key, val]) => {
      const errorList = val.validate();
      if (errorList.length > 0) {
        alert(errorList.join("\n"));
        return true;
      } else {
        return false;
      }
    });
    if (failedStep) {
      this.context.setContextState({ wizardStep: failedStep[0] });
    } else {
      this.context.setContextState({ designMode: "review" });
    }
  };

  /// Template handling

  clearTemplateSelection = () => {
    this.context.resetProject({ imageryId: this.context.institutionImagery[0].id });
    this.setState({
      templateProject: {},
      templatePlots: [],
      complete: new Set(),
    });
  };

  setProjectTemplate = (newTemplateId) => {
    this.context.processModal("Loading Template Information", () =>
      this.getTemplateProject(newTemplateId)
    );
  };

  toggleTemplatePlots = () => {
    if (this.context.useTemplatePlots) {
      this.context.setProjectDetails({ useTemplatePlots: false, plots: [] });
    } else {
      this.context.setProjectDetails({
        useTemplatePlots: true,
        plots: this.state.templatePlots,
        aoiFeatures: this.state.templateProject.aoiFeatures,
        aoiFileName: this.state.templateProject.aoiFileName,
        numPlots: this.state.templateProject.numPlots,
        plotDistribution: this.state.templateProject.plotDistribution,
        plotShape: this.state.templateProject.plotShape,
        plotSize: this.state.templateProject.plotSize,
        plotSpacing: this.state.templateProject.plotSpacing,
        sampleDistribution: this.state.templateProject.sampleDistribution,
        sampleResolution: this.state.templateProject.sampleResolution,
        samplesPerPlot: this.state.templateProject.samplesPerPlot,
      });
    }
  };


  clearTemplateUserAssignments = (templateProject) => 
    this.context.institutionId != templateProject.templateInstitutionId ?
      {...templateProject,
       designSettings: {...templateProject.designSettings,
                        userAssignment: {
                            userMethod: null,
                            users: [],
                            percents: []}}}
      : templateProject;


  /// Render Functions

  renderStep = (stepName) => {
    const steps = this.getSteps();
    const isLast = last(Object.keys(steps)) === stepName;
    const isSelected = stepName === this.context.wizardStep;
    const stepComplete = this.state.complete.has(stepName);
    const stepColor = `var(--${isSelected ? "yellow" : stepComplete ? "lightgreen" : "gray"})`;

    return (
      <div
        key={stepName}
        id={stepName + "-button"}
        onClick={() => this.tryChangeStep(stepName, false)}
        style={{ width: "10rem", display: "flex", flexDirection: "column", alignItems: "center" }}
        title={steps[stepName].description}
      >
        {isLast ? (
          <div style={{ border: "2px solid transparent" }} />
        ) : (
          <div
            style={{
              backgroundColor: stepColor,
              border: "2px solid " + stepColor,
              left: "5rem",
              top: "calc(1rem + 2px)",
              position: "relative",
              width: "5rem",
            }}
          />
        )}
        <div
          style={{
            borderRadius: "50%",
            backgroundColor: stepColor,
            cursor: "pointer",
            height: "2.5rem",
            width: "2.5rem",
            padding: "calc((2.5rem - 1.25rem) / 2)",
          }}
        >
          {stepComplete && (
            <SvgIcon color="white" icon="check" size="1.25rem" verticalAlign="initial" />
          )}
        </div>
        <label style={{ color: stepColor, cursor: "pointer", fontWeight: "bold" }}>
          {steps[stepName].title}
        </label>
      </div>
    );
  };

  render() {
    const steps = this.getSteps();
    const { description, StepComponent, helpDescription, StepHelpComponent } =
      steps[this.context.wizardStep];
    const isLast = last(Object.keys(steps)) === this.context.wizardStep;
    return (
      <div className="d-flex pb-5 full-height align-items-center flex-column" id="wizard">
        <div style={{ display: "flex", margin: ".75rem" }}>
          {Object.keys(steps).map((s) => this.renderStep(s))}
        </div>
        <div
          style={{
            display: "flex",
            height: "100%",
            justifyContent: "center",
            width: "100%",
            overflow: "auto",
          }}
        >
          <div
            className="col-7 px-0 mr-2 overflow-auto bg-lightgray"
            style={{ border: "1px solid black", borderRadius: "6px" }}
          >
            <h2 className="bg-lightgreen w-100 py-1">{description}</h2>
            <div className="p-3">
              <StepComponent />
            </div>
          </div>
          <div className="col-4">
            <div className="d-flex flex-column h-100">
              <div
                className="h-100 overflow-auto bg-lightgray"
                style={{ border: "1px solid black", borderRadius: "6px" }}
              >
                <h2 className="bg-lightgreen w-100 py-1">{helpDescription}</h2>
                <StepHelpComponent />
              </div>
              <NavigationButtons
                cancel={() => {
                  if (this.context.projectId > 0) {
                    this.context.setContextState({ designMode: "manage" });
                  } else {
                    window.location = `/review-institution?institutionId=${this.context.institutionId}`;
                  }
                }}
                finish={this.finish}
                nextStep={isLast ? this.finish : this.nextStep}
                prevStep={this.prevStep}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
CreateProjectWizard.contextType = ProjectContext;

function NavigationButtons({ prevStep, nextStep, finish, cancel }) {
  return (
    <div>
      <div id="navigation-buttons">
        <div className="d-flex flex-row justify-content-around mt-2">
          <input className="btn btn-lightgreen" onClick={prevStep} type="button" value="Back" />
          <input className="btn btn-lightgreen" onClick={nextStep} type="button" value="Next" />
          <input className="btn btn-lightgreen" onClick={finish} type="button" value="Review" />
          <input className="btn btn-red" onClick={cancel} type="button" value="Cancel" />
        </div>
      </div>
    </div>
  );
}
