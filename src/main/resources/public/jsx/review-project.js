import React, { Fragment }  from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";
import SurveyCardList from "./components/SurveyCardList";
import { convertSampleValuesToSurveyQuestions } from "./utils/SurveyUtils"
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: null,
            imageryList: [],
            mapConfig: null,
            plotList: [],
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: ""
        };
    };
    
    componentDidMount() {
        this.getProjectById();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.projectDetails
                && this.state.projectDetails !== prevState.projectDetails) {
            this.getImageryList();
            this.getProjectPlots();
        }

        if (this.state.projectDetails && this.state.imageryList.length > 0 
                && prevState.imageryList.length === 0) {
            this.initProjectMap();
        }

        if (this.state.mapConfig 
                && this.state.mapConfig !== prevState.mapConfig) {
            this.showProjectMap();
        }

        if (this.state.mapConfig && this.state.plotList.length > 0
                && (!prevState.mapConfig || prevState.plotList.length === 0)){
            mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.projectDetails.plotShape);
        }

    }

    publishProject = () => {
        if (confirm("Do you REALLY want to publish this project?")) {
            utils.show_element("spinner");
            fetch(this.props.documentRoot + "/publish-project/" + this.state.projectDetails.id, 
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
              })
            .then(response => {
                utils.hide_element("spinner");
                if (response.ok) {
                    this.setState({projectDetails: {...this.state.projectDetails, availability: "published"}})
                } else {
                    console.log(response);
                    alert("Error publishing project. See console for details.");
                }
            })
        }
    }

    closeProject = () => {
        if (confirm("Do you REALLY want to close this project?")) {
            utils.show_element("spinner");
            fetch(this.props.documentRoot + "/close-project/" + this.state.projectDetails.id, 
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
            })
            .then(response => {
                utils.hide_element("spinner");
                if (response.ok) {
                    this.setState({projectDetails: {...this.state.projectDetails, availability: "closed"}});
                } else {
                    console.log(response);
                    alert("Error closing project. See console for details.");
                }
            })
        }
    }

    archiveProject = () => {
        if (confirm("Do you REALLY want to archive this project?!")) {
            utils.show_element("spinner");
            fetch(this.props.documentRoot + "/archive-project/" + this.state.projectDetails.id, 
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
            })
            .then(response => {
                utils.hide_element("spinner");
                if (response.ok) {
                    this.setState({projectDetails: {...this.state.projectDetails, availability: "archived"}});
                    alert("Project " + this.state.projectDetails.id + " has been archived.");
                    window.location = this.props.documentRoot + "/home";
                } else {
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                }
            })
        }
    }

    changeAvailability = () => {
        if (this.state.projectDetails.availability == "unpublished") {
            this.publishProject();
        } else if (this.state.projectDetails.availability == "published") {
            this.closeProject();
        } else if (this.state.projectDetails.availability == "closed") {
            this.archiveProject();
        }
    }

    configureGeoDash = () => {
        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(this.props.documentRoot + "/widget-layout-editor?editable=true&"
                + encodeURIComponent("institutionId=" + this.state.projectDetails.institution
                    + "&pid=" + this.state.projectDetails.id),
                "_geo-dash");
        }
    }

    downloadPlotData = () => {
        window.open(this.props.documentRoot + "/dump-project-aggregate-data/" + this.state.projectDetails.id, "_blank");
    }

    downloadSampleData = () => {
        window.open(this.props.documentRoot + "/dump-project-raw-data/" + this.state.projectDetails.id, "_blank");
    }

    getProjectById = () => {
        const { projectId } = this.props
        fetch(this.props.documentRoot + "/get-project-by-id/" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                if (data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.state.documentRoot + "/home";
                } else {                   
                    const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                    this.setState({projectDetails: { ...data, surveyQuestions: newSurveyQuestions }});
                }
            });
    }

    getImageryList = () => {
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.state.projectDetails.institution)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList: data});
            });
    }

    getProjectPlots = () => {
        fetch(this.props.documentRoot + "/get-project-plots/" + this.props.projectId + "/300")
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
            })
            .catch(e => this.setState({plotList: []}));
    }

    initProjectMap = () => {
        this.setState({mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)});
    }

    showProjectMap = () => {
        mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource || this.state.imageryList[0].title);
        
        // // Extract bounding box coordinates from the project boundary and show on the map
        const boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
        this.setState({lonMin: boundaryExtent[0]});
        this.setState({latMin: boundaryExtent[1]});
        this.setState({lonMax: boundaryExtent[2]});
        this.setState({latMax: boundaryExtent[3]});

        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        mercator.addVectorLayer(this.state.mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
            ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
    }

    gotoProjectDashboard = () => {
        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(this.props.documentRoot + "/project-dashboard/"+this.state.projectDetails.id);
        }
    }

    render() {
        return (
            <FormLayout id="project-design"  title="Review Project">
                {this.state.projectDetails && parseInt(this.state.projectDetails.id) > 0
                ?
                    <Fragment>
                        <ProjectStatsGroup 
                            documentRoot={this.props.documentRoot}
                            projectId={this.props.projectId}
                            availability={this.state.projectDetails && this.state.projectDetails.availability}
                        />
                        <ProjectDesignReview 
                            projectId={this.props.projectId} 
                            project={this.state}
                            setBaseMapSource={this.setBaseMapSource}
                        />
                        <ProjectManagement 
                            project={this.state} 
                            projectId={this.props.projectId}
                            configureGeoDash={this.configureGeoDash} downloadPlotData={this.downloadPlotData}
                            downloadSampleData={this.downloadSampleData}
                            changeAvailability={this.changeAvailability} 
                            gotoProjectDashboard={this.gotoProjectDashboard}
                        />
                    </Fragment>
                :
                    <ProjectNotFount projectId={this.props.projectId} />
                }
            </FormLayout>
        );
    }
}

