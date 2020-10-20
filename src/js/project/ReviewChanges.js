import React from "react";

import ReviewForm from "./ReviewForm";

import {ProjectContext} from "./constants";
import {mercator} from "../utils/mercator.js";

export default class ReviewChanges extends React.Component {
    constructor(props) {
        super(props);
    }

    /// API Functions

    createProject = () => {
        if (confirm("Do you really want to create this project?")) {
            const {projectDetails} = this.context;
            this.context.processModal("Creating Project", () =>
                fetch("/create-project",
                      {
                          method: "POST",
                          headers: {
                              "Accept": "application/json",
                              "Content-Type": "application/json; charset=utf-8",
                          },
                          body: JSON.stringify({
                              institutionId: this.context.institutionId,
                              projectTemplate: projectDetails.templateProjectId,
                              useTemplatePlots: projectDetails.useTemplatePlots,
                              useTemplateWidgets: projectDetails.useTemplateWidgets,
                              ...this.buildProjectObject(),
                          }),
                      }
                )
                    .then(response => Promise.all([response.ok, response.json()]))
                    .then(data => {
                        if (data[0] && Number.isInteger(data[1].projectId)) {
                            window.location = `/review-project?projectId=${data[1].projectId}`;
                            return Promise.resolve();
                        } else {
                            return Promise.reject(data[1]);
                        }
                    })
                    .catch(message => {
                        alert("Error creating project:\n" + message);
                    })
            );
        }
    };

    updateProject = () => {
        const extraMessage = this.collectionUpdated(this.context.projectDetails, this.context.originalProject)
                ? "  Plots and samples will be recreated, losing all collection data."
            : this.surveyQuestionUpdated(this.context.projectDetails, this.context.originalProject)
                ? "  Updating survey questions or rules will reset all collected data."
            : "";
        if (confirm("Do you really want to update this project?" + extraMessage)) {
            this.context.processModal("Updating Project", () =>
                fetch("/update-project",
                      {
                          method: "POST",
                          headers: {
                              "Accept": "application/json",
                              "Content-Type": "application/json; charset=utf-8",
                          },
                          body: JSON.stringify({
                              projectId: this.context.projectId,
                              projectTemplate: -1,
                              useTemplatePlots: false,
                              useTemplateWidgets: false,
                              ...this.buildProjectObject(),
                          }),
                      })
                    .then(response => {
                        if (!response.ok) {
                            console.log(response);
                            alert("Error updating project. See console for details.");
                        } else {
                            this.context.setContextState({designMode: "manage"});
                            alert("Project successfully updated!");
                        }
                    }));
        }
    };

    /// Helper Functions

    buildProjectObject = () => {
        const {projectDetails} = this.context;
        // TODO pass boundary instead of lon / lat.  Boundary will be arbitrary.
        const boundaryExtent = mercator.parseGeoJson(projectDetails.boundary, false).getExtent();
        return {
            imageryId: projectDetails.imageryId,
            projectImageryList: projectDetails.projectImageryList,
            lonMin: boundaryExtent[0],
            latMin: boundaryExtent[1],
            lonMax: boundaryExtent[2],
            latMax: boundaryExtent[3],
            description: projectDetails.description,
            name: projectDetails.name,
            privacyLevel: projectDetails.privacyLevel,
            projectOptions: projectDetails.projectOptions,
            numPlots: projectDetails.numPlots,
            plotDistribution: projectDetails.plotDistribution,
            plotShape: projectDetails.plotShape,
            plotSize: projectDetails.plotSize,
            plotSpacing: projectDetails.plotSpacing,
            sampleDistribution: projectDetails.sampleDistribution,
            samplesPerPlot: projectDetails.samplesPerPlot,
            sampleResolution: projectDetails.sampleResolution,
            allowDrawnSamples: projectDetails.allowDrawnSamples,
            surveyQuestions: projectDetails.surveyQuestions,
            surveyRules: projectDetails.surveyRules,
            plotFileName: projectDetails.plotFileName,
            plotFileBase64: projectDetails.plotFileBase64,
            sampleFileName: projectDetails.sampleFileName,
            sampleFileBase64: projectDetails.sampleFileBase64,
        };
    }

    surveyQuestionUpdated = (projectDetails, originalProject) =>
        projectDetails.surveyQuestions !== originalProject.surveyQuestions
            || projectDetails.surveyRules !== originalProject.surveyRules
            || (originalProject.allowDrawnSamples && !projectDetails.allowDrawnSamples);

    collectionUpdated = (projectDetails, originalProject) =>
        projectDetails.boundary !== originalProject.boundary
            || projectDetails.numPlots !== originalProject.numPlots
            || projectDetails.plotDistribution !== originalProject.plotDistribution
            || projectDetails.plotShape !== originalProject.plotShape
            || projectDetails.plotSize !== originalProject.plotSize
            || projectDetails.plotSpacing !== originalProject.plotSpacing
            || projectDetails.sampleDistribution !== originalProject.sampleDistribution
            || projectDetails.samplesPerPlot !== originalProject.samplesPerPlot
            || projectDetails.sampleResolution !== originalProject.sampleResolution
            || projectDetails.plotFileBase64
            || projectDetails.sampleFileBase64;

    /// Render Functions

    renderButtons = () => (
        <div className="d-flex flex-column">
            {this.context.projectId > 0
            ? (
                <>
                    <input
                        type="button"
                        className="btn btn-outline-red btn-sm col-6"
                        value="Update Project"
                        onClick={this.updateProject}
                    />
                    <input
                        type="button"
                        className="btn btn-outline-red btn-sm col-6"
                        value="Discard Changes"
                        onClick={() => this.context.setContextState({designMode: "manage"})}
                    />
                </>
            ) : (
                <input
                    type="button"
                    className="btn btn-outline-red btn-sm col-6"
                    value="Create Project"
                    onClick={this.createProject}
                />
            )}
            <input
                type="button"
                className="btn btn-outline-lightgreen btn-sm col-6"
                value="Continue Editing"
                onClick={() => this.context.setContextState({designMode: "wizard"})}
            />
        </div>
    );

    render() {
        return (
            <div
                id="changes"
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
                            {this.renderButtons()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
ReviewChanges.contextType = ProjectContext;
