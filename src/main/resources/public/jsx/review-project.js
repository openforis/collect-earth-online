import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";
import { ProjectInfo, ProjectAOI, PlotReview, SampleReview, ProjectOptions } from "./components/ProjectComponents";
import SurveyCardList from "./components/SurveyCardList";
import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: {},
            imageryList: [],
            mapConfig: null,
            plotList: [],
            coordinates: {
                lonMin: "",
                latMin: "",
                lonMax: "",
                latMax: "",
            },
        };
    }

    componentDidMount() {
        this.getProjectById();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.projectDetails.id
                && this.state.projectDetails !== prevState.projectDetails) {
            this.getImageryList();
            this.getProjectPlots();
        }

        if (this.state.projectDetails.imageryId && this.state.imageryList.length > 0
                && prevState.imageryList.length === 0) {
            this.initProjectMap();
        }

        if (this.state.mapConfig && this.state.projectDetails.imageryId !== prevState.projectDetails.imageryId) {
            const baseMap = this.state.imageryList.find(imagery => imagery.id === this.state.projectDetails.imageryId);
            mercator.setVisibleLayer(this.state.mapConfig, baseMap.title);
        }

        if (this.state.mapConfig && this.state.mapConfig !== prevState.mapConfig) {
            this.showProjectMap();
        }

        if (this.state.mapConfig && this.state.plotList.length > 0
                && (!prevState.mapConfig || prevState.plotList.length === 0)) {
            mercator.addPlotOverviewLayers(
                this.state.mapConfig, this.state.plotList,
                this.state.projectDetails.plotShape
            );
        }

    }

    updateProject = () => {
        if (this.validateProject() && confirm("Do you REALLY want to update this project?")) {

            fetch(this.props.documentRoot + "/update-project",
                  {
                      method: "POST",
                      contentType: "application/json; charset=utf-8",
                      body: JSON.stringify({
                          projectId: this.state.projectDetails.id,
                          imageryId: this.state.projectDetails.imageryId,
                          description: this.state.projectDetails.description,
                          name: this.state.projectDetails.name,
                          privacyLevel: this.state.projectDetails.privacyLevel,
                          projectOptions: this.state.projectDetails.projectOptions,
                      }),
                  })
                .then(response => {
                    if (!response.ok) {
                        console.log(response);
                        alert("Error updating project. See console for details.");
                    } else {
                        alert("Project successfully updated!");
                    }
                });
        }
    };

    validateProject = () => {
        const { projectDetails } = this.state;
        if (projectDetails.name === "" || projectDetails.description === "") {
            alert("A project must contain a name and description.");
            return false;
        } else {
            return true;
        }
    };

    publishProject = () => {
        if (confirm("Do you REALLY want to publish this project?")) {
            fetch(this.props.documentRoot + "/publish-project?projectId=" + this.state.projectDetails.id,
                  {
                      method: "POST",
                  }
            )
                .then(response => {
                    if (response.ok) {
                        this.setState({ projectDetails: { ...this.state.projectDetails, availability: "published" }});
                    } else {
                        console.log(response);
                        alert("Error publishing project. See console for details.");
                    }
                });
        }
    };

    closeProject = () => {
        if (confirm("Do you REALLY want to close this project?")) {
            fetch(this.props.documentRoot + "/close-project?projectId=" + this.state.projectDetails.id,
                  {
                      method: "POST",
                  })
                .then(response => {
                    if (response.ok) {
                        this.setState({ projectDetails: { ...this.state.projectDetails, availability: "closed" }});
                    } else {
                        console.log(response);
                        alert("Error closing project. See console for details.");
                    }
                });
        }
    };

    archiveProject = () => {
        if (confirm("Do you REALLY want to delete this project? This operation cannot be undone.")) {
            fetch(this.props.documentRoot + "/archive-project?projectId=" + this.state.projectDetails.id,
                  {
                      method: "POST",
                  })
                .then(response => {
                    if (response.ok) {
                        alert("Project " + this.state.projectDetails.id + " has been deleted.");
                        window.location = this.props.documentRoot + "/home";
                    } else {
                        console.log(response);
                        alert("Error deleting project. See console for details.");
                    }
                });
        }
    };

    changeAvailability = () => {
        if (this.state.projectDetails.availability === "unpublished") {
            this.publishProject();
        } else if (this.state.projectDetails.availability === "published") {
            this.closeProject();
        } else if (this.state.projectDetails.availability === "closed") {
            this.archiveProject();
        }
    };

    configureGeoDash = () => {
        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(
                this.props.documentRoot + "/widget-layout-editor?editable=true&"
                + encodeURIComponent(
                    "institutionId=" + this.state.projectDetails.institution
                    + "&projectId=" + this.state.projectDetails.id
                ),
                "_geo-dash");
        }
    };

    downloadPlotData = () => {
        window.open(this.props.documentRoot + "/dump-project-aggregate-data?projectId=" + this.state.projectDetails.id, "_blank");
    };

    downloadSampleData = () => {
        window.open(this.props.documentRoot + "/dump-project-raw-data?projectId=" + this.state.projectDetails.id, "_blank");
    };

    getProjectById = () => {
        const { projectId } = this.props;
        fetch(this.props.documentRoot + "/get-project-by-id?projectId=" + projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                if (data === "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.state.documentRoot + "/home";
                } else {
                    const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                    this.setState({ projectDetails: { ...data, surveyQuestions: newSurveyQuestions }});
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    getImageryList = () => {
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.state.projectDetails.institution)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    getProjectPlots = () => {
        fetch(this.props.documentRoot + "/get-project-plots?projectId=" + this.props.projectId + "&max=300")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ plotList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot list. See console for details.");
            });
    };

    initProjectMap = () => {
        this.setState({ mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList, this.props.documentRoot) });
    };

    showProjectMap = () => {
        const baseMap = this.state.imageryList.find(imagery => imagery.id === this.state.projectDetails.imageryId);
        mercator.setVisibleLayer(this.state.mapConfig, baseMap.title || this.state.imageryList[0].title);

        // // Extract bounding box coordinates from the project boundary and show on the map
        const boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();

        this.setState({
            coordinates: {
                lonMin: boundaryExtent[0],
                latMin: boundaryExtent[1],
                lonMax: boundaryExtent[2],
                latMax: boundaryExtent[3],
            },
        });

        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        mercator.addVectorLayer(
            this.state.mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
            ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
    };

    gotoProjectDashboard = () => {
        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(this.props.documentRoot + "/project-dashboard?projectId=" + this.state.projectDetails.id);
        }
    };

    setProjectDetail = (key, newValue) =>
        this.setState({ projectDetails: { ...this.state.projectDetails, [key]: newValue }});

    onShowGEEScriptClick = () =>
        this.setState({
            projectDetails: {
                ...this.state.projectDetails,
                projectOptions: {
                    ...this.state.projectDetails.projectOptions,
                    showGEEScript: !this.state.projectDetails.projectOptions.showGEEScript,
                },
            },
        });

    projectNotFound = (projectId) => (
        <SectionBlock title="Project Information">
            <h3>Project {projectId} not found.</h3>
        </SectionBlock>
    );

    render() {
        return (
            <FormLayout id="project-design" title="Review Project">
                {this.state.projectDetails.id && parseInt(this.state.projectDetails.id) > 0
                ?
                    <Fragment>
                        <ProjectDesignReview
                            coordinates={this.state.coordinates}
                            imageryList={this.state.imageryList}
                            projectDetails={this.state.projectDetails}
                            setProjectDetail={this.setProjectDetail}
                            onShowGEEScriptClick={this.onShowGEEScriptClick}
                        />
                        <ProjectManagement
                            changeAvailability={this.changeAvailability}
                            configureGeoDash={this.configureGeoDash}
                            downloadPlotData={this.downloadPlotData}
                            downloadSampleData={this.downloadSampleData}
                            gotoProjectDashboard={this.gotoProjectDashboard}
                            project={this.state}
                            updateProject={this.updateProject}
                        />
                        <ProjectStatsGroup
                            availability={this.state.projectDetails && this.state.projectDetails.availability}
                            documentRoot={this.props.documentRoot}
                            projectId={this.props.projectId}
                        />
                    </Fragment>
                :
                    this.projectNotFound(this.props.projectId)
                }
            </FormLayout>
        );
    }
}