function ProjectNotFount({ projectId }){
    return (
        <SectionBlock title="Project Information">
            <h3>Project {projectId} not found.</h3>
        </SectionBlock>
    )
}

class ProjectStatsGroup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showStats: false
        }
    }

    updateShown =() => this.setState({showStats: !this.state.showStats});

    render() {
        return (
            <div className="ProjectStatsGroup">
                <button 
                    className="btn btn-outline-lightgreen btn-sm btn-block my-2" 
                    onClick={this.updateShown}
                >
                    Project Stats
                </button>
                {this.state.showStats && <ProjectStats {...this.props} /> }
            </div>
        );
    }
}


class ProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {}
        }
    }

    componentDidMount() {
        this.getProjectStats();
    }

    asPercentage(part, total) {
        return (part && total)
            ? (100.0 * part / total).toFixed(2)
            : "0.00";
    }

    getProjectStats = () => {
        fetch(this.props.documentRoot + "/get-project-stats/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error getting project stats. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(data => {
                this.setState({stats: data});
            });
    }

    render() {
        const { 
                stats : {   
                    analyzedPlots,
                    archivedDate,
                    closedDate,
                    contributors,
                    createdDate, 
                    flaggedPlots, 
                    members, 
                    publishedDate, 
                    unanalyzedPlots,
                    userStats 
                } 
            } = this.state;
        const { availability } = this.props;
        const numPlots = flaggedPlots + analyzedPlots + unanalyzedPlots;
        return (
            <div className="row mb-3">
                <div id="project-stats" className="container mx-2">
                    <div className="ProjectStats__dates-table  mb-4">
                        <h3>Project Dates:</h3>
                        <div className="container row pl-4">
                            <div className="pr-5">
                                Date Created
                                <span className="badge badge-pill bg-lightgreen ml-3">{createdDate || "Unknown"}</span>
                            </div>

                            <div className="pr-5">
                                Date Published
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {publishedDate ||  (availability === "unpublished"
                                                            ? "Unpublished"
                                                            : "Unknown" )}
                                </span>
                            </div>

                            <div className="pr-5">
                                Date Closed
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {closedDate || (["archived", "closed"].includes(availability)
                                                        ? "Unknown"
                                                        : "Open")}
                                </span>
                            </div>

                            <div>
                                Date Archived
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {archivedDate || (availability === "archived"
                                                            ? "Unknown"
                                                            : "Unarchived")}
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
                                    plots={userStats.reduce((p, c) => {return p + c.plots}, 0)}
                                    analysisTime={userStats.reduce((p, c) => {return p + c.timedPlots}, 0) > 0
                                                    ? (userStats.reduce((p, c) => {return p + c.seconds}, 0) 
                                                        / userStats.reduce((p, c) => {return p + c.timedPlots}, 0)
                                                        / 1.0).toFixed(2)
                                                    : 0
                                                  }
                            />
                            {userStats.map((user, uid) => {
                                return (
                                <StatsRow
                                    key={uid}
                                    title={user.user}
                                    plots={user.plots}
                                    analysisTime={user.timedPlots > 0
                                                    ? (user.seconds / user.timedPlots / 1.0).toFixed(2)
                                                    : 0
                                                  }
                                />);
                            })}
                        </div>
                    }
                </div>
            </div>
        );
    }
}

