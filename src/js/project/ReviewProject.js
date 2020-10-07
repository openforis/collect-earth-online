import React from "react";

import {ReviewForm} from "./ReviewForm";

export function ReviewProject() {

    return (
        <div
            id=""
            className="d-flex pb-5 full-height align-items-center flex-column"
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
                    <div className="p-3">
                        <ReviewForm/>
                    </div>
                </div>
                <div className="col-4">
                    <div className="d-flex flex-column h-100">
                        <ProjectManagement/>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
        this.state = {
            showStats: false,
        };
        this.stateTransitions = {
            nonexistent: "Create",
            unpublished: "Publish",
            published: "Close",
            closed: "Delete",
            archived: "Delete",
        };
    }

    gotoProjectDashboard = () => {
        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(`/project-dashboard?projectId=${this.state.projectDetails.id}`);
        }
    };

    publishProject = () => {
        if (confirm("Do you REALLY want to publish this project?")) {
            fetch(`/publish-project?projectId=${this.state.projectDetails.id}`,
                  {
                      method: "POST",
                  }
            )
                .then(response => {
                    if (response.ok) {
                        this.setState({projectDetails: {...this.state.projectDetails, availability: "published"}});
                    } else {
                        console.log(response);
                        alert("Error publishing project. See console for details.");
                    }
                });
        }
    };

    closeProject = () => {
        if (confirm("Do you REALLY want to close this project?")) {
            fetch(`/close-project?projectId=${this.state.projectDetails.id}`,
                  {
                      method: "POST",
                  })
                .then(response => {
                    if (response.ok) {
                        this.setState({projectDetails: {...this.state.projectDetails, availability: "closed"}});
                    } else {
                        console.log(response);
                        alert("Error closing project. See console for details.");
                    }
                });
        }
    };

    archiveProject = () => {
        if (confirm("Do you REALLY want to delete this project? This operation cannot be undone.")) {
            fetch(`/archive-project?projectId=${this.state.projectDetails.id}`,
                  {
                      method: "POST",
                  })
                .then(response => {
                    if (response.ok) {
                        alert("Project " + this.state.projectDetails.id + " has been deleted.");
                        window.location = "/home";
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
                "/widget-layout-editor?editable=true&"
                + encodeURIComponent(
                    `institutionId=${this.state.projectDetails.institution}`
                    + `&projectId=${this.state.projectDetails.id}`
                ),
                "_geo-dash");
        }
    };

    downloadPlotData = () => {
        window.open(`/dump-project-aggregate-data?projectId=${this.state.projectDetails.id}`, "_blank");
    };

    downloadSampleData = () => {
        window.open(`/dump-project-raw-data?projectId=${this.state.projectDetails.id}`, "_blank");
    };

    render() {
        return (
            <div id="project-management">
                <h2 className="header px-0">Project Management</h2>
                <div className="d-flex flex-column">
                    <div className="d-flex justify-content-between mb-2">
                        <input
                            type="button"
                            className="btn btn-outline-danger btn-sm col-6 mr-2"
                            value={this.stateTransitions[this.context.availability] + " Project"}
                            onClick={this.props.changeAvailability}
                        />
                        <input
                            type="button"
                            className="btn btn-outline-danger btn-sm col-6"
                            value="Update Project"
                            onClick={this.props.updateProject}
                            style={{display:"block"}}
                        />
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <input
                            type="button"
                            className="btn btn-outline-lightgreen btn-sm col-6 mr-2"
                            value="Project Dashboard"
                            onClick={this.props.gotoProjectDashboard}
                            style={{display:"block"}}
                        />
                        <input
                            type="button"
                            className="btn btn-outline-lightgreen btn-sm col-6"
                            value="Configure Geo-Dash"
                            onClick={this.props.configureGeoDash}
                        />
                    </div>
                    <div
                        className="d-flex justify-content-between mb-2"
                        style={{display: ["published", "closed"].includes(project.projectDetails.availability) ? "block" : "none !important"}}
                    >
                        <input
                            type="button"
                            className="btn btn-outline-lightgreen btn-sm col-6 mr-2"
                            value="Download Plot Data"
                            onClick={this.props.downloadPlotData}
                        />
                        <input
                            type="button"
                            className="btn btn-outline-lightgreen btn-sm col-6"
                            value="Download Sample Data"
                            onClick={this.props.downloadSampleData}
                        />
                    </div>
                    <div id="spinner"></div>
                </div>
            </div>
        );
    }
}
