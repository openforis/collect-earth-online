import React from "react";

import {ImagerySelection} from "./ImagerySelection";
import {Overview, OverviewIntro} from "./Overview";
import {PlotDesign, PlotDesignReview} from "./PlotDesign";
import {SurveyQuestionDesign, SurveyQuestionHelp} from "./SurveyQuestions";
import {SurveyRuleDesign} from "./SurveyRules";
import AOIMap from "./AOIMap";
import {SampleDesign, SampleReview, SamplePreview} from "./SampleDesign";

import {SvgIcon} from "../utils/svgIcons";
import {mercator} from "../utils/mercator.js";
import {last, removeFromSet} from "../utils/generalUtils";
import {convertSampleValuesToSurveyQuestions} from "../utils/surveyUtils";
import {ProjectContext, plotLimit, perPlotLimit, sampleLimit} from "./constants";

export default class CreateProjectWizard extends React.Component {
    constructor(props) {
        super(props);

        this.steps = {
            overview: {
                title: "Project Overview",
                description: "General information about the project",
                StepComponent: () =>
                    <Overview
                        clearTemplateSelection={this.clearTemplateSelection}
                        setProjectTemplate={this.setProjectTemplate}
                        toggleTemplatePlots={this.toggleTemplatePlots}
                        templateProjectList={this.state.templateProjectList}
                    />,
                helpDescription: "Introduction",
                StepHelpComponent: OverviewIntro,
                validate: this.validateOverview,
            },
            imagery: {
                title: "Imagery Selection",
                description: "Imagery available to use during collection",
                StepComponent: ImagerySelection,
                helpDescription: "Imagery Preview",
                StepHelpComponent: () =>
                    <AOIMap
                        context={this.context}
                        canDrag={false}
                    />,
                validate: this.validateImagery,
            },
            plots: {
                title: "Plot Design",
                description: "Area of interest and plot generation for collection",
                StepComponent: () => this.context.useTemplatePlots
                    ? <PlotDesignReview/>
                    : (
                        <PlotDesign
                            getTotalPlots={this.getTotalPlots}
                            boundary={this.context.boundary}
                        />
                    ),
                helpDescription: "Collection Map Preview",
                StepHelpComponent: () =>
                    <AOIMap
                        context={this.context}
                        canDrag={!this.context.useTemplatePlots}
                    />,
                validate: this.validatePlotData,
            },
            samples: {
                title: "Sample Design",
                description: "Sample generation for collection",
                StepComponent: () => this.context.useTemplatePlots
                    ? <SampleReview/>
                    : (
                        <SampleDesign
                            getTotalPlots={this.getTotalPlots}
                            getSamplesPerPlot={this.getSamplesPerPlot}
                        />
                    ),
                helpDescription: "Collection Map Preview",
                StepHelpComponent: SamplePreview,
                validate: this.validateSampleData,
            },
            questions: {
                title: "Survey Questions",
                description: "Questions to be answered during collection",
                StepComponent: SurveyQuestionDesign,
                helpDescription: "Question Preview",
                StepHelpComponent: SurveyQuestionHelp,
                validate: this.validateSurveyQuestions,
            },
            rules: {
                title: "Survey Rules",
                description: "Rules to ensure correct answers",
                StepComponent: SurveyRuleDesign,
                helpDescription: "Question Preview",
                StepHelpComponent: SurveyQuestionHelp,
                validate: () => [],
            },
        };

        this.state = {
            step: "overview",
            complete: new Set(),
            templateProject: {},
            templatePlots: [],
            templateProjectList: [{id: -1, name: "Loading..."}],
        };
    }

    /// Lifecycle Methods

    componentDidMount() {
        this.getTemplateProjects();
        if (this.context.name !== "" || this.context.description !== "") this.checkAllSteps();
    }

    /// API Calls