function ProjectDesignReview({ project, projectId }) {
    return (
        <div id="project-design-form" className="px-2 pb-2">
            <ProjectInfoReview 
                name={project.projectDetails.name}
                description={project.projectDetails.description}
            />
            <ProjectVisibility project={project}/>
            <ProjectAOI projectId={projectId} project={project}/>
            {project.imageryList &&
                <ProjectImageryReview baseMapSource={project.projectDetails.baseMapSource}/>
            }
            <PlotReview project={project}/>
            <SampleReview project={project}/>
            <SurveyReview surveyQuestions={project.projectDetails.surveyQuestions} />
        </div>
    );
}

function ProjectInfoReview({ name, description }) {
    return (
        <SectionBlock id="project-info" title="Project Info">
            <h3 className="font-weight-bold">Name</h3>
            <p className="ml-2">{name}</p>
            <h3 className="font-weight-bold">Description</h3>
            <p className={description ? "ml-2" : "ml-2 font-italic"}>{description || "none"}</p>
        </SectionBlock>
    );
}

// FIXME potential to let the user change the visibility
function ProjectVisibility(props) {
    return (
        <SectionBlock title="Project Visibility">
            <h3 className="font-weight-bold">Privacy Level</h3>
            <div id="project-visibility" className="mb-3">
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                            value="public" defaultChecked={props.project.projectDetails.privacyLevel === "public"}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-public">Public: <i>All Users</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                            value="private"
                            defaultChecked={props.project.projectDetails.privacyLevel === "private"}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-private">Private: <i>Group
                        Admins</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-institution"
                            name="privacy-level"
                            value="institution"
                            defaultChecked={props.project.projectDetails.privacyLevel === "institution"}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-institution">Institution: <i>Group
                        Members</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-invitation"
                            name="privacy-level"
                            value="invitation"
                            defaultChecked={props.project.projectDetails.privacyLevel === "invitation"}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-invitation">Invitation: <i>Coming
                        Soon</i></label>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectAOI({ project: { latMax, lonMin, lonMax, latMin } }) {
    return (
        <SectionBlock title="Project AOI">
            <div id="project-aoi">
                <div id="project-map"></div>
                <div className="form-group mx-4">
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input 
                                className="form-control form-control-sm" type="number" id="lat-max" name="lat-max"
                                defaultValue={latMax} placeholder="North" autoComplete="off" min="-90.0"
                                max="90.0" step="any"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <input 
                                className="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                defaultValue={lonMin} placeholder="West" autoComplete="off" min="-180.0"
                                max="180.0" step="any"
                                disabled
                            />
                        </div>
                        <div className="col-md-6">
                            <input 
                                className="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                defaultValue={lonMax} placeholder="East" autoComplete="off" min="-180.0"
                                max="180.0" step="any"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input 
                                className="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                defaultValue={latMin} placeholder="South" autoComplete="off" min="-90.0"
                                max="90.0" step="any"
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectImageryReview({ baseMapSource }) {
    return (
        <SectionBlock id="project-imagery-review" title="Project Imagery">
            <h3 className="font-weight-bold">Basemap Source</h3>
            <p className="ml-2">{baseMapSource}</p>
        </SectionBlock>
    );
}

function PlotReview({ project: { projectDetails: { plotDistribution, numPlots, plotSpacing, plotShape, plotSize }} }) {
    return (
        <SectionBlock title="Plot Review">
            <div id="plot-design">
                <div className="row">
                    <div id="plot-design-col1" className="col">
                        <table id="plot-review-table" className="table table-sm">
                        <tbody>
                            <tr>
                                <td className="w-80">Spatial Distribution</td>
                                <td className="w-20 text-center">
                                    <span className="badge badge-pill bg-lightgreen">{plotDistribution} distribution</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="w-80">Number of plots</td>
                                <td className="w-20 text-center">
                                    <span className="badge badge-pill bg-lightgreen">{numPlots} plots</span>
                                </td>
                            </tr>
                            {plotDistribution === "gridded" &&
                                <tr>
                                    <td className="w-80">Plot spacing</td>
                                    <td className="w-20 text-center">
                                        <span className="badge badge-pill bg-lightgreen">{plotSpacing} m</span>
                                    </td>
                                </tr>
                            }
                            {plotDistribution != "shp" &&
                                <Fragment>
                                    <tr>
                                        <td className="w-80">Plot shape</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{plotShape}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="w-80">Plot size</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{plotSize} m</span>
                                        </td>
                                    </tr>
                                </Fragment>
                            }
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

function SampleReview({ project: { projectDetails: { sampleDistribution, samplesPerPlot, sampleResolution }} }){

    return (
        <SectionBlock title="Sample Design">
                <div id="sample-design">
                    <table id="plot-review-table" className="table table-sm">
                    <tbody>
                        <tr>
                            <td className="w-80">Spatial Distribution</td>
                            <td className="w-20 text-center">
                                <span className="badge badge-pill bg-lightgreen">{sampleDistribution} distribution</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="w-80">Samples Per Plot</td>
                            <td className="w-20 text-center">
                                <span className="badge badge-pill bg-lightgreen">{samplesPerPlot} /plot</span>
                            </td>
                        </tr>
                        {sampleDistribution === "gridded" &&
                            <tr>
                                <td className="w-80">Sample Resolution</td>
                                <td className="w-20 text-center">
                                    <span className="badge badge-pill bg-lightgreen">{sampleResolution} m</span>
                                </td>
                            </tr>
                        }
                        
                    </tbody>
                    </table>
                </div>
        </SectionBlock>
    );
}

function SurveyReview({ surveyQuestions }){
    return (
        <SectionBlock title="Survey Review">
            <div id="survey-design">
                <SurveyCardList surveyQuestions={surveyQuestions} />
            </div>
        </SectionBlock>
    );
}

function ProjectManagement(props) {
    const { project } = props;
    const stateTransitions = { 
        nonexistent: "Create",
        unpublished: "Publish",
        published: "Close",
        closed: "Archive",
        archived: "Archive"
    }
    return (
        <div id="project-management" className="col mb-3">
            <h2 className="header px-0">Project Management</h2>
            <div className="row">
                {project.projectDetails && 
                    <React.Fragment>
                        <input type="button" id="project-dashboard" className="btn btn-outline-lightgreen btn-sm btn-block"
                            name="project-dashboard" value="Project Dashboard"
                            onClick={props.gotoProjectDashboard}
                            style={{ display:"block" }}
                        />
                        <input type="button" id="configure-geo-dash" className="btn btn-outline-lightgreen btn-sm btn-block"
                            name="configure-geo-dash" value="Configure Geo-Dash"
                            onClick={props.configureGeoDash}
                            style={{ display: project.projectDetails.availability == "unpublished" || project.projectDetails.availability == "published" ? "block" : "none" }}
                        />
                        <input type="button" id="download-plot-data"
                            className="btn btn-outline-lightgreen btn-sm btn-block"
                            name="download-plot-data" value="Download Plot Data"
                            onClick={props.downloadPlotData}
                            style={{ display: project.projectDetails.availability == "published" || project.projectDetails.availability == "closed" ? "block" : "none" }}
                        />
                        <input type="button" id="download-sample-data"
                            className="btn btn-outline-lightgreen btn-sm btn-block"
                            name="download-sample-data" value="Download Sample Data"
                            onClick={props.downloadSampleData}
                            style={{ display: project.projectDetails.availability == "published" || project.projectDetails.availability == "closed" ? "block" : "none" }}
                        />
                        <input type="button" id="change-availability"
                            className="btn btn-outline-danger btn-sm btn-block"
                            name="change-availability"
                            value={stateTransitions[project.projectDetails.availability] + " Project"}
                            onClick={props.changeAvailability}
                        />
                    </React.Fragment>
                }
                <div id="spinner"></div>
            </div>
        </div>
    );
}

export function renderReviewProjectPage(args) {
    ReactDOM.render(
        // FIXME get institution from project data.
        <Project documentRoot={args.documentRoot} userId={args.userId} projectId={args.projectId}/>,
        document.getElementById("project")
    );
}