class ProjectStatsGroup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showStats: false,
        };
    }

    updateShown = () => this.setState({ showStats: !this.state.showStats });

    render() {
        return (
            <div className="ProjectStatsGroup">
                <button
                    type="button"
                    className="btn btn-outline-lightgreen btn-sm btn-block mb-2"
                    onClick={this.updateShown}
                >
                    Project Stats
                </button>
                {this.state.showStats && <ProjectStats {...this.props} />}
            </div>
        );
    }
}

class ProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {},
        };
    }

    componentDidMount() {
        this.getProjectStats();
    }

    getProjectStats = () => {
        fetch(this.props.documentRoot + "/get-project-stats?projectId=" + this.props.projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ stats: data }))
            .catch(response => {
                console.log(response);
                alert("Error getting project stats. See console for details.");
            });
    }

    render() {
        const {
            stats : {
                analyzedPlots,
                closedDate,
                contributors,
                createdDate,
                flaggedPlots,
                members,
                publishedDate,
                unanalyzedPlots,
                userStats,
            },
        } = this.state;
        const { availability } = this.props;
        const numPlots = flaggedPlots + analyzedPlots + unanalyzedPlots;
        return (
            <div className="row mb-3">
                <div id="project-stats" className="container mx-2">
                    <div className="ProjectStats__dates-table  mb-4">
                        <h3>Project Dates:</h3>
                        <div className="container row pl-4">
                            <div className="pr-4">
                                Date Created
                                <span className="badge badge-pill bg-lightgreen ml-3">{createdDate || "Unknown"}</span>
                            </div>

                            <div className="pr-4">
                                Date Published
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {publishedDate || (availability === "unpublished"
                                                            ? "Unpublished"
                                                            : "Unknown" )}
                                </span>
                            </div>

                            <div className="pr-4">
                                Date Closed
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {closedDate || (["archived", "closed"].includes(availability)
                                                        ? "Unknown"
                                                        : "Open")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="ProjectStats__plots-table mb-2">
                        <h3>Project Stats:</h3>
                        <div className="row pl-2">
                            <div className="col-4">
                                <StatsCell title="Members">{members}</StatsCell>
                                <StatsCell title="Flagged Plots">{flaggedPlots}</StatsCell>
                            </div>
                            <div className="col-4">
                                <StatsCell title="Contributors">{contributors}</StatsCell>
                                <StatsCell title="Analyzed Plots">{analyzedPlots}</StatsCell>
                            </div>
                            <div className="col-4">
                                <StatsCell title="Total Plots">{numPlots}</StatsCell>
                                <StatsCell title="Unanalyzed Plots">{unanalyzedPlots}</StatsCell>
                            </div>
                        </div>
                    </div>

                    {userStats &&
                        <div className="ProjectStats__user-table">
                            <h3>Plots Completed:</h3>
                            <StatsRow
                                title="Total"
                                plots={userStats.reduce((p, c) => p + c.plots, 0)}
                                analysisTime={
                                    userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                                        ? (userStats.reduce((p, c) => p + c.seconds, 0)
                                            / userStats.reduce((p, c) => p + c.timedPlots, 0)
                                            / 1.0).toFixed(2)
                                        : 0
                                }
                            />
                            {userStats.map((user, uid) => (
                                <StatsRow
                                    key={uid}
                                    title={user.user}
                                    plots={user.plots}
                                    analysisTime={
                                        user.timedPlots > 0
                                            ? (user.seconds / user.timedPlots / 1.0).toFixed(2)
                                            : 0
                                    }
                                />
                            ))}
                        </div>
                    }
                </div>
            </div>
        );
    }
}

