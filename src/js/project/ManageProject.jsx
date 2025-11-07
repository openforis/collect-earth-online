import React from "react";

import ReviewForm from "./ReviewForm";

import { ProjectContext } from "./constants";
import Modal from  "../components/Modal";
import { PromptModal } from "../components/PageComponents";

export default class ManageProject extends React.Component {
  constructor(props){
    super(props);
    this.state={modal: null};
  }
  componentDidMount() {
    this.context.processModal("Loading Project Details", this.getProjectDetails);
    this.context.setProjectDetails({
      plotFileBase64: null,
      sampleFileBase64: null,
    });
  }

  /// API Calls

  getProjectDetails = () =>
    Promise.all([
      this.getProjectById(this.context.projectId),
      this.getProjectImagery(this.context.projectId),
      this.getProjectPlots(this.context.projectId),
    ]).catch((error) => {
      console.error(error);
      this.setState ({modal: {alert: {alertType: "Project Info Error", alertMessage: "Error retrieving the project info. See console for details."}}});
    });

  getProjectById = (projectId) =>
    fetch(`/get-project-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data === "") {
          this.setState ({modal: {alert: {alertType: "Get Project Error",
                                          onClose: ()=>{window.location = "/home";},
                                          alertMessage: "No project found with ID " + projectId + "."}}});
          
        } else {
          this.context.setProjectDetails(data);
          this.context.setContextState({ originalProject: data });
          return data.institution;
        }
      })
      .then((institutionId) => this.getInstitutionUserList(institutionId));

  getInstitutionUserList = (institutionId) => {
    fetch(`/get-institution-users?institutionId=${institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.context.setContextState({ institutionUserList: data }));
  };

  // TODO: just return with the project info
  getProjectImagery = (projectId) =>
    fetch(`/get-project-imagery?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.context.setProjectDetails({ projectImageryList: data.map((imagery) => imagery.id) });
      });

  getProjectPlots = (projectId) =>
    fetch(`/get-project-plots?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.context.setProjectDetails({ plots: data }));

