import React from "react";
import ReactDOM from "react-dom";

import {ProjectContext} from "./project/ProjectContext";
import {LoadingModal, NavigationBar} from "./components/PageComponents";
import {CreateProjectWizard} from "./project/CreateProjectWizard";
import {ReviewChanges} from "./project/ReviewChanges";
import {ReviewProject} from "./project/ReviewProject";
import {convertSampleValuesToSurveyQuestions} from "./utils/surveyUtils";


class Project extends React.Component {
    constructor(props) {
        super(props);

        this.blankProject = {
            id: -1,
            institution: -1,
            availability: "nonexistent",
            name: "",
            description: "",
            projectOptions: {
                showGEEScript: false,
                showPlotInformation: false,
                autoLaunchGeoDash: true,
            },
            privacyLevel: "institution",
            plotDistribution: "random",
            imageryId: -1,
            boundary: null,
            numPlots: "",
            plotSpacing: "",
            plotShape: "square",
            plotSize: "",
            sampleDistribution: "random",
            sampleResolution: "",
            samplesPerPlot: "",
            allowDrawnSamples: false,
            surveyQuestions: [],
            surveyRules: [],
            templateProjectId: -1,
            useTemplateWidgets: false,
            useTemplatePlots: false,
            projectImageryList: [],
            plotsForPreview: [], // Will need to add the AOI map to sample selection for this to be useful
        };

        this.modes = {
            wizard: CreateProjectWizard,
            changes: ReviewChanges,
            project: ReviewProject,
            none: () => null,
        };

        this.state = {
            projectDetails: this.blankProject,
            institutionImagery: [],
            designMode: "none",
        };
    }

    /// Lifecycle Methods

    // TODO: Consider pulling uri to see which mode to start in.
    // TODO: Consider include institutionId for review project to allow for parallel API calls
    componentDidMount() {
        if (this.props.projectId > 0) {
            this.setState({designMode: "project"});
            this.getProjectById(this.props.projectId);
            this.getProjectImagery(this.props.projectId);
        } else if (this.props.institutionId > 0) {
            this.setState({designMode: "wizard"});
            this.getInstitutionImagery(this.props.institutionId);
        } else {
            alert("Invalid URL.");
            window.location = "/home";
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.plotDistribution !== prevState.plotDistribution) {
            const {plotDistribution, sampleDistribution} = this.state;
            const newSampleDistribution = ["random", "gridded"].includes(plotDistribution)
                && ["csv", "shp"].includes(sampleDistribution) ? "random"
                : plotDistribution === "shp"
                        && ["random", "gridded"].includes(sampleDistribution) ? "shp"
                    : sampleDistribution;
            if (newSampleDistribution !== sampleDistribution) this.setState({sampleDistribution: newSampleDistribution});
        }
    }

    /// Updating State

    setProjectState = (newValue, callBack = () => null) =>
        this.setState({projectDetails: {...this.state.projectDetails, ...newValue}}, callBack);

    resetProject = () => this.setState({projectDetails: this.blankProject});

    setDesignMode = (newMode) => this.setState({designMode: newMode})

    /// API Calls

    getProjectById = (projectId) => fetch(`/get-project-by-id?projectId=${projectId}`)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data === "") {
                alert("No project found with ID " + projectId + ".");
                window.location = "/home";
            } else {
                this.getInstitutionImagery(data.institution);
                const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                this.setProjectState({...data, surveyQuestions: newSurveyQuestions});
            }
        })
        .catch(response => {
            console.log(response);
            alert("Error retrieving the project info. See console for details.");
        });

    // TODO: just return with the project info
    getProjectImagery = (projectId) => fetch("/get-project-imagery?projectId=" + projectId)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            this.setProjectState({projectImageryList: data});
        })
        .catch(response => {
            this.setProjectState({projectImageryList: []});
            console.log("Error retrieving the project imagery list: ", response);
        });

    getInstitutionImagery = (institutionId) => fetch(`/get-institution-imagery?institutionId=${institutionId}`)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            const sorted = [...data.filter(a => a.title.toLocaleLowerCase().includes("mapbox")),
                            ...data.filter(a => !a.title.toLocaleLowerCase().includes("mapbox"))];
            this.setState({institutionImagery: sorted});
            this.setProjectState({imageryId: sorted[0].id});
        })
        .catch(response => {
            console.log(response);
            alert("Error retrieving the imagery list. See console for details.");
        });

    /// Functions

    processModal = (message, callBack) => {
        this.setState({modalMessage: message},
                      () => callBack.call(this)
                          .finally(() => this.setState({modalMessage: null})));
    }

    render() {
        const CurrentComponent = this.modes[this.state.designMode];
        return (
            <ProjectContext.Provider
                value={{
                    ...this.state.projectDetails,
                    designMode:this.state.designMode,
                    institutionImagery: this.state.institutionImagery,
                    institutionId: this.props.institutionId,
                    projectId: this.props.projectId,
                    setProjectState: this.setProjectState,
                    setDesignMode: this.setDesignMode,
                    resetProject: this.resetProject,
                    processModal: this.processModal,
                }}
            >
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
                <div>
                    <CurrentComponent/>
                </div>
            </ProjectContext.Provider>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Project
                institutionId={parseInt(args.institutionId) || -1}
                projectId={parseInt(args.projectId) || -1}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