function ProjectDesignReview({ projectDetails, coordinates, imageryList, setProjectDetail, onShowGEEScriptClick }) {
    return (
        <div id="project-design-form" className="px-2 pb-2">
            <ProjectInfo
                name={projectDetails.name}
                description={projectDetails.description}
                privacyLevel={projectDetails.privacyLevel}
                setProjectDetail={setProjectDetail}
            />
            <ProjectAOI
                coordinates={coordinates}
                imageryId={projectDetails.imageryId}
                imageryList={imageryList}
                setProjectDetail={setProjectDetail}
            />
            <ProjectOptions
                showGEEScript={projectDetails.projectOptions.showGEEScript}
                onShowGEEScriptClick={onShowGEEScriptClick}
            />
            <PlotReview projectDetails={projectDetails}/>
            <SampleReview projectDetails={projectDetails}/>
            <SurveyReview surveyQuestions={projectDetails.surveyQuestions} surveyRules={projectDetails.surveyRules}/>
        </div>
    );
}

function SurveyReview(props) {
    return (
        <SectionBlock title="Survey Review">
            <div id="survey-design">
                <SurveyCardList surveyQuestions={props.surveyQuestions} surveyRules={props.surveyRules}/>
            </div>
            <SurveyRules surveyRules={props.surveyRules}/>
        </SectionBlock>
    );
}

