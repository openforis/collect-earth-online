import React from "react";
import {ProjectContext} from "./ProjectContext";
import {ImagerySelection} from "./ImagerySelection";
import {Overview} from "./Overview";
import {PlotDesign} from "./PlotDesign";
import {SurveyQuestionDesign} from "./SurveyQuestions";
import {SurveyRuleDesign} from "./SurveyRules";
import {SvgIcon} from "../utils/svgIcons";
import {mercator} from "../utils/mercator.js";
import {last, removeFromSet} from "../utils/generalUtils";
import {plotLimit, perPlotLimit, sampleLimit} from "./constants";
import {AOIMap} from "./AOIMap";
import {convertSampleValuesToSurveyQuestions} from "../utils/surveyUtils";
import {SampleDesign} from "./SampleDesign";

export class CreateProjectWizard extends React.Component {
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
                        templateProjectList={this.state.templateProjectList}
                    />,
                helpDescription: "Introduction",
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
                StepComponent: () =>
                    <PlotDesign
                        getTotalPlots={this.getTotalPlots}
                        boundary={this.context.boundary}
                    />,
                helpDescription: "Collection Map Preview",
                StepHelpComponent: () =>
                    <AOIMap
                        context={this.context}
                        canDrag
                    />,
                validate: this.validatePlotData,
            },
            samples: {
                title: "Sample Design",
                description: "Sample generation for collection",
                StepComponent: () =>
                    <SampleDesign
                        getTotalPlots={this.getTotalPlots}
                        getSamplesPerPlot={this.getSamplesPerPlot}
                    />,
                helpDescription: "Collection Map Preview",
                StepHelpComponent: () =>
                    <AOIMap
                        context={this.context}
                        canDrag
                    />,
                validate: this.validateSampleData,
            },
            questions: {
                title: "Survey Questions",
                description: "Questions to be answered during collection",
                StepComponent: SurveyQuestionDesign,
                helpDescription: "Question Preview",
                validate: this.validateSurveyQuestions,
            },
            rules: {
                title: "Survey Rules",
                description: "Rules to ensure correct answers",
                StepComponent: SurveyRuleDesign,
                helpDescription: "Question Preview",
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
        this.getProjectList();
        this.checkAllSteps();
    }

    /// API Calls

    getProjectList = () => {
        fetch("/get-template-projects")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({templateProjectList: data}))
            .catch(response => {
                console.log(response);
                this.setState({templateProjectList: [{id: -1, name: "Failed to load"}]});
            });
    };

    getTemplateProject = (projectId) => {
        Promise.all([this.getTemplateById(projectId), this.getProjectPlots(projectId), this.getProjectImagery(projectId)])
            .catch(response => {
                console.log(response);
                alert("Error getting template info. See console for details.");
            });
    }

    getTemplateById = (projectId) => {
        fetch(`/get-template-by-id?projectId=${projectId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                if (data === "") {
                    this.setState({templateProject: {}});
                    Promise.reject("Get project info failed.");
                } else {
                    const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                    this.setState({templateProject: {...data, surveyQuestions: newSurveyQuestions}});
                    this.context.setProjectState({
                        ...data,
                        surveyQuestions: newSurveyQuestions,
                        templateProjectId: projectId,
                        useTemplatePlots: true,
                        useTemplateWidgets: true,
                    }, this.checkAllSteps);
                }
            });
    };

    getProjectPlots = (projectId) => {
        fetch(`/get-project-plots?projectId=${projectId}&max=300`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setState({templatePlots: data});
                this.context.setProjectState({plots: data});
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot list. See console for details.");
            });
    };

    // TODO: just return with the project info because we only need the integer ID
    // TODO: Test with project from different institution
    getProjectImagery = (projectId) => {
        fetch("/get-project-imagery?projectId=" + projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                if (data === "") {
                    this.setState({projectImageryList: []});
                    Promise.reject("Get project imagery failed.");
                } else {
                    this.setState({projectImageryList: data.map(imagery => imagery.id)});

                }
            });
    };

    /// Validations

    getTotalPlots = () => {
        if (this.context.plotDistribution === "random"
            && this.context.numPlots) {
            return Number(this.context.numPlots);
        } else if (this.context.plotDistribution === "gridded"
                    && this.context.plotSize
                    && this.context.plotSpacing) {
            const boundaryExtent = mercator.parseGeoJson(this.context.boundary, true).getExtent();
            const buffer = Number(this.context.plotSize);
            const xRange = boundaryExtent[2] - boundaryExtent[0] - buffer;
            const yRange = boundaryExtent[3] - boundaryExtent[1] - buffer;

            const xSteps = Math.floor(xRange / this.context.plotSpacing) + 1;
            const ySteps = Math.floor(yRange / this.context.plotSpacing) + 1;
            return xSteps * ySteps;
        } else {
            return 0;
        }
    };

    // TODO, this does not account for less samples in a circle plot
    getSamplesPerPlot = () => {
        if (this.context.sampleDistribution === "random"
            && this.context.samplesPerPlot) {
            return Number(this.context.samplesPerPlot);
        } else if (this.context.sampleDistribution === "gridded"
            && this.context.plotSize
            && this.context.sampleResolution) {
            const steps = Math.floor(Number(this.context.plotSize) / Number(this.context.sampleResolution)) + 1;
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
            requiresPublic && `Projects with privacy level of ${privacyLevel} require at least one public imagery.`,
            !imageryId > 0 && "Select a valid Basemap.",
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
        } = this.context;
        const totalPlots = this.getTotalPlots();
        const errorList = [
            (["random", "gridded"].includes(plotDistribution) && !boundary)
                && "Please select a valid boundary",
            (plotDistribution === "random" && (!numPlots || numPlots === 0))
                && "A number of plots is required for random plot distribution.",
            (plotDistribution === "gridded" && (!plotSpacing || plotSpacing === 0))
                && "A plot spacing is required for gridded plot distribution.",
            (plotDistribution !== "shp" && (!plotSize || plotSize === 0))
                && "A plot size is required.",
            (plotDistribution === "csv" && !(plotFileName && plotFileName.includes(".csv")))
                && "A plot CSV (.csv) file is required.",
            (plotDistribution === "shp" && !(plotFileName && plotFileName.includes(".zip")))
                && "A plot SHP (.zip) file is required.",
            (totalPlots > plotLimit)
                && "The plot or sample size limit exceeded. Check the Sample Design section for detailed info.",
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
        } = this.context;
        const totalPlots = this.getTotalPlots();
        const samplesPerPlot = this.getSamplesPerPlot();
        const errorList = [
            (sampleDistribution === "random" && (!samplesPerPlot || samplesPerPlot === 0))
                && "A number of samples per plot is required for random sample distribution.",
            (sampleDistribution === "gridded" && (!sampleResolution || sampleResolution === 0))
                && "A sample spacing is required for gridded sample distribution.",
            (sampleDistribution === "csv" && !(sampleFileName && sampleFileName.includes(".csv")))
                && "A sample CSV (.csv) file is required.",
            (sampleDistribution === "shp" && !(sampleFileName && sampleFileName.includes(".zip")))
                && "A sample SHP (.zip) file is required.",
            (sampleDistribution === "gridded"
                && plotShape === "circle"
                && sampleResolution >= plotSize / Math.sqrt(2))
                && "The sample spacing must be less than plot diameter divided by the square root of 2.",
            (sampleDistribution === "gridded"
                && plotShape === "square"
                && parseInt(sampleResolution) >= plotSize)
                && "The sample spacing must be less than the plot width.",
            (samplesPerPlot > perPlotLimit || (totalPlots * samplesPerPlot) > sampleLimit)
                && "The sample size limit exceeded. Check the Sample Design section for detailed info.",
        ];
        return errorList.filter(e => e);
    };

    validateSurveyQuestions = () => {
        const {surveyQuestions} = this.context;
        const errorList = [
            (surveyQuestions.length === 0) && "A survey must include at least one question.",
            (surveyQuestions.some(sq => sq.answers.length === 0)) && "All survey questions must contain at least one answer.",
        ];
        return errorList.filter(e => e);
    };

    /// Changing Step

    checkAllSteps = () =>
        Object.entries(this.steps).forEach(([key, val]) =>
            this.setState({
                complete: val.validate.call(this).length > 0
                    ? removeFromSet(this.state.complete, key)
                    : this.state.complete.add(key),
            })
        )


    tryChangeStep = (newStep, alertUser = true) => {
        const dev = false;
        const errorList = this.steps[this.state.step].validate.call(this);
        this.setState({
            complete: errorList.length > 0
                ? removeFromSet(this.state.complete, this.state.step)
                : this.state.complete.add(this.state.step),
        });
        if (alertUser && !dev && errorList.length > 0) {
            alert(errorList.join("\n"));
        } else {
            this.setState({step: newStep});
        }
    };

    nextStep = () => {
        const stepKeys = Object.keys(this.steps);
        this.tryChangeStep(stepKeys[Math.min(stepKeys.length - 1, stepKeys.indexOf(this.state.step) + 1)]);
    }

    prevStep = () => {
        const stepKeys = Object.keys(this.steps);
        this.tryChangeStep(stepKeys[Math.max(0, stepKeys.indexOf(this.state.step) - 1)], false);
    }

    finish = () => {
        const failedStep = Object.entries(this.steps).find(([key, val]) => val.validate.call(this).length > 0);
        if (failedStep) {
            this.setState({step: failedStep[0]});
        } else {
            this.context.setDesignMode("changes");
        }
    }

    /// Template handling

    clearTemplateSelection = () => {
        this.context.resetProject();
        this.context.setProjectState({imageryId: this.context.institutionImagery[0].id});
        this.setState({templateProject: {}, complete: new Set()});
    }

    // TODO: I dont think we need a wraper function here
    setProjectTemplate = (newTemplateId) => {
        this.getTemplateProject(newTemplateId);
    };

    toggleTemplatePlots = () => {
        if (!this.state.useTemplatePlots) {
            const templateProject = this.state.projectList.find(p => p.id === this.state.projectDetails.id);
            this.setState({
                useTemplatePlots: true,
                // When user re-selects use template plots, revert project plot design values back to template but keep other data.
                projectDetails: {
                    ...this.state.projectDetails,
                    boundary: templateProject.boundary,
                    numPlots: templateProject.numPlots,
                    plotDistribution: templateProject.plotDistribution,
                    plotShape: templateProject.plotShape,
                    plotSize: templateProject.plotSize,
                    plotSpacing: templateProject.plotSpacing,
                    sampleDistribution: templateProject.sampleDistribution,
                    sampleResolution: templateProject.sampleResolution,
                    samplesPerPlot: templateProject.samplesPerPlot,
                },
            });
        } else {
            this.setState({useTemplatePlots: false});
        }
    };

    toggleTemplatePlots = () => {
        if (this.context.useTemplatePlots) {
            this.context.setProjectState({useTemplatePlots: false, plots: []});
        } else {
            this.context.setProjectState({
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
        const isLast = last(Object.keys(this.steps)) === stepName;
        const isSelected = stepName === this.state.step;
        const stepComplete = this.state.complete.has(stepName);
        const stepColor = isSelected ? "blue" : stepComplete ? "green" : "gray";
        return (
            <div
                id={stepName + "-button"}
                style={{width: "10rem", display: "flex", flexDirection: "column", alignItems: "center"}}
                key={stepName}
                title={this.steps[stepName].description}
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
                    {this.steps[stepName].title}
                </label>
            </div>
        );
    }

    renderStepBar = () => (
        <div style={{display: "flex", margin: ".75rem"}}>
            {Object.keys(this.steps).map(s => this.renderStep(s))}
        </div>
    );

    render() {
        const {description, StepComponent, helpDescription, StepHelpComponent} = this.steps[this.state.step];
        const isLast = last(Object.keys(this.steps)) === this.state.step;
        return (
            <div
                id="wizard"
                className="d-flex pb-5 full-height align-items-center flex-column"
            >
                {this.renderStepBar()}
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
                        className="col-7 px-0 mr-2 overflow-auto"
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
                                className="h-100 overflow-auto"
                                style={{border: "1px solid black", borderRadius: "6px"}}
                            >
                                <h2 className="bg-lightgreen w-100 py-1">{helpDescription}</h2>
                                {StepHelpComponent && <StepHelpComponent/>}
                            </div>
                            <NavigationButtons
                                nextStep={isLast ? this.finish : this.nextStep}
                                prevStep={this.prevStep}
                                canFinish={Object.keys(this.steps).length === this.state.complete.size || isLast}
                                finish={this.finish}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
CreateProjectWizard.contextType = ProjectContext;

function NavigationButtons({prevStep, nextStep, finish, canFinish}) {
    return (
        <div>
            <div id="project-management">
                <div className="d-flex flex-row justify-content-around mt-2">
                    <input
                        type="button"
                        className="btn bg-lightgreen"
                        value="Back"
                        onClick={prevStep}
                    />
                    <input
                        type="button"
                        className="btn bg-lightgreen"
                        value="Next"
                        onClick={nextStep}
                    />
                    <input
                        type="button"
                        className="btn bg-lightgreen"
                        value="Review"
                        disabled={!canFinish}
                        onClick={finish}
                    />
                </div>
            </div>
        </div>
    );
}
