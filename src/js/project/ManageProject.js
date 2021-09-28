import React from "react";

import ReviewForm from "./ReviewForm";

import {ProjectContext} from "./constants";

export default class ManageProject extends React.Component {
    componentDidMount() {
        this.context.processModal("Loading Project Details", this.getProjectDetails);
        this.context.setProjectDetails({
            plotFileBase64: null,
            sampleFileBase64: null
        });
    }

    /// API Calls

    getProjectDetails = () => Promise.all([
        this.getProjectById(this.context.projectId),
        this.getProjectImagery(this.context.projectId),
        this.getProjectPlots(this.context.projectId)
    ])
        .then(() => this.getInstitutionUserList())
        .catch(response => {
            console.log(response);
            alert("Error retrieving the project info. See console for details.");
        });

    getProjectById = projectId => fetch(`/get-project-by-id?projectId=${projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => {
            if (data === "") {
                alert("No project found with ID " + projectId + ".");
                window.location = "/home";
            } else {
                this.context.setProjectDetails(data);
                this.context.setContextState({originalProject: data});
            }
        })
        .catch(() => Promise.reject("Error retrieving the project."));

    getInstitutionUserList = () => {
        fetch(`/get-institution-users?institutionId=${this.context.institution}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.context.setContextState({institutionUserList: data});
                console.log(this.context);
            })
            .catch(response => {
                this.context.setContextState({institutionUserList: []});
                console.error(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    // TODO: just return with the project info
    getProjectImagery = projectId => fetch(`/get-project-imagery?projectId=${projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => {
            this.context.setProjectDetails({projectImageryList: data.map(imagery => imagery.id)});
        })
        .catch(() => Promise.reject("Error retrieving the project imagery list."));

    getProjectPlots = projectId => fetch(`/get-project-plots?projectId=${projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => this.context.setProjectDetails({plots: data}))
        .catch(() => Promise.reject("Error retrieving the plot list."));

    render() {
        return (
            <div
                className="d-flex flex-column full-height align-items-center p-3"
                id="review-project"
            >
                <div
                    style={{
                        display: "flex",
                        height: "100%",
                        justifyContent: "center",
                        width: "100%",
                        overflow: "auto"
                    }}
                >
                    <div
                        className="col-7 px-0 mr-2 overflow-auto bg-lightgray"
                        style={{border: "1px solid black", borderRadius: "6px"}}
                    >
                        <h2 className="bg-lightgreen w-100 py-1">Project Details</h2>
                        <div className="px-3 pb-3">
                            <ReviewForm/>
                        </div>
                    </div>
                    <div
                        className="col-4 px-0 mr-2 overflow-auto bg-lightgray"
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

class ProjectManagement extends React.Component {
    constructor(props) {
        super(props);

        this.projectStates = {
            unpublished: {
                button: "Publish",
                update: this.publishProject,
                description: "Admins can review, edit, and test collecting the project.  Publish the project in order for users to begin collection.",
                canEdit: true
            },
            published: {
                button: "Close",
                update: this.closeProject,
                description: "Users can begin collecting.  Limited changes to the project details can be made.  Close the project to prevent anymore updates.",
                canEdit: true
            },
            closed: {
                button: "Reopen",
                update: this.publishProject,
                description: "The project is closed to all changes.  Reopen the project for additional collection.",
                canEdit: false
            }
        };
    }

    /// API Calls

    publishProject = () => {
        const {availability, setProjectDetails, setContextState, processModal, projectId} = this.context;
        const unpublished = availability === "unpublished";
        const message = unpublished
            ? "Do you want to publish this project?  This action will clear plots collected by admins to allow collecting by users."
            : "Do you want to re-open this project?  Members will be allowed to collect plots again.";
        if (confirm(message)) {
            processModal("Publishing project", () => fetch(
                `/publish-project?projectId=${projectId}&clearSaved=${unpublished}`,
                {method: "POST"}
            )
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(data => {
                    setProjectDetails(data);
                    setContextState({originalProject: data});
                })
                .catch(error => {
                    console.log(error);
                    alert("Error publishing project. See console for details.");
                }));
        }
    };

    closeProject = () => {
        const {setProjectDetails, setContextState, processModal, projectId} = this.context;
        if (confirm("Do you want to close this project?")) {
            processModal("Closing project", () => fetch(
                `/close-project?projectId=${projectId}`,
                {method: "POST"}
            )
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(data => {
                    setProjectDetails(data);
                    setContextState({originalProject: data});
                })
                .catch(error => {
                    console.log(error);
                    alert("Error closing project. See console for details.");
                }));
        }
    };

    deleteProject = () => {
        if (confirm("Do you want to delete this project? This operation cannot be undone.")) {
            this.context.processModal("Deleting project", () => fetch(
                `/archive-project?projectId=${this.context.id}`,
                {method: "POST"}
            )
                .then(response => {
                    if (response.ok) {
                        alert("Project " + this.context.id + " has been deleted.");
                        window.location = `/review-institution?institutionId=${this.context.institution}`;
                    } else {
                        console.log(response);
                        alert("Error deleting project. See console for details.");
                    }
                }));
        }
    };

    render() {
        const {button, update, description, canEdit} = this.projectStates[this.context.availability] || {};
        return (
            <div className="d-flex flex-column" id="project-management">
                <div className="d-flex">
                    <div className="col-7">
                        <div className="ProjectStats__dates-table mb-4">
                            <div className="d-flex flex-column">
                                <div>
                                    Date Created
                                    <span className="badge badge-pill bg-lightgreen ml-3">
                                        {this.context.createdDate || "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    Date Published
                                    <span className="badge badge-pill bg-lightgreen ml-3">
                                        {this.context.publishedDate || (this.context.availability === "unpublished"
                                            ? "Draft"
                                            : "Unknown")}
                                    </span>
                                </div>
                                <div>
                                    Date Closed
                                    <span className="badge badge-pill bg-lightgreen ml-3">
                                        {this.context.closedDate || (["archived", "closed"].includes(this.context.availability)
                                            ? "Unknown"
                                            : "Open")}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p>This project is <b>{this.context.availability === "unpublished" ? "in draft mode" : this.context.availability}</b>. {description}</p>
                    </div>
                    <div className="col-5 d-flex flex-column align-items-center">
                        <h3 className="my-2">Modify Project Details</h3>
                        <input
                            className="btn btn-outline-red btn-sm w-100"
                            onClick={() => update()}
                            type="button"
                            value={(button || "Close") + " Project"}
                        />
                        <input
                            className="btn btn-outline-red btn-sm w-100"
                            onClick={() => {
                                if (canEdit) {
                                    this.context.setContextState({designMode: "wizard"});
                                } else {
                                    alert("You cannot edit a closed project.");
                                }
                            }}
                            type="button"
                            value="Edit Project"
                        />
                        <input
                            className="btn btn-outline-red btn-sm w-100"
                            onClick={this.deleteProject}
                            type="button"
                            value="Delete Project"
                        />
                        <h3 className="my-2">External Links</h3>
                        <input
                            className="btn btn-outline-lightgreen btn-sm w-100"
                            onClick={() => window.open(
                                "/widget-layout-editor?editable=true&" // TODO, drop unused 'editable'
                                    + `institutionId=${this.context.institution}`
                                    + `&projectId=${this.context.id}`
                            )}
                            type="button"
                            value="Configure Geo-Dash"
                        />
                        <input
                            className="btn btn-outline-lightgreen btn-sm w-100"
                            onClick={() => window.open(`/collection?projectId=${this.context.id}`)}
                            type="button"
                            value="Collect"
                        />
                        <input
                            className="btn btn-outline-lightgreen btn-sm w-100"
                            onClick={() => window.open(`/project-dashboard?projectId=${this.context.id}`)}
                            type="button"
                            value="Project Dashboard"
                        />
                        <h3 className="my-2">Export Data</h3>
                        <input
                            className="btn btn-outline-lightgreen btn-sm w-100"
                            onClick={() => window.open(`/dump-project-aggregate-data?projectId=${this.context.id}`, "_blank")}
                            type="button"
                            value="Download Plot Data"
                        />
                        <input
                            className="btn btn-outline-lightgreen btn-sm w-100"
                            onClick={() => window.open(`/dump-project-raw-data?projectId=${this.context.id}`, "_blank")}
                            type="button"
                            value="Download Sample Data"
                        />
                    </div>
                </div>
            </div>
        );
    }
}
ProjectManagement.contextType = ProjectContext;