function SurveyRules(props) {
    return (
        <div id="survey-rule-design">
            <span className="font-weight-bold">Rules:  </span>
            <table id="srd">
                <tbody>
                    {props.surveyRules && props.surveyRules.length > 0
                    ?
                        props.surveyRules.map((rule, uid) => {
                            if (rule.ruleType === "text-match") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: {rule.ruleType}</td>
                                    <td>Regex: {rule.regex}</td>
                                    <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "numeric-range") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: {rule.ruleType}</td>
                                    <td>Min: {rule.min}</td>
                                    <td>Max: {rule.max}</td>
                                    <td>Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "sum-of-answers") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: {rule.ruleType}</td>
                                    <td>Valid Sum: {rule.validSum}</td>
                                    <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "matching-sums") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: {rule.ruleType}</td>
                                    <td>Questions Set 1: {rule.questionSetText1.toString()}</td>
                                    <td colSpan="2">Questions Set 2: {rule.questionSetText2.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "incompatible-answers") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: {rule.ruleType}</td>
                                    <td>Question 1: {rule.questionText1}, Answer 1: {rule.answerText1}</td>
                                    <td colSpan="2">Question 2: {rule.questionText2}, Answer 2: {rule.answerText2}</td>
                                </tr>;
                            }
                        })
                    :
                        <tr>
                            <td colSpan="5"><span>No rules available for this survey</span></td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    );
}

function ProjectManagement(props) {
    const { project } = props;
    const stateTransitions = {
        nonexistent: "Create",
        unpublished: "Publish",
        published: "Close",
        closed: "Delete",
        archived: "Delete",
    };
    return (
        <div id="project-management">
            <h2 className="header px-0">Project Management</h2>
            <div className="d-flex flex-column">
                <div className="d-flex justify-content-between mb-2">
                    <input
                        type="button"
                        className="btn btn-outline-danger btn-sm col-6 mr-2"
                        value={stateTransitions[project.projectDetails.availability] + " Project"}
                        onClick={props.changeAvailability}
                    />
                    <input
                        type="button"
                        className="btn btn-outline-danger btn-sm col-6"
                        value="Update Project"
                        onClick={props.updateProject}
                        style={{ display:"block" }}
                    />
                </div>
                <div className="d-flex justify-content-between mb-2">
                    <input
                        type="button"
                        className="btn btn-outline-lightgreen btn-sm col-6 mr-2"
                        value="Project Dashboard"
                        onClick={props.gotoProjectDashboard}
                        style={{ display:"block" }}
                    />
                    <input
                        type="button"
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        value="Configure Geo-Dash"
                        onClick={props.configureGeoDash}
                    />
                </div>
                <div
                    className="d-flex justify-content-between mb-2"
                    style={{ display: ["published", "closed"].includes(project.projectDetails.availability) ? "block" : "none !important" }}
                >
                    <input
                        type="button"
                        className="btn btn-outline-lightgreen btn-sm col-6 mr-2"
                        value="Download Plot Data"
                        onClick={props.downloadPlotData}
                    />
                    <input
                        type="button"
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        value="Download Sample Data"
                        onClick={props.downloadSampleData}
                    />
                </div>
                <div id="spinner"></div>
            </div>
        </div>
    );
}

export function renderReviewProjectPage(args) {
    ReactDOM.render(
        <Project documentRoot={args.documentRoot} userId={args.userId} projectId={args.projectId}/>,
        document.getElementById("project")
    );
}
