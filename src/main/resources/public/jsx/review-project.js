import React, { Fragment }  from 'react';
import ReactDOM from 'react-dom';
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";

import FormLayout from "./components/FormLayout"
import SectionBlock from "./components/SectionBlock"

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: null,
            stats: null,
            imageryList: null,
            mapConfig: null,
            plotList: null,
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            newSurveyQuestionName: "",
            newValueEntry: {},
            // FIXME: Add these attributes to the JSON database
            dateCreated: null,
            datePublished: null,
            dateClosed: null,
            dateArchived: null,
            stateTransitions: {
                nonexistent: "Create",
                unpublished: "Publish",
                published: "Close",
                closed: "Archive",
                archived: "Archive"
            },
        };
        this.configureGeoDash = this.configureGeoDash.bind(this);
        this.downloadPlotData = this.downloadPlotData.bind(this);
        this.downloadSampleData = this.downloadSampleData.bind(this);
        this.closeProject = this.closeProject.bind(this);
        this.changeAvailability = this.changeAvailability.bind(this);
        this.getParentSurveyQuestions = this.getParentSurveyQuestions.bind(this);
        this.getSurveyQuestionByName = this.getSurveyQuestionByName.bind(this);
        this.getParentSurveyQuestionAnswers=this.getParentSurveyQuestionAnswers.bind(this);
        this.topoSort = this.topoSort.bind(this);
        this.getParentSurveyAnswers=this.getParentSurveyAnswers.bind(this);
        this.gotoProjectDashboard=this.gotoProjectDashboard.bind(this);
    };

    componentDidMount() {
        this.getProjectStats();
        this.getImageryList();
        this.getProjectById();
    }

    publishProject() {
        if (confirm("Do you REALLY want to publish this project?")) {
            utils.show_element("spinner");
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/publish-project/" + this.state.projectDetails.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error publishing project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.projectDetails;
                detailsNew.availability = "published";
                ref.setState({projectDetails: detailsNew});
                utils.hide_element("spinner");
            });
        }
    }

    closeProject() {
        if (confirm("Do you REALLY want to close this project?")) {
            utils.show_element("spinner");
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/close-project/" + this.state.projectDetails.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error closing project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.projectDetails;
                detailsNew.availability = "closed";
                ref.setState({projectDetails: detailsNew});
                utils.hide_element("spinner");
            });
        }
    }

    archiveProject() {
        if (confirm("Do you REALLY want to archive this project?!")) {
            utils.show_element("spinner");
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/archive-project/" + this.state.projectDetails.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error archiving project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.projectDetails;
                detailsNew.availability = "archived";
                ref.setState({projectDetails: detailsNew});
                utils.hide_element("spinner");
                alert("Project " + ref.state.projectDetails.id + " has been archived.");
                window.location = ref.props.documentRoot + "/home";
            });
        }
    }

    changeAvailability() {
        if (this.state.projectDetails.availability == "nonexistent") {
            this.createProject();
        } else if (this.state.projectDetails.availability == "unpublished") {
            this.publishProject();
        } else if (this.state.projectDetails.availability == "published") {
            this.closeProject();
        } else if (this.state.projectDetails.availability == "closed") {
            this.archiveProject();
        }
    }

    configureGeoDash() {

        if (this.state.plotList != null && this.state.projectDetails != null) {
            window.open(this.props.documentRoot + "/widget-layout-editor?editable=true&"
                + encodeURIComponent("institutionId=" + this.state.projectDetails.institution
                    + "&pid=" + this.state.projectDetails.id),
                "_geo-dash");
        }
    }

    downloadPlotData() {
        window.open(this.props.documentRoot + "/dump-project-aggregate-data/" + this.state.projectDetails.id, "_blank");
    }

    downloadSampleData() {
        window.open(this.props.documentRoot + "/dump-project-raw-data/" + this.state.projectDetails.id, "_blank");
    }

    getParentSurveyQuestions(sampleSurvey) {
        return sampleSurvey.filter(
            function (surveyQuestion) {
                return surveyQuestion.parent_question==-1;
            }
        );
    }

    getParentSurveyQuestionAnswers(sampleSurvey) {
        var ans = [];
        sampleSurvey.map((sq) => {
                var parent_value = document.getElementById("value-parent");

                if(parent_value!=null) {
                    var parent = parent_value.options[parent_value.selectedIndex].value;
                    if (sq.id == parent) {
                        ans = sq.answers;
                    }
                }
            }
        );
        return ans;
    }

    getParentSurveyAnswers(sampleSurvey,question_id) {
        var ans = [];
        sampleSurvey.map((sq) => {
                if (sq.id == question_id) {
                    ans = sq.answers;
                }
            }
        );
        return ans;
    }

    getChildSurveyQuestions(sampleSurvey, parentSurveyQuestion) {
        return sampleSurvey.filter(
            function (surveyQuestion) {
                return surveyQuestion.parent_question == parentSurveyQuestion.id;
            }
        );
    }

    topoSort(sampleSurvey) {
        var parentSurveyQuestions = this.getParentSurveyQuestions(sampleSurvey);
        var parentChildGroups = parentSurveyQuestions.map(
            function (parentSurveyQuestion) {
                var childSurveyQuestions = sampleSurvey.filter(
                    function (sampleValue) {
                        return sampleValue.parent_question == parentSurveyQuestion.id;
                    }
                );
                return [parentSurveyQuestion].concat(childSurveyQuestions);
            },
            this
        );
        return [].concat.apply([], parentChildGroups);
    }

    getSurveyQuestionByName(surveyQuestionName) {
        return this.state.projectDetails.sampleValues.find(
            function (surveyQuestion) {
                return surveyQuestion.question == surveyQuestionName;
            }
        );
    }

    getProjectById() {
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
                    var detailsNew=data;
                    var sv=detailsNew.sampleValues;
                    var newSV=[];
                    var tempSQ={id:-1,question:"",answers:[],parent_question: -1,parent_answer: -1};
                    if(sv.length>0){
                        sv.map((sq)=>{
                                if(sq.name){
                                    tempSQ.id=sq.id;
                                    tempSQ.question=sq.name;
                                    sq.values.map((sa)=>{
                                        if(sa.name){
                                            if(sa.id>0){
                                                tempSQ.answers.push({id:sa.id,answer:sa.name,color:sa.color});
                                            }
                                        }
                                        else {
                                            tempSQ.answers.push(sa);
                                        }

                                    });
                                    if(tempSQ.id>0){
                                        newSV.push(tempSQ);
                                    }
                                }
                                else{
                                    newSV.push(sq);
                                }
                            }
                        );
                    }
                    detailsNew.sampleValues=newSV;
                    this.setState({projectDetails: detailsNew});
                    this.updateUnmanagedComponents(projectId);

                }
            });
    }

    getProjectStats() {
        const { projectId } = this.props
        fetch(this.props.documentRoot + "/get-project-stats/" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving project stats. See console for details.");
                }
            })
            .then(data => {
                this.setState({stats: data});
            });
    }

    getImageryList() {
        // FIXME use the project data to find the institutionId
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.props.institutionId)
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

    showPlotCenters(projectId, maxPlots) {
        fetch(this.props.documentRoot + "/get-project-plots/" + projectId + "/" + maxPlots)
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
                mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.projectDetails.plotShape);
            })
            .catch(e => this.setState({plotList: null}));
    }

    showProjectMap(projectId) {
        // Initialize the basemap
        if (this.state.mapConfig == null) {
            this.setState({mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)});
        }

        mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource);
        
        // Extract bounding box coordinates from the project boundary and show on the map
        var boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
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

        // Show plots
        mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");
        this.showPlotCenters(projectId, 300);
    }

    updateUnmanagedComponents(projectId) {
        if (this.state.projectDetails != null) {
            if (this.state.imageryList && this.state.imageryList.length > 0) {
                var detailsNew = this.state.projectDetails;
                detailsNew.baseMapSource = this.state.projectDetails.baseMapSource || this.state.imageryList[0].title;
                // If baseMapSource isn't provided by the project, just use the first entry in the imageryList
                this.setState({projectDetails: detailsNew});
                this.showProjectMap(projectId)
                // Draw a map with the project AOI and a sampling of its plots
            }
        }
    }
    gotoProjectDashboard(){
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
                        {this.state.stats && 
                            <ProjectStats project={this.state}/>
                        }
                        <ProjectDesignReview 
                            projectId={this.props.projectId} 
                            project={this.state}
                            project_template_visibility={false}
                            setBaseMapSource={this.setBaseMapSource}
                            topoSort={this.topoSort} 
                            getParentSurveyQuestions={this.getParentSurveyQuestions} 
                            getParentSurveyQuestionAnswers={this.getParentSurveyQuestionAnswers}
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

function ProjectStats({ project }) {
    return (
        <div className="row mb-3">
            <div id="project-stats" className={"col "}>
                <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                        href="#project-stats-collapse" role="button" aria-expanded="false"
                        aria-controls="project-stats-collapse">
                    Project Stats
                </button>
                <div className="collapse col-xl-12" id="project-stats-collapse">
                    <table className="table table-sm">
                        <tbody>
                        <tr>
                            <td>Members</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.stats.members}</span></td>
                            <td>Contributors</td>
                            <td>{project.stats.contributors}</td>
                        </tr>
                        <tr>
                            <td>Total Plots</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.projectDetails ? project.projectDetails.numPlots : 0}</span></td>
                            <td>Date Created</td>
                            <td>{project.dateCreated}</td>
                        </tr>
                        <tr>
                            <td>Flagged Plots</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.stats.flaggedPlots}</span></td>
                            <td>Date Published</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.datePublished}</span></td>
                        </tr>
                        <tr>
                            <td>Analyzed Plots</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.stats.analyzedPlots}</span></td>
                            <td>Date Closed</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.dateClosed}</span></td>
                        </tr>
                        <tr>
                            <td>Unanalyzed Plots</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.stats.unanalyzedPlots}</span></td>
                            <td>Date Archived</td>
                            <td><span className="badge badge-pill bg-lightgreen">{project.dateArchived}</span></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    );
}