  render() {
    return (
      <div className="d-flex flex-column full-height align-items-center p-3" id="review-project">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});
                              this.state.modal.alert.onClose();}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
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
            <h2 className="bg-lightgreen w-100 py-1">Project Details</h2>
            <div className="px-3 pb-3">
              <ReviewForm />
            </div>
          </div>
          <div
            className="col-4 px-0 mr-2 overflow-auto bg-lightgray"
            style={{ border: "1px solid black", borderRadius: "6px" }}
          >
            <h2 className="bg-lightgreen w-100 py-1">Project Management</h2>
            <div className="p-3">
              <ProjectManagement />
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
    this.state = {modal: null};
    this.projectStates = {
      unpublished: {
        button: "Publish",
        update: this.publishProject,
        description:
          "Admins can review, edit, and test collecting the project.  Publish the project in order for users to begin collection.",
        canEdit: true,
      },
      published: {
        button: "Close",
        update: this.closeProject,
        description:
          "Users can begin collecting.  Limited changes to the project details can be made.  Close the project to prevent anymore updates.",
        canEdit: true,
      },
      closed: {
        button: "Reopen",
        update: this.publishProject,
        description:
          "The project is closed to all changes.  Reopen the project for additional collection.",
        canEdit: false,
      },
    };
  }

  /// API Calls

  publishProject = () => {
    const { availability, setProjectDetails, setContextState, processModal, projectId } =
      this.context;
    const unpublished = availability === "unpublished";
    const message = unpublished
      ? "Do you want to publish this project?  This action will clear plots collected by admins to allow collecting by users."
      : "Do you want to re-open this project?  Members will be allowed to collect plots again.";
    if (confirm(message)) {
      processModal("Publishing project", () =>
        fetch(`/publish-project?projectId=${projectId}&clearSaved=${unpublished}`, {
          method: "POST",
        })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((data) => {
            setProjectDetails(data);
            setContextState({ originalProject: data });
          })
          .catch((error) => {
            console.log(error);
            this.setState ({modal: {alert: {alertType: "Publish Project Error", alertMessage: "Error publishing project. See console for details."}}});
          })
      );
    }
  };

  copyProject = () => {
    const {setProjectDetails, setContextState, processModal, promptModal, projectId} = this.context;
    promptModal("Do you want to copy the entire project?",
                [{label: "Use Existing Plots",
                  index: "plots",
                  type:  "checkbox",
                  value:  true},
                 {label: "Use Existing Widgets",
                  index: "widgets",
                  type:  "checkbox",
                  value: true},
                 {label: "Copy Answers",
                  index: "answers",
                  type:  "checkbox",
                  value: true}
                ], (prompts) => {
                  const url = `/copy-project?projectId=${projectId}&widgets=${prompts.widgets}&plots=${prompts.plots}&answers=${prompts.answers}`;
                  fetch(url, {method: "POST"})
	            .then((response) => (response.ok ? response.json() : Promise.reject(response)))
	            .then((data) => 
                      window.location.assign(`/review-project?projectId=${data.projectId}&institutionId=${this.context.institution}&copy-redirect`)

                         );
                });
  };

  closeProject = () => {
    const { setProjectDetails, setContextState, processModal, projectId } = this.context;
    if (confirm("Do you want to close this project?")) {
      processModal("Closing project", () =>
        fetch(`/close-project?projectId=${projectId}`, { method: "POST" })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((data) => {
            setProjectDetails(data);
            setContextState({ originalProject: data });
          })
          .catch((error) => {
            console.log(error);
            this.setState ({modal: {alert: {alertType: "Close Project Error", alertMessage: "Error closing project. See console for details."}}});
          })
      );
    }
  };

  deleteProject = () => {
    if (confirm("Do you want to delete this project? This operation cannot be undone.")) {
      this.context.processModal("Deleting project", () =>
        fetch(`/archive-project?projectId=${this.context.id}`, { method: "POST" }).then(
          (response) => {
            if (response.ok) {
              this.setState ({modal: {alert: {alertType: "Delete Project Alert",
                                              onClose: ()=>{window.location = `/review-institution?institutionId=${this.context.institution}`;},
                                              alertMessage: "Project " + this.context.id + " has been deleted."}}});

            } else {
              console.log(response);
              this.setState ({modal: {alert: {alertType: "Delete Project Error", alertMessage: "Error deleting project. See console for details."}}});
            }
          }
        )
      );
    }
  };

  createDoi = () => {
    const { projectId, institution, description, name } = this.context;
    if (confirm("Do you want to create a DOI for this project?\nBy creating a DOI, collection data and plot/samples shape files will be uploaded to Zenodo.")) {
      fetch("/create-doi", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          description,
          institution,
          projectName: name,
        }),
      }).then((response) => {
        if(response.ok) {
          this.setState ({modal: {alert: {alertType: "Create DOI Alert", alertMessage: "A Digital Object Identifier was created for this project."}}});
        } else {
          console.log(response);
          this.setState ({modal: {alert: {alertType: "Create DOI Error", alertMessage: "Error creating a Digital Object Identifier."}}});
        }
      });
    }
  }

  publishDoi = () => {
    const { projectId } = this.context;
    if (confirm("Do you wish to publish the Data Object Identifier?\nThis will make the collection data public.")) {
      fetch("/publish-doi", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId })
      }).then((response) => {
        if(response.ok) {
          this.setState ({modal: {alert: {alertType: "Publish DOI Alert", alertMessage: "The Digital Object Identifier was published for this project."}}});
        } else {
          console.log(response);
          this.setState ({modal: {alert: {alertType: "Publish DOI Error", alertMessage: "Error publishing the Digital Object Identifier."}}});
        }
      });
    }
  }

  render() {
    const { button, update, description, canEdit } =
      this.projectStates[this.context.availability] || {};
    const {
      availability,
      createdDate,
      closedDate,
      id,
      institution,
      designSettings: {
        qaqcAssignment: { qaqcMethod },
      },
      publishedDate,
      setContextState,
    } = this.context;

    return (
      <div className="d-flex flex-column" id="project-management">
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

        <div className="d-flex">
          <div className="col-7">
            <div className="ProjectStats__dates-table mb-4">
              <div className="d-flex flex-column">
                <div>
                  Date Created
                  <span className="badge badge-pill bg-lightgreen ml-3">
                    {createdDate || "Unknown"}
                  </span>
                </div>
                <div>
                  Date Published
                  <span className="badge badge-pill bg-lightgreen ml-3">
                    {publishedDate || (availability === "unpublished" ? "Draft" : "Unknown")}
                  </span>
                </div>
                <div>
                  Date Closed
                  <span className="badge badge-pill bg-lightgreen ml-3">
                    {closedDate ||
                      (["archived", "closed"].includes(availability) ? "Unknown" : "Open")}
                  </span>
                </div>
              </div>
            </div>
            <p>
              This project is{" "}
              <b>{availability === "unpublished" ? "in draft mode" : availability}</b>.{" "}
              {description}
            </p>
          </div>
          <div className="col-5 d-flex flex-column align-items-center">
            <label className="my-2">Modify Project Details</label>
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
                  setContextState({ designMode: "wizard" });
                } else {
                  this.setState ({modal: {alert: {alertType: "Edit Project Error", alertMessage: "You cannot edit a closed project."}}});
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
            {this.context.projectOptions?.plotSimilarity ? (
              <>
                <input
                  className="btn btn-outline-red btn-sm w-100"
                  onClick={this.reprocessPlotSimilarity}
                  type="button"
                  value="Reprocess Plot Similarity"
                />
              </>
            ) : null}
            <label className="my-2">External Links</label>
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() =>
                window.open(`/widget-layout-editor?institutionId=${institution}&projectId=${id}`)
              }
              type="button"
              value="Configure Geo-Dash"
            />
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/collection?projectId=${id}&institutionId=${institution}`)}
              type="button"
              value="Collect"
            />
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/project-dashboard?projectId=${id}&institutionId=${institution}`)}
              type="button"
              value="Project Dashboard"
            />
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/project-qaqc-dashboard?projectId=${id}&institutionId=${institution}`)}
              type="button"
              value="Project QAQC Dashboard"
            />
            <label className="my-2">Export Data</label>
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/dump-project-aggregate-data?projectId=${id}`, "_blank")}
              type="button"
              value="Download Plot Data"
            />
            {qaqcMethod !== "none" && (
              <input
                className="btn btn-outline-lightgreen btn-sm w-100"
                onClick={() =>
                  window.open(
                    `/dump-project-aggregate-data?projectId=${id}&qaqcOnly=true`,
                    "_blank"
                  )
                }
                type="button"
                value="Download QA/QC Data"
              />
            )}
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/dump-project-raw-data?projectId=${id}`, "_blank")}
              type="button"
              value="Download Sample Data"
            />
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => window.open(`/create-shape-files?projectId=${id}`, "_blank")}
              type="button"
              value="Download Shape Files"
            />
            <input
              className="btn btn-outline-lightgreen btn-sm w-100"
              onClick={() => this.copyProject()}
              type="button"
              value="Copy Entire Project"
            />
            <label className="my-2"> Digital Object Identifier </label>
              <input className="btn btn-outline-lightgreen btn-sm w-100"
                     onClick={() => this.createDoi()}
                     type="button"
                     value={this.context.doiPath === null ? "Create DOI" : "Update DOI"}/>
          </div>
        </div>
      </div>
    );
  }
}
ProjectManagement.contextType = ProjectContext;
