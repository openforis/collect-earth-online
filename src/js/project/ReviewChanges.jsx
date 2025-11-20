import React from "react";

import ReviewForm from "./ReviewForm";
import { ProjectContext } from "./constants";
import Modal from "../components/Modal";
import { PromptModal } from "../components/PageComponents";

export default class ReviewChanges extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      acceptTOS: false,
      modal: null,
    };
  }

  promptModal = (modalTitle, modalInputs, modalCallBack) => {
    this.setState(s => ({...s, modalTitle, modalInputs, modalCallBack}));
  }

  /// API Functions

  createProject = () => {
    if (!this.state.acceptTOS) {
      this.setState ({modal: {alert: {alertType: "Create Project Alert", alertMessage: "You must accept the terms of service to continue."}}});
    } else if (confirm("Do you really want to create this project?")) {
      this.context.processModal("Creating Project", () =>
        fetch("/create-project", {
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
            ...this.buildProjectObject(),
          }),
        })
          .then((response) => Promise.all([response.ok, response.json()]))
          .then((data) => {
            if (data[0] && Number.isInteger(data[1].projectId)) {
              fetch("/start-plot-similarity", {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify({
                  projectId: data[1].projectId,
                  referencePlotId: this.context.plotSimilarityDetails?.referencePlotId,
                  similarityYears: this.context.plotSimilarityDetails?.years,
                })
              });
              window.location = `/review-project?projectId=${data[1].projectId}`;
              return Promise.resolve();
            } else {
              return Promise.reject(data[1]);
            }
          })
          .catch((message) => {
            this.setState ({modal: {alert: {alertType: "Create Project Alert", alertMessage: "Error creating project:\n" + message}}});
          })
      );
    }
  };

  updateProject = () => {
    this.promptModal(
      "Collection data will be cleared to reset the project. Do you really want to update this project?",
      [{label: "Overwrite existing collection data",
        index: 'overwrite',
        type: 'checkbox',
        value: true}],
      (prompts) => {
        this.context.processModal("Updating Project", () =>        
          fetch("/update-project", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              append: this.context.append,
              projectId: this.context.projectId,
              overwrite: prompts.overwrite,
              ...this.buildProjectObject(),
            }),
          })
            .then((response) => Promise.all([response.ok, response.json()]))
            .then((data) => {
              if (data[0] && data[1] === "") {
                this.context.setContextState({ designMode: "manage" });
                this.setState ({modal: {alert: {alertType: "Update Project Alert", alertMessage: "Project successfully updated!"}}});
                return Promise.resolve();
              } else {
                return Promise.reject(data[1]);
              }
            })
            .catch((message) => {
              this.setState ({modal: {alert: {alertType: "Update Project Alert", alertMessage: "Error updating project:\n" + message}}});
            })
        );}
    );
  };

  /// Helper Functions

  buildProjectObject = () => ({
    imageryId: this.context.imageryId,
    projectImageryList: this.context.projectImageryList,
    aoiFeatures: this.context.aoiFeatures,
    aoiFileName: this.context.aoiFileName,
    description: this.context.description,
    learningMaterial: this.context.learningMaterial,
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

  /// Render Functions

  renderButtons = () => (
    <div className="d-flex flex-column">
      {this.context.projectId > 0 ? (
        <>
          <input
            className="btn btn-outline-lightgreen btn-sm col-6 mb-3"
            onClick={this.updateProject}
            type="button"
            value="Update Project"
          />
          <input
            className="btn btn-outline-red btn-sm col-6 mb-3"
            onClick={() => this.context.setContextState({ designMode: "manage" })}
            type="button"
            value="Discard Changes"
          />
        </>
      ) : (
        <>
          <div className="form-check mb-3">
            <input
              checked={this.state.acceptTOS}
              className="form-check-input"
              id="tos-check"
              onChange={() => this.setState({ acceptTOS: !this.state.acceptTOS })}
              type="checkbox"
            />
            <label className="form-check-label" htmlFor="tos-check">
              I agree to the{" "}
              <a href="/terms-of-service" target="_blank">
                Terms of Service
              </a>
              .
            </label>
          </div>
          <input
            className="btn btn-outline-lightgreen btn-sm col-6"
            onClick={this.createProject}
            type="button"
            value="Create Project"
          />
        </>
      )}
      <input
        className="btn btn-outline-lightgreen btn-sm col-6"
        onClick={() => this.context.setContextState({ designMode: "wizard" })}
        type="button"
        value="Continue Editing"
      />
    </div>
  );

  render() {
    return (
      <div className="d-flex flex-column full-height align-items-center p-3" id="changes">
        {this.state.modalInputs &&
         <PromptModal
           inputs={this.state.modalInputs}
           callBack={this.state.modalCallBack}
           closePrompt={()=>{this.setState(s => ({... s,
                                                  modalInputs: null,
                                                  modalTitle: null,
                                                  modalCallBack: null}));}}
           title={this.state.modalTitle}
         />}
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
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
            <p className="p-3">
              You will be able to continue to make changes to the project after creating it. Once
              satisfied with the project, click publish to begin final collection.
            </p>
            <div className="pl-4">{this.renderButtons()}</div>
          </div>
        </div>
      </div>
    );
  }
}
ReviewChanges.contextType = ProjectContext;