function ProjectDesignReview(props) {
    return (
        <form id="project-design-form" className="px-2 pb-2">
            <ProjectInfoReview project={props.project}/>
            <ProjectVisibility project={props.project}/>
            <ProjectAOI projectId={props.projectId} project={props.project}/>
            {props.project.imageryList &&
                <ProjectImageryReview project={props.project} setBaseMapSource={props.setBaseMapSource}/>
            }
            <PlotReview project={props.project}/>
            <SampleReview project={props.project}/>
            <SurveyReview 
                project={props.project} projectId={props.projectId}
                topoSort={props.topoSort}
                getParentSurveyQuestions={props.getParentSurveyQuestions} 
                getParentSurveyQuestionAnswers={props.getParentSurveyQuestionAnswers}
            />

        </form>
    );
}

function ProjectInfoReview({ project }) {
    return (
        <SectionBlock id="project-info" title="Project Info">
            <h3>Name</h3>
            <p className="ml-2">{project.projectDetails.name}</p>
            <h3>Description</h3>
            <p className="ml-2">{project.projectDetails.description}</p>
        </SectionBlock>
    );
}

// FIXME potential to let the user change the visibility
function ProjectVisibility(props) {
    return (
        <SectionBlock title="Project Visibility">
            <h3>Privacy Level</h3>
            <div id="project-visibility" className="mb-3">
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                            value="public" defaultChecked={props.project.projectDetails.privacyLevel === 'public'}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-public">Public: <i>All Users</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                            value="private"
                            defaultChecked={props.project.projectDetails.privacyLevel === 'private'}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-private">Private: <i>Group
                        Admins</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-institution"
                            name="privacy-level"
                            value="institution"
                            defaultChecked={props.project.projectDetails.privacyLevel === 'institution'}
                            disabled
                            />
                    <label className="form-check-label small" htmlFor="privacy-institution">Institution: <i>Group
                        Members</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-invitation"
                            name="privacy-level"
                            value="invitation"
                            defaultChecked={props.project.projectDetails.privacyLevel === 'invitation'}
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

function ProjectImageryReview({ project, setBaseMapSource}) {
    return (
        <SectionBlock id="project-imagery-review" title="Project Imagery">
            <h3>Basemap Source</h3>
            <p className="ml-2">{project.projectDetails.baseMapSource}</p>
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
                            {plotDistribution === 'gridded' &&
                                <tr>
                                    <td className="w-80">Plot spacing</td>
                                    <td className="w-20 text-center">
                                        <span className="badge badge-pill bg-lightgreen">{plotSpacing} m</span>
                                    </td>
                                </tr>
                            }
                            {plotDistribution != 'shp' &&
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

function SampleReview({ project: { projectDetails: { plotDistribution, sampleDistribution, samplesPerPlot, sampleResolution }} }){

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
                        {sampleDistribution === 'gridded' &&
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

function SurveyReview(props){
    return (
        <SectionBlock title="Survey Design">
            <div id="survey-design">
                <SurveyQuestionTree project={props.project} projectId={props.projectId}
                                    topoSort={props.topoSort}
                                    getParentSurveyQuestions={props.getParentSurveyQuestions}/>
            </div>
        </SectionBlock>
    );
}
class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
    };
    getCurrent = (node) => this.props.project.projectDetails.sampleValues.filter(cNode => cNode.parent_question == node).map((cNode,uid) => (
        <ul  key={`node_${uid}`} style={{listStyleType:"none"}}>
            <li>
                <SurveyQuestion prop={this.props} surveyQuestion={cNode}/>
                {this.getCurrent(cNode.id)}
            </li>

        </ul>
    ))
    render() {
        var project = this.props.project;
        if (project.projectDetails != null) {
            return (
                <div>
                    {this.getCurrent(-1)}
                </div>
            );
        }
        else {
            return (<span></span>);
        }
    }
}

function SurveyQuestion(properties) {
    var props = properties.prop;
    var project = props.project;
    if (properties.surveyQuestion.answers == null) {
        console.log("answers null");
    }
    if (project.projectDetails != null) {
        return (
            <div className="sample-value-info">
                <h3 className="header px-0">
                    <label> Survey Question: {properties.surveyQuestion.question}</label>
                </h3>
                <table className="table table-sm">
                    <thead>
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">Answer</th>
                        <th scope="col">Color</th>
                        <th scope="col">&nbsp;</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        (properties.surveyQuestion.answers).map((surveyAnswer, uid) => {
                                return <tr key={uid}>
                                    <td>
                                        {surveyAnswer.answer}
                                    </td>
                                    <td>
                                        <div className="circle"
                                             style={{backgroundColor: surveyAnswer.color, border: "solid 1px"}}></div>
                                    </td>
                                    <td>
                                        &nbsp;
                                    </td>
                                </tr>
                            }
                        )
                    }
                    </tbody>
                </table>
            </div>
        );
    }
    else {
        return (<span></span>);
    }
}

function ProjectManagement(props) {
    var project = props.project;
    var buttons = "";
    if (project.projectDetails != null) {
        buttons = <React.Fragment>
            <input type="button" id="project-dashboard" className="btn btn-outline-lightgreen btn-sm btn-block"
                   name="project-dashboard" value="Project Dashboard"
                   onClick={props.gotoProjectDashboard}
                   style={{display:'block'}}/>
            <input type="button" id="configure-geo-dash" className="btn btn-outline-lightgreen btn-sm btn-block"
                   name="configure-geo-dash" value="Configure Geo-Dash"
                   onClick={props.configureGeoDash}
                   style={{display: project.projectDetails.availability == 'unpublished' || project.projectDetails.availability == 'published' ? 'block' : 'none'}}/>
            <input type="button" id="download-plot-data"
                   className="btn btn-outline-lightgreen btn-sm btn-block"
                   name="download-plot-data" value="Download Plot Data"
                   onClick={props.downloadPlotData}
                   style={{display: project.projectDetails.availability == 'published' || project.projectDetails.availability == 'closed' ? 'block' : 'none'}}/>
            <input type="button" id="download-sample-data"
                   className="btn btn-outline-lightgreen btn-sm btn-block"
                   name="download-sample-data" value="Download Sample Data"
                   onClick={props.downloadSampleData}
                   style={{display: project.projectDetails.availability == 'published' || project.projectDetails.availability == 'closed' ? 'block' : 'none'}}/>
            <input type="button" id="change-availability"
                   className="btn btn-outline-danger btn-sm btn-block"
                   name="change-availability"
                   value={project.stateTransitions[project.projectDetails.availability] + "Project"}
                   onClick={props.changeAvailability}/>
        </React.Fragment>
    }
    return (
        <div id="project-management" className="col mb-3">
            <h2 className="header px-0">Project Management</h2>
            <div className="row">
                {buttons}
                <div id="spinner"></div>
            </div>
        </div>
    );
}

export function renderReviewProjectPage(args) {
    ReactDOM.render(
        // FIXME get institution from project data.
        <Project documentRoot={args.documentRoot} userId={args.userId} projectId={args.projectId} institutionId={args.institutionId}/>,
        document.getElementById("project")
    );
}