    getTemplateProjects = () =>
        fetch("/get-template-projects")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({templateProjectList: data}))
            .catch(response => {
                console.log(response);
                this.setState({templateProjectList: [{id: -1, name: "Failed to load"}]});
            });

    getTemplateProject = (projectId) =>
        Promise.all([this.getTemplateById(projectId),
                     this.getProjectPlots(projectId),
                     this.getProjectImagery(projectId)])
            .then(() => this.context.setProjectDetails({templateProjectId: projectId}))
            .catch(response => {
                console.log(response);
                this.setState({templatePlots: [], templateProject: {}});
                this.context.setProjectDetails({templateProjectId: -1});
                alert("Error getting complete template info. See console for details.");
            });

    getTemplateById = (projectId) =>
        fetch(`/get-template-by-id?projectId=${projectId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                this.setState({templateProject: {...data, surveyQuestions: newSurveyQuestions}});
                this.context.setProjectDetails({
                    ...data,
                    surveyQuestions: newSurveyQuestions,
                    templateProjectId: projectId,
                    useTemplatePlots: true,
                    useTemplateWidgets: true,
                }, this.checkAllSteps);
            })
            .catch(error => {
                console.log(error);
                Promise.reject("Get project info failed.");
            });

    getProjectPlots = (projectId) =>
        fetch(`/get-project-plots?projectId=${projectId}&max=300`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setState({templatePlots: data});
                this.context.setProjectDetails({plots: data});
            })
            .catch(error => {
                console.log(error);
                Promise.reject("Error retrieving plot list. See console for details.");
            });

    // TODO: just return with the project info because we only need the integer ID
    getProjectImagery = (projectId) =>
        fetch("/get-project-imagery?projectId=" + projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const institutionImageryIds = this.context.institutionImagery.map(i => i.id);
                this.context.setProjectDetails({
                    projectImageryList: data.map(i => i.id).filter(id => institutionImageryIds.includes(id)),
                });
            })
            .catch(error => {
                console.log(error);
                Promise.reject("Error retrieving imagery list. See console for details.");
            });

    /// Validations

    getTotalPlots = () => {
        if (this.context.plotDistribution === "random"
            && this.context.numPlots) {
            return this.context.numPlots;
        } else if (this.context.plotDistribution === "gridded"
                    && this.context.plotSize
                    && this.context.plotSpacing) {
            const boundaryExtent = mercator.parseGeoJson(this.context.boundary, true).getExtent();
            const buffer = this.context.plotSize;
            const xRange = boundaryExtent[2] - boundaryExtent[0] - buffer;
            const yRange = boundaryExtent[3] - boundaryExtent[1] - buffer;
            const xSteps = Math.floor(xRange / this.context.plotSpacing) + 1;
            const ySteps = Math.floor(yRange / this.context.plotSpacing) + 1;
            return xSteps * ySteps;
        } else {
            return 0;
        }
    };

    getSamplesPerPlot = () => {
        if (this.context.sampleDistribution === "random"
            && this.context.samplesPerPlot) {
            return this.context.samplesPerPlot;
        } else if (this.context.sampleDistribution === "gridded"
            && this.context.plotSize
            && this.context.sampleResolution) {
            const steps = Math.floor(this.context.plotSize / this.context.sampleResolution) + 1;
            return steps * steps;
        } else if (this.context.sampleDistribution === "center") {
            return 1;
        } else {
            return 0;
        }
    };

    validateOverview = () => {
        const {name, description} = this.context;
        const errorList = [
            (name === "" || description === "") && "A project must contain a name and description.",
        ];
        return errorList.filter(e => e);
    };

    validateImagery = () => {
        const {privacyLevel, imageryId, institutionImagery, projectImageryList} = this.context;
        const requiresPublic = ["public", "users"].includes(privacyLevel)
            && [...projectImageryList, imageryId]
                .every(id => institutionImagery.some(il => il.id === id && il.visibility === "private"));
        const errorList = [
            requiresPublic
                && `Projects with privacy level of ${privacyLevel} require at least one public imagery.`,
            imageryId <= 0
                && "Select a valid Basemap.",
        ];
        return errorList.filter(e => e);
    };

    validatePlotData = () => {
        const {
            boundary,
            plotDistribution,
            numPlots,
            plotSpacing,
            plotSize,
            plotFileName,
            useTemplatePlots,
        } = this.context;
        const totalPlots = this.getTotalPlots();
        const errorList = [
            (["random", "gridded"].includes(plotDistribution) && !boundary)
                && "Please select a valid boundary.",
            (plotDistribution === "random" && (!numPlots || numPlots === 0))
                && "A number of plots is required for random plot distribution.",
            (plotDistribution === "gridded" && (!plotSpacing || plotSpacing === 0))
                && "A plot spacing is required for gridded plot distribution.",
            (plotDistribution !== "shp" && (!plotSize || plotSize === 0))
                && "A plot size is required.",
            (plotDistribution === "csv" && !useTemplatePlots && !(plotFileName && plotFileName.includes(".csv")))
                && "A plot CSV (.csv) file is required.",
            (plotDistribution === "shp" && !useTemplatePlots && !(plotFileName && plotFileName.includes(".zip")))
                && "A plot SHP (.zip) file is required.",
            (totalPlots > plotLimit)
                && "The plot or sample size limit has been exceeded. Check the Plot Design section for detailed info.",
        ];
        return errorList.filter(e => e);
    };

    validateSampleData = () => {
        const {
            plotSize,
            sampleDistribution,
            sampleResolution,
            plotShape,
            sampleFileName,
            useTemplatePlots,
        } = this.context;
        const totalPlots = this.getTotalPlots();
        const samplesPerPlot = this.getSamplesPerPlot();
        const errorList = [
            (sampleDistribution === "random" && (!samplesPerPlot || samplesPerPlot === 0))
                && "A number of samples per plot is required for random sample distribution.",
            (sampleDistribution === "gridded" && (!sampleResolution || sampleResolution === 0))
                && "A sample spacing is required for gridded sample distribution.",
            (sampleDistribution === "csv" && !useTemplatePlots && !(sampleFileName && sampleFileName.includes(".csv")))
                && "A sample CSV (.csv) file is required.",
            (sampleDistribution === "shp" && !useTemplatePlots && !(sampleFileName && sampleFileName.includes(".zip")))
                && "A sample SHP (.zip) file is required.",
            (sampleDistribution === "gridded"
                && plotShape === "circle"
                && sampleResolution >= plotSize / Math.sqrt(2))
                && "The sample spacing must be less than plot diameter divided by the square root of 2.",
            (sampleDistribution === "gridded"
                && plotShape === "square"
                && sampleResolution >= plotSize)
                && "The sample spacing must be less than the plot width.",
            (samplesPerPlot > perPlotLimit || (totalPlots * samplesPerPlot) > sampleLimit)
                && "The sample size limit has been exceeded. Check the Sample Design section for detailed info.",
        ];
        return errorList.filter(e => e);
    };

    validateSurveyQuestions = () => {
        const {surveyQuestions} = this.context;
        const errorList = [
            (surveyQuestions.length === 0)
                && "A survey must include at least one question.",
            (surveyQuestions.some(sq => sq.answers.length === 0))
                && "All survey questions must contain at least one answer.",
        ];
        return errorList.filter(e => e);
    };

    /// Changing Step

    getSteps = () => this.context.projectId > 0
        ? {
            overview: this.steps.overview,
            questions: this.steps.questions,
            rules: this.steps.rules,
        }
        : this.steps;

    checkAllSteps = () => {
        const validSteps = Object.entries(this.getSteps())
            .filter(([key, val]) => val.validate().length === 0)
            .map(([key, val]) => key);
        this.setState({complete: new Set(validSteps)});
    };

    tryChangeStep = (newStep, alertUser = true) => {
        const errorList = this.getSteps()[this.state.step].validate();
        this.setState({
            complete: errorList.length > 0
                ? removeFromSet(this.state.complete, this.state.step)
                : this.state.complete.add(this.state.step),
        });
        if (alertUser && errorList.length > 0) {
            alert(errorList.join("\n"));
        } else {
            this.setState({step: newStep});
        }
    };

    nextStep = () => {
        const stepKeys = Object.keys(this.getSteps());
        this.tryChangeStep(stepKeys[Math.min(stepKeys.length - 1, stepKeys.indexOf(this.state.step) + 1)]);
    };

    prevStep = () => {
        const stepKeys = Object.keys(this.getSteps());
        this.tryChangeStep(stepKeys[Math.max(0, stepKeys.indexOf(this.state.step) - 1)], false);
    };

    finish = () => {
        const failedStep = Object.entries(this.getSteps())
            .find(([key, val]) => {
                const errorList = val.validate();
                if (errorList.length > 0) {
                    alert(errorList.join("\n"));
                    return true;
                } else {
                    return false;
                }
            });
        if (failedStep) {
            this.setState({step: failedStep[0]});
        } else {
            this.context.setContextState({designMode: "review"});
        }
    };

    /// Template handling

    clearTemplateSelection = () => {
        this.context.resetProject({imageryId: this.context.institutionImagery[0].id});
        this.setState({
            templateProject: {},
            templatePlots: [],
            complete: new Set(),
        });
    };

    setProjectTemplate = (newTemplateId) => {
        this.context.processModal("Loading Template Information",
                                  () => this.getTemplateProject(newTemplateId));
    };

    toggleTemplatePlots = () => {
        if (this.context.useTemplatePlots) {
            this.context.setProjectDetails({useTemplatePlots: false, plots: []});
        } else {
            this.context.setProjectDetails({
                useTemplatePlots: true,
                plots: this.state.templatePlots,
                boundary: this.state.templateProject.boundary,
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

    /// Render Functions

    renderStep = (stepName) => {
        const steps = this.getSteps();
        const isLast = last(Object.keys(steps)) === stepName;
        const isSelected = stepName === this.state.step;
        const stepComplete = this.state.complete.has(stepName);
        const stepColor = isSelected ? "blue" : stepComplete ? "green" : "gray";
        return (
            <div
                id={stepName + "-button"}
                style={{width: "10rem", display: "flex", flexDirection: "column", alignItems: "center"}}
                key={stepName}
                title={steps[stepName].description}
                onClick={() => this.tryChangeStep(stepName, false)}
            >
                {isLast
                ? <div style={{border: "2px solid transparent"}}/>
                : (
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
                        height: "2.5rem",
                        width: "2.5rem",
                        padding: "calc((2.5rem - 1.25rem) / 2)",
                    }}
                >
                    {stepComplete && <SvgIcon icon="check" size="1.25rem" color="white"/>}
                </div>
                <label style={{color: stepColor, fontWeight: "bold"}}>
                    {steps[stepName].title}
                </label>
            </div>
        );
    };

    render() {
        const steps = this.getSteps();
        const {description, StepComponent, helpDescription, StepHelpComponent} = steps[this.state.step];
        const isLast = last(Object.keys(steps)) === this.state.step;
        return (
            <div
                id="wizard"
                className="d-flex pb-5 full-height align-items-center flex-column"
            >
                <div style={{display: "flex", margin: ".75rem"}}>
                    {Object.keys(steps).map(s => this.renderStep(s))}
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
                        style={{border: "1px solid black", borderRadius: "6px"}}
                    >
                        <h2 className="bg-lightgreen w-100 py-1">{description}</h2>
                        <div className="p-3">
                            <StepComponent/>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="d-flex flex-column h-100">
                            <div
                                className="h-100 overflow-auto bg-lightgray"
                                style={{border: "1px solid black", borderRadius: "6px"}}
                            >
                                <h2 className="bg-lightgreen w-100 py-1">{helpDescription}</h2>
                                <StepHelpComponent/>
                            </div>
                            <NavigationButtons
                                nextStep={isLast ? this.finish : this.nextStep}
                                prevStep={this.prevStep}
                                canFinish={Object.keys(steps).length === this.state.complete.size || isLast}
                                finish={this.finish}
                                cancel={() => {
                                    if (this.context.projectId > 0) {
                                        this.context.setContextState({designMode: "manage"});
                                    } else {
                                        window.location = `/review-institution?institutionId=${this.context.institutionId}`;
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
CreateProjectWizard.contextType = ProjectContext;

function NavigationButtons({prevStep, nextStep, finish, canFinish, cancel}) {
    return (
        <div>
            <div id="navigation-buttons">
                <div className="d-flex flex-row justify-content-around mt-2">
                    <input
                        className="btn btn-lightgreen"
                        type="button"
                        value="Back"
                        onClick={prevStep}
                    />
                    <input
                        className="btn btn-lightgreen"
                        type="button"
                        value="Next"
                        onClick={nextStep}
                    />
                    <input
                        className="btn btn-lightgreen"
                        type="button"
                        value="Review"
                        disabled={!canFinish}
                        onClick={finish}
                    />
                    <input
                        className="btn btn-red"
                        type="button"
                        value="Cancel"
                        onClick={cancel}
                    />
                </div>
            </div>
        </div>
    );
}
