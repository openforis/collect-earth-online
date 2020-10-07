import React from "react";
import {ProjectContext} from "./ProjectContext";
import {ReviewForm} from "./ReviewForm";
import {mercator} from "../utils/mercator.js";

export class ReviewChanges extends React.Component {
    constructor(props) {
        super(props);
    }

    createProject = () => {
        // TODO pass boundary instead of lon / lat.  Boundary will be arbitrary.
        const boundaryExtent = mercator.parseGeoJson(this.context.boundary, false).getExtent();
        if (confirm("Do you REALLY want to create this project?")) {
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
                              imageryId: this.context.imageryId,
                              projectImageryList: this.context.projectImageryList,
                              lonMin: boundaryExtent[0],
                              latMin: boundaryExtent[1],
                              lonMax: boundaryExtent[2],
                              latMax: boundaryExtent[3],
                              description: this.context.description,
                              name: this.context.name,
                              projectOptions: this.context.projectOptions,
                              numPlots: this.context.numPlots,
                              plotDistribution: this.context.plotDistribution,
                              plotShape: this.context.plotShape,
                              plotSize: this.context.plotSize,
                              plotSpacing: this.context.plotSpacing,
                              privacyLevel: this.context.privacyLevel,
                              projectTemplate: this.context.id,
                              sampleDistribution: this.context.sampleDistribution,
                              samplesPerPlot: this.context.samplesPerPlot,
                              sampleResolution: this.context.sampleResolution,
                              allowDrawnSamples: this.context.allowDrawnSamples,
                              sampleValues: this.context.surveyQuestions,
                              surveyRules: this.context.surveyRules,
                              plotFileName: this.context.plotFileName,
                              plotFileBase64: this.context.plotFileBase64,
                              sampleFileName: this.context.sampleFileName,
                              sampleFileBase64: this.context.sampleFileBase64,
                              useTemplatePlots: this.context.useTemplatePlots,
                              useTemplateWidgets: this.context.useTemplateWidgets,
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
        // TODO warning message needs to include check for plot changes.
        if (confirm("Do you REALLY want to update this project?")) {
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
                              imageryId: this.context.imageryId,
                              description: this.context.description,
                              name: this.context.name,
                              privacyLevel: this.context.privacyLevel,
                              projectOptions: this.context.projectOptions,
                              projectImageryList: this.context.projectImageryList,
                          }),
                      })
                    .then(response => {
                        if (!response.ok) {
                            console.log(response);
                            alert("Error updating project. See console for details.");
                        } else {
                            alert("Project successfully updated!");
                        }
                    }));
        }
    };

    renderButtons = () => (
        <div className="d-flex flex-column">
            <input
                type="button"
                className="btn btn-outline-danger btn-sm col-6"
                value="Create Project"
                onClick={this.createProject}
            />
            <input
                type="button"
                className="btn btn-outline-green btn-sm col-6"
                value="Edit Project"
                onClick={() => this.context.setDesignMode("wizard")}
            />
        </div>
    );

    render() {
        return (
            <div
                id="changes"
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
                            {this.renderButtons()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
ReviewChanges.contextType = ProjectContext;
