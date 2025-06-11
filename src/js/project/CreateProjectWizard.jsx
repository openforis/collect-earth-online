import React from "react";
import _ from "lodash";

import AOIMap from "./AOIMap";
import SurveyQuestionsDesigner from "../survey/SurveyQuestionsDesigner";
import SurveyCollectionPreview from "../survey/SurveyCollectionPreview";
import SurveyRulesDesigner from "../survey/SurveyRulesDesigner";
import PlotStep from "./PlotStep";
import SvgIcon from "../components/svg/SvgIcon";
import getErrors from "../utils/validation";
import { ImagerySelection } from "./ImagerySelection";
import { Overview, OverviewIntro } from "./Overview";
import { SampleDesign, SampleReview, SamplePreview } from "./SampleDesign";

import { mercator } from "../utils/mercator";
import { last, lengthObject, removeFromSet, someObject, filterObject } from "../utils/sequence";
import { ProjectContext, plotLimit, perPlotLimit, sampleLimit, blankProject } from "./constants";

import Modal from "../components/Modal";

export default class CreateProjectWizard extends React.Component {
  constructor(props) {
    super(props);

    this.fullProjectSteps = {
      overview: {
        title: "Project Overview",
        description: "General information about the project",
        StepComponent: () => (
          <Overview
            clearTemplateSelection={this.clearTemplateSelection}
            setProjectTemplate={this.setProjectTemplate}
            templateProjectList={this.state.templateProjectList}
            toggleTemplatePlots={this.toggleTemplatePlots}
            checkAllSteps={this.checkAllSteps}
            steps={this.state.steps}
            updateSteps={this.updateSteps}
            updateProjectType={this.updateProjectType}
            type={this.projectType}
            fullProjectSteps={this.fullProjectSteps}
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
              ({ title }) => (title === "CEO: Mapbox Satellite") ||
                (title === "CEO: Open Street Maps")
            )}
          />
        ),
        validate: this.validateImagery,
      },
      plots: {
        title: "Plot Design",
        description: "Area of interest and plot generation for collection",
        StepComponent: () => <PlotStep
                               getTotalPlots={this.getTotalPlots}
                               steps={this.state.steps}
                               projectType={this.state.type}
                             />,
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
              ({ title }) => (title === "CEO: Mapbox Satellite") ||
                (title === "CEO: Open Street Maps")
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
      steps: this.fullProjectSteps,
      complete: new Set(),
      templateProject: {},
      templatePlots: [],
      modal: null,
      type: "regular",
      draftProject: { ...blankProject}
    };
  }

  /// Lifecycle Methods

  componentDidMount() {
    if (this.context.projectDraftId > 0) {
      this.getDraftById(this.context.projectDraftId);
    }
    Promise.all([this.getTemplateProjects(), this.getInstitutionUserList()]).catch((error) => {
      console.error(error);
      this.setState ({modal: {alert: {alertType: "Project Data Error", alertMessage: "Error retrieving the project data. See console for details."}}});
    });
    this.setState({type: this.context?.projectDetails?.type,
                   steps: this.context?.type === "regular" ?
                   this.fullProjectSteps :
                   filterObject(this.fullProjectSteps, ([key, _val]) =>
                     ["overview", "imagery", "plots", "questions"].includes(key))
                  });
    if (this.context.name !== "" || this.context.description !== "") this.checkAllSteps();
  }

  /// API Calls

  getDraftById = (projectDraftId) =>
    fetch(`/get-project-draft-by-id?projectDraftId=${projectDraftId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!data) {
          this.setState ({modal: {alert: {alertType: "Get Draft Error",
                                          onClose: ()=>{window.location = "/home";},
                                          alertMessage: "No draft found with ID " + projectDraftId + "."}}});          
        } else {
          this.context.setProjectDetails(data);
          this.context.setContextState({ originalProject: data });
          return data.institution;
        }
      }).catch(() => {
        this.setState ({modal: {alert: {alertType: "Get Draft Error",
                                        onClose: ()=>{window.location = "/home";},
                                        alertMessage: "No draft found with ID " + projectDraftId + "."}}});
        
      })
      
    buildDraftObject = () => ({
      imageryId: this.context.imageryId,
      projectImageryList: this.context.projectImageryList,
      aoiFeatures: this.context.aoiFeatures,
      aoiFileName: this.context.aoiFileName,
      description: this.context.description,
      name: this.context.name,
      type: this.context.type,
      privacyLevel: this.context.privacyLevel,
      projectOptions: this.context.projectOptions,
      designSettings: this.context.designSettings,
      numPlots: this.context.numPlots,
      plotDistribution: this.context.plotDistribution,
      plotShape: this.context.plotShape,
      plotSize: this.context.plotSize,
      plotSpacing: this.context.plotSpacing,
      shufflePlots: this.context.shufflePlots,
      sampleDistribution: this.context.sampleDistribution,
      samplesPerPlot: this.context.samplesPerPlot,
      sampleResolution: this.context.sampleResolution,
      allowDrawnSamples: this.context.allowDrawnSamples,
      surveyQuestions: this.context.surveyQuestions,
      surveyRules: this.context.surveyRules,
      plotFileName: this.context.plotFileName,
      plotFileBase64: this.context.plotFileBase64,
      sampleFileName: this.context.sampleFileName,
      sampleFileBase64: this.context.sampleFileBase64,
    });

    saveDraft = () => {
      if (this.context.projectDraftId > 0) {
        this.context.processModal("Updating Draft", () =>
        fetch("/update-project-draft", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            projectDraftId: this.context.projectDraftId,
            institutionId: this.context.institutionId,
            projectTemplate: this.context.templateProjectId,
            useTemplatePlots: this.context.useTemplatePlots,
            useTemplateWidgets: this.context.useTemplateWidgets,
            ...this.buildDraftObject(),
          }),
        })
          .then((response) => Promise.all([response.ok, response.json()]))
          .then((data) => {
            if (data[0]) {
              this.context.setContextState({ successMessage: "Draft saved." });
              return Promise.resolve();
            } else {
              return Promise.reject(data[1]);
            }
          })
            .catch((message) => {
              this.setState ({modal: {alert: {alertType: "Create Draft Error", alertMessage: "Error creating draft:\n" + message}}});
          })
        );
      } else {
        this.context.processModal("Creating Draft", () =>
        fetch("/create-project-draft", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            institutionId: this.context.institutionId,
            projectTemplate: this.context.templateProjectId,
            useTemplatePlots: this.context.useTemplatePlots,
            useTemplateWidgets: this.context.useTemplateWidgets,
            ...this.buildDraftObject(),
          }),
        })
          .then((response) => Promise.all([response.ok, response.json()]))
          .then((data) => {
            if (data[0] && Number.isInteger(data[1].projectDraftId)) {
              this.context.setContextState(({ successMessage: "Draft saved.", projectDraftId: data[1].projectDraftId}));
              return Promise.resolve();
            } else {
              return Promise.reject(data[1]);
            }
          })
            .catch((message) => {
              this.setState ({modal: {alert: {alertType: "Draft Creation Error", alertMessage: "Error creating draft:\n" + message}}});
          })
        );
      }
    }

  updateSteps = (steps) => this.setState({ steps: steps });
  updateProjectType = (projectType) => {
    const privacyLevel = projectType === "simplified" ? "public" : "institution";
    this.setState({type: projectType},  () => {
      this.context.setProjectDetails({ type: projectType, plotDistribution: "simplified",
                                       sampleDistribution: "center", privacyLevel: privacyLevel});
      this.getTemplateProjects();
    });
  };

  getTemplateProjects = () =>
    fetch(`/get-template-projects?projectType=${this.state.type}`)
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
        this.setState ({modal: {alert: {alertType: "Project Template Error", alertMessage: "Error getting complete template info. See console for details."}}});
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
    } else if (this.context.numPlots) {
      return this.context.numPlots;
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
    return getErrors(this.context);
  };

  validateImagery = () => {
    const { privacyLevel, imageryId, institutionImagery, projectImageryList } = this.context;
    const requiresPublic =
      ["public", "users"].includes(privacyLevel) &&
      [...projectImageryList, imageryId].every((id) =>
        institutionImagery.some((il) => il.id === id && il.visibility === "private")
      );
    return getErrors({...this.context,
                      requiresPublic: requiresPublic});
  };

  validatePlotData = () => {
    const {
      projectId,
      plotDistribution,
      useTemplatePlots,
      originalProject,
    } = this.context;
    const totalPlots = this.getTotalPlots();
    const plotFileNeeded =
      !useTemplatePlots &&
      (projectId === -1 || plotDistribution !== originalProject.plotDistribution);
    
    return getErrors({...this.context,
                      totalPlots: totalPlots,
                      plotFileNeeded: plotFileNeeded});
  };

  validateSampleData = () => {
    const {
      originalProject,
      plotFileName,
      projectId,
      sampleDistribution,
      useTemplatePlots,
    } = this.context;
    const totalPlots = this.getTotalPlots();
    const samplesPerPlot = this.getSamplesPerPlot();
    const sampleFileNeeded =
      !useTemplatePlots &&
      (projectId === -1 ||
        sampleDistribution !== originalProject.sampleDistribution ||
        plotFileName);
    return getErrors({...this.context,
                      totalPlots: totalPlots,
                      samplesPerPlot: samplesPerPlot,
                      sampleFileNeeded: sampleFileNeeded});
  };

  allAnswersHidden = (answers) => {
    const hiddenAnswers = filterObject(answers, ([_id, ans]) => ans.hide);
    return lengthObject(answers) === lengthObject(hiddenAnswers);
  }

  validateSurveyQuestions = () => {
    return getErrors(this.context);
  };

  /// Changing Step

  getSteps = () => {
    const { projectId, originalProject } = this.context;
    return projectId === -1 || originalProject.availability === "unpublished"
      ? this.state.steps
      : filterObject(this.state.steps, ([key, _val]) =>
          ["overview", "imagery", "questions"].includes(key)
        );
  };

  checkAllSteps = () => {
    const validSteps = Object.entries(this.state.steps)
      .filter(([_key, val]) => val.validate().length === 0)
      .map(([key, _val]) => key);
    this.setState({ complete: new Set(validSteps) });
  };

  tryChangeStep = (newStep, alertUser = true) => {
    const errorList = this.state.steps[this.context.wizardStep].validate();
    this.setState({
      complete:
        errorList.length > 0
          ? removeFromSet(this.state.complete, this.context.wizardStep)
          : this.state.complete.add(this.context.wizardStep),
    });
    if (alertUser && errorList.length > 0) {
      this.setState ({modal: {alert: {alertType: "Change Step Error", alertMessage: errorList.join("\n")}}});
    } else {
      this.context.setContextState({ wizardStep: newStep });
    }
  };

  nextStep = () => {
    const stepKeys = Object.keys(this.state.steps);
    this.tryChangeStep(
      stepKeys[Math.min(stepKeys.length - 1, stepKeys.indexOf(this.context.wizardStep) + 1)]
    );
  };

  prevStep = () => {
    const stepKeys = Object.keys(this.state.steps);
    this.tryChangeStep(stepKeys[Math.max(0, stepKeys.indexOf(this.context.wizardStep) - 1)], false);
  };

  finish = () => {
    const failedStep = Object.entries(this.state.steps).find(([_key, val]) => {
      const errorList = val.validate();
      if (errorList.length > 0) {
        this.setState ({modal: {alert: {alertType: "Finish Project Error", alertMessage: errorList.join("\n")}}});
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
    const steps = this.state.steps;
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
    const steps = this.state.steps;
    const { description, StepComponent, helpDescription, StepHelpComponent } =
      steps[this.context.wizardStep];
    const isLast = last(Object.keys(steps)) === this.context.wizardStep;
    return (
      <div className="d-flex pb-5 full-height align-items-center flex-column" id="wizard">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});
                              this.state.modal.alert.onClose();}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
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
            <div className="bg-lightgreen w-100 py-1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem" }}>
              <h2 style={{ margin: 0, flexGrow: 1 }}>{description}</h2>
              {this.context.projectId < 0 && Object.keys(this.state.steps).indexOf(this.context.wizardStep) > 1 && (
                <button className="btn btn-secondary" onClick={this.saveDraft} style={{ marginLeft: "auto" }} title="Save Draft (Remains for 7 days)">
                  <div style={{ color: "white" }}>
                    <SvgIcon icon="save" size="1rem" />
                  </div>
                </button>
              )}
            </div>
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
