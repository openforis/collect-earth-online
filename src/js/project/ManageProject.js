import React from "react";
import {convertSampleValuesToSurveyQuestions} from "../utils/surveyUtils";
import {ProjectContext} from "./constants";

import ReviewForm from "./ReviewForm";

export default class ManageProject extends React.Component {

    componentDidMount() {
        this.context.processModal("Loading Project Details", this.getProjectDetails);
    }

    /// API Calls

    getProjectDetails = () =>
        Promise.all([this.getProjectById(this.context.projectId),
                     this.getProjectImagery(this.context.projectId),
                     this.getProjectPlots(this.context.projectId)])
            .catch(response =>{
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            })

    getProjectById = (projectId) =>
        fetch(`/get-project-by-id?projectId=${projectId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                if (data === "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = "/home";
                } else {
                    const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                    this.context.setProjectState({...data, surveyQuestions: newSurveyQuestions});
                }
            })
            .catch(() => Promise.reject("Error retrieving the project."));

    // TODO: just return with the project info
    getProjectImagery = (projectId) =>
        fetch("/get-project-imagery?projectId=" + projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.context.setProjectState({projectImageryList: data.map(imagery => imagery.id)});
            })
            .catch(() => Promise.reject("Error retrieving the project imagery list."));

    getProjectPlots = (projectId) =>
        fetch(`/get-project-plots?projectId=${projectId}&max=300`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.context.setProjectState({plots: data}))
            .catch(() => Promise.reject("Error retrieving plot list. See console for details."));

    render() {
        return (
            <div
                id="review-project"
                className="d-flex flex-column full-height align-items-center p-3"
            >
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
                        <h2 className="bg-lightgreen w-100 py-1">Project Details</h2>
                        <div className="px-3 pb-3">
                            <ReviewForm/>
                        </div>
                    </div>
                    <div
                        className="col-4 px-0 mr-2 overflow-auto"
                        style={{border: "1px solid black", borderRadius: "6px"}}
                    >
                        <h2 className="bg-lightgreen w-100 py-1">Project Management</h2>
                        <div className="p-3">
                            <ProjectManagement/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
ManageProject.contextType = ProjectContext;

export class ProjectStatsGroup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showStats: false,
        };
    }

    updateShown = () => this.setState({showStats: !this.state.showStats});

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
                {this.state.showStats && <ProjectStats {...this.props}/>}
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
        fetch(`/get-project-stats?projectId=${this.props.projectId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({stats: data}))
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
        const {availability} = this.props;
        const numPlots = flaggedPlots + analyzedPlots + unanalyzedPlots;
        return numPlots ?
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
        : <p>Loading...</p>;
    }
}

class ProjectManagement extends React.Component {
    constructor(props) {
        super(props);
        this.stateTransitions = {
            unpublished: "Publish",
            published: "Close",
            closed: "Publish",
        };
        this.projectStates = {
            unpublished: {
                button: "Publish",
                update: this.publishProject,
                description: "Admins can review, edit, and test collecting the project.  Publish the project in order for users to begin collection.",
                canEdit: true,
            },
            published: {
                button: "Close",
                update: this.closeProject,
                description: "Users can begin collecting.  Limited changes to the project details can be made.  Close the project to prevent anymore updates.",
                canEdit: true,
            },
            closed: {
                button: "Reopen",
                update: this.publishProject,
                description: "The project is closed to all changes.  Reopen the project for additional collection.",
                canEdit: false,
            },
        };
    }

    /// API Calls

    publishProject = () => {
        if (confirm("Do you want to publish this project?")) {
            fetch(`/publish-project?projectId=${this.context.id}`,
                  {method: "POST"}
            )
                .then(response => {
                    if (response.ok) {
                        this.context.setProjectState({availability: "published"});
                    } else {
                        console.log(response);
                        alert("Error publishing project. See console for details.");
                    }
                });
        }
    };

    closeProject = () => {
        if (confirm("Do you want to close this project?")) {
            fetch(`/close-project?projectId=${this.context.id}`,
                  {method: "POST"}
            )
                .then(response => {
                    if (response.ok) {
                        this.context.setProjectState({availability: "closed"});
                    } else {
                        console.log(response);
                        alert("Error closing project. See console for details.");
                    }
                });
        }
    };

    deleteProject = () => {
        if (confirm("Do you want to delete this project? This operation cannot be undone.")) {
            fetch(`/archive-project?projectId=${this.context.id}`,
                  {method: "POST"}
            )
                .then(response => {
                    if (response.ok) {
                        alert("Project " + this.context.id + " has been deleted.");
                        window.location = `/review-institution?institutionId=${this.extent.institution}`;
                    } else {
                        console.log(response);
                        alert("Error deleting project. See console for details.");
                    }
                });
        }
    };

    render() {
        const {button, update, description, canEdit} = this.projectStates[this.context.availability] || {};
        return (
            <div id="project-management" className="d-flex flex-column">
                <h2 className="px-0">Project Management</h2>
                <p>This project is <b>{this.context.availability}</b>. {description}</p>
                <div className="d-flex flex-column align-items-end">
                    <h3 className="my-2">Modify Project Details</h3>
                    <input
                        type="button"
                        className="btn btn-outline-danger btn-sm col-6"
                        value={(button || "Close") + " Project"}
                        onClick={() => update.call(this)}
                    />
                    <input
                        className="btn btn-outline-danger btn-sm col-6"
                        type="button"
                        value="Edit Project"
                        disabled={!canEdit}
                        onClick={() => this.context.setDesignMode("wizard")}
                    />
                    <input
                        className="btn btn-outline-danger btn-sm col-6"
                        type="button"
                        value="Delete Project"
                        onClick={this.deleteProject}
                    />
                    <h3 className="my-2">External Links</h3>
                    <input
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        type="button"
                        value="Configure Geo-Dash"
                        onClick={() => window.open(
                            "/widget-layout-editor?editable=true&"
                            + `institutionId=${this.context.institution}`
                            + `&projectId=${this.context.id}`,
                            "_geo-dash"
                        )}
                    />
                    <input
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        type="button"
                        value="Collect"
                        onClick={() => window.open(`/collection?projectId=${this.context.id}`)}
                    />
                    <input
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        type="button"
                        value="Project Dashboard"
                        onClick={() => window.open(`/project-dashboard?projectId=${this.context.id}`)}
                    />
                    <h3 className="my-2">Export Data</h3>
                    <input
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        type="button"
                        value="Download Plot Data"
                        onClick={() => window.open(`/dump-project-aggregate-data?projectId=${this.context.id}`, "_blank")}
                    />
                    <input
                        className="btn btn-outline-lightgreen btn-sm col-6"
                        type="button"
                        value="Download Sample Data"
                        onClick={() => window.open(`/dump-project-raw-data?projectId=${this.context.id}`, "_blank")}
                    />
                </div>
            </div>
        );
    }
}
ProjectManagement.contextType = ProjectContext;
