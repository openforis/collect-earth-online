import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';

import FormLayout from "./components/FormLayout"
import SectionBlock from "./components/SectionBlock"
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            templateDetails: null,
            templateId: "0",
            useTemplatePlots: false,
            imageryList: null,
            mapConfig: null,
            plotList: null,
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            newSurveyQuestionName: "",
            newValueEntry: {},
            projectList: null,
        };
        this.setPrivacyLevel = this.setPrivacyLevel.bind(this);
        this.setTemplatePlots = this.setTemplatePlots.bind(this);
        this.setPlotDistribution = this.setPlotDistribution.bind(this);
        this.setPlotShape = this.setPlotShape.bind(this);
        this.setSampleDistribution = this.setSampleDistribution.bind(this);
        this.setBaseMapSource = this.setBaseMapSource.bind(this);
        this.showProjectMap = this.showProjectMap.bind(this);
        this.addSurveyQuestion = this.addSurveyQuestion.bind(this);
        this.removeSurveyQuestion = this.removeSurveyQuestion.bind(this);
        this.addSurveyQuestionRow = this.addSurveyQuestionRow.bind(this);
        this.getParentSurveyQuestions = this.getParentSurveyQuestions.bind(this);
        this.setProjectTemplate = this.setProjectTemplate.bind(this);
        this.getSurveyQuestionByName = this.getSurveyQuestionByName.bind(this);
        this.getParentSurveyQuestionAnswers=this.getParentSurveyQuestionAnswers.bind(this);
        this.removeSurveyQuestionRow = this.removeSurveyQuestionRow.bind(this);
        this.handleInputName = this.handleInputName.bind(this);
        this.handleInputColor = this.handleInputColor.bind(this);
        this.handleInputParent = this.handleInputParent.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.topoSort = this.topoSort.bind(this);
        this.createProject = this.createProject.bind(this);
        this.getParentSurveyAnswers=this.getParentSurveyAnswers.bind(this);
    };

    componentDidMount() {
        // FIXME, combine promises to load map only once after all data is back
        this.getImageryList();
        this.getProjectById();
        this.getProjectList();
    }

    createProject() {
        if (confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            var formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.props.institutionId);
            formData.append("sample-values", JSON.stringify(this.state.templateDetails.sampleValues));
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/create-project",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
                data: formData
            }).fail(function () {
                utils.hide_element("spinner");
                alert("Error creating project. See console for details.");
            }).done(function (data) {
                if (parseInt(data)) {
                    var detailsNew = ref.state.templateDetails;
                    detailsNew.availability = "unpublished";
                    ref.setState({templateDetails: detailsNew});
                    utils.hide_element("spinner");
                    var newProjectId = data;
                    window.location = ref.props.documentRoot + "/review-project/" + newProjectId;
                } else {
                    utils.hide_element("spinner");
                    alert(data);
                }
            });
        }
    }

    setProjectTemplate(event) {
        this.setState({templateId: event.target.value});
        const templateProject = this.state.projectList.find(
            function (project) {
                return project.id == event.target.value;
            },
            this
        );
        var sv=(JSON.parse(JSON.stringify(templateProject))).sampleValues;
        var newSV=[];
        var tempSQ={id:-1,question:"",answers:[],parent_question: -1,parent_answer: -1};
        var dNew = this.state.newValueEntry;

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
                            dNew[tempSQ.question] ={id:-1,answer:"",color:"#000000"};
                            this.setState({newValueEntry: dNew});
                        }
                    }
                    else{
                        newSV.push(sq);
                        dNew[sq.question] ={id:-1,answer:"",color:"#000000"};
                        this.setState({newValueEntry: dNew});
                    }
                }
            );
        }

        templateProject.sampleValues=newSV;
        this.setState({templateDetails: JSON.parse(JSON.stringify(templateProject))},
            function () {
                this.updateUnmanagedComponents(this.state.templateId);
            }
        ); // clone project

    }

    setPrivacyLevel(privacyLevel) {
        if (this.state.templateDetails != null) {
            var detailsNew = this.state.templateDetails;
            detailsNew.privacyLevel = privacyLevel;
            this.setState({templateDetails: detailsNew});
        }
    }

    setBaseMapSource() {
        var e = document.getElementById("base-map-source");
        var bms = e.options[e.selectedIndex].value;
        var detailsNew = this.state.templateDetails;
        detailsNew.baseMapSource = bms;

        this.setState({templateDetails: detailsNew});
        mercator.setVisibleLayer(this.state.mapConfig, this.state.templateDetails.baseMapSource);
    }

    setTemplatePlots(useTemplatePlots) {
        this.setState({useTemplatePlots: useTemplatePlots});
    }

    setPlotDistribution(plotDistribution) {
        if (this.state.templateDetails != null) {
            var detailsNew = this.state.templateDetails;
            detailsNew.plotDistribution = plotDistribution;
            this.setState({templateDetails: detailsNew});
        }
    }

    setPlotShape(plotShape) {
        if (this.state.templateDetails != null) {
            var detailsNew = this.state.templateDetails;
            detailsNew.plotShape = plotShape;
            this.setState({templateDetails: detailsNew});
        }
    }

    setSampleDistribution(sampleDistribution) {
        if (this.state.templateDetails != null) {
            var detailsNew = this.state.templateDetails;
            detailsNew.sampleDistribution = sampleDistribution;
            this.setState({templateDetails: detailsNew});
        }
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

    addSurveyQuestion(){
        if (this.state.templateDetails != null) {
            var questionText = document.getElementById("surveyQuestionText").value;
            var parent_value = document.getElementById("value-parent");

            var parent = parent_value.options[parent_value.selectedIndex].value;

            var answer_value = document.getElementById("value-answer");

            var answer = answer_value.options[answer_value.selectedIndex].value;
            if (questionText != "") {
                var newValueEntryNew = this.state.newValueEntry;
                newValueEntryNew[questionText] = {id:-1,answer: "", color: "#000000"};
                var detailsNew = this.state.templateDetails;
                var _id = detailsNew.sampleValues.length + 1;
                var question_id = -1,answer_id=-1;
                detailsNew.sampleValues.map((sq) => {
                        if (sq.id == parent) {
                            question_id = sq.id;
                            this.getParentSurveyAnswers(detailsNew.sampleValues,question_id).map((ans) => {
                                    if (ans.id == answer) {
                                        answer_id = ans.id;
                                    }
                                }
                            );
                        }
                    }
                );

                detailsNew.sampleValues.push({id: _id, question: questionText, answers: [], parent_question: question_id,parent_answer:answer_id});
                this.setState({newValueEntry: newValueEntryNew, templateDetails: detailsNew, newSurveyQuestionName: ""});
                document.getElementById("surveyQuestionText").value = "";
                parent_value.options[0].selected = true;
            } else {
                alert("Please enter a survey question first.");
            }
        }
    }

    removeSurveyQuestion(surveyQuestionName) {
        if (this.state.templateDetails != null) {
            var detailsNew = this.state.templateDetails;
            detailsNew.sampleValues = detailsNew.sampleValues.filter(
                function (surveyQuestion) {
                    return surveyQuestion.question != surveyQuestionName;
                }
            );
            this.setState({
                templateDetails: detailsNew
            });
        }
    }

    getSurveyQuestionByName(surveyQuestionName) {
        return this.state.templateDetails.sampleValues.find(
            function (surveyQuestion) {
                return surveyQuestion.question == surveyQuestionName;
            }
        );
    }

    removeSurveyQuestionRow(surveyQuestionText, _surveyAnswer) {
        var surveyQuestion = this.getSurveyQuestionByName(surveyQuestionText);
        surveyQuestion.answers = surveyQuestion.answers.filter(
            function (surveyAnswer) {
                return surveyAnswer.answer != _surveyAnswer;
            }
        );
        this.setState({});
    }

    addSurveyQuestionRow(surveyQuestionName) {
        var entry = this.state.newValueEntry[surveyQuestionName];
        if (entry.answer != "") {
            var surveyQuestion = this.getSurveyQuestionByName(surveyQuestionName);
            surveyQuestion.answers.push({
                id:surveyQuestion.answers.length+1,
                answer: entry.answer,
                color: entry.color
            });
            entry.id=-1;
            entry.answer = "";
            entry.color = "#000000";
        } else {
            alert("A survey answer must possess both an answer and a color.");
        }
        var dNew = this.state.newValueEntry;
        dNew[surveyQuestionName] = entry;
        this.setState({newValueEntry: dNew});
    }

    getProjectById() {
        const projectId = "0";
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
                    this.setState({templateDetails: detailsNew});
                    this.updateUnmanagedComponents("0");
                }
            });
    }

    getProjectList() {
        const { userId } = this.props
        fetch(this.props.documentRoot + "/get-all-projects?userId=" + userId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project list. See console for details.");
                }
            })
            .then(data => {

                this.setState({projectList: data});
                let projList = this.state.projectList;
                projList.unshift(JSON.parse(JSON.stringify(this.state.templateDetails)));
                this.setState({projectList: projList});
                this.updateUnmanagedComponents("0");
            });
    }

    getImageryList() {
        const { institutionId } = this.props
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
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
                mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.details.plotShape);
            })
            .catch(e => this.setState({plotList: null}));
    }

    showProjectMap(projectId) {
        // Initialize the basemap
        if (this.state.mapConfig == null) {
            this.setState({mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)});
        }

        mercator.setVisibleLayer(this.state.mapConfig, this.state.templateDetails.baseMapSource);
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");

        if (this.state.templateDetails.id == 0) {
            // Enable dragbox interaction if we are creating a new project
            var displayDragBoxBounds = function (dragBox) {
                var extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                document.getElementById("lon-min").value = extent[0];
                document.getElementById("lat-min").value = extent[1];
                document.getElementById("lon-max").value = extent[2];
                document.getElementById("lat-max").value = extent[3];
            };
            
            mercator.disableDragBoxDraw(this.state.mapConfig);
            mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
        } else {
            // Extract bounding box coordinates from the project boundary and show on the map
            var boundaryExtent = mercator.parseGeoJson(this.state.templateDetails.boundary, false).getExtent();
            // FIXME like above, these values are stored in the state but never used.
            this.setState({lonMin: boundaryExtent[0]});
            this.setState({latMin: boundaryExtent[1]});
            this.setState({lonMax: boundaryExtent[2]});
            this.setState({latMax: boundaryExtent[3]});

            // Display a bounding box with the project's AOI on the map and zoom to it
            mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
            mercator.addVectorLayer(this.state.mapConfig,
                "currentAOI",
                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.templateDetails.boundary, true)),
                ceoMapStyles.yellowPolygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

            // Get the new plotlist
            this.showPlotCenters(projectId, 300);
        }
    }

    updateUnmanagedComponents(projectId) {
        if (this.state.templateDetails != null) {
            if (this.state.imageryList && this.state.imageryList.length > 0) {
                var detailsNew = this.state.templateDetails;
                // If baseMapSource isn't provided by the project, just use the first entry in the imageryList
                detailsNew.baseMapSource = this.state.templateDetails.baseMapSource || this.state.imageryList[0].title;
                this.setState({templateDetails: detailsNew});
                this.showProjectMap(projectId);
                // Draw a map with the project AOI and a sampling of its plots
            }
        }
    }

    handleInputName(surveyQuestion, event) {
        var newValueEntryNew = this.state.newValueEntry;
        if (newValueEntryNew[surveyQuestion]) {
            newValueEntryNew[surveyQuestion].answer = event.target.value;
            this.setState({newValueEntry:newValueEntryNew});
        }
        else
            this.setState({newValueEntry:{id:-1,answer: "", color: "#000000"}});
    }

    handleInputColor(surveyQuestion, event) {
        var newValueEntryNew = this.state.newValueEntry;
        newValueEntryNew[surveyQuestion].color = event.target.value;

        this.setState({newValueEntry: newValueEntryNew});

    }

    handleInputParent(event) {
        var detailsNew = this.state.templateDetails;
        this.setState({templateDetails: detailsNew});
    }

    handleChange(event) {
        var detailsNew = this.state.templateDetails;

        if (event.target.id == "project-name") {
            detailsNew.name = event.target.value;
        }
        else if (event.target.id = "project-description") {
            detailsNew.description = event.target.value;
        }
        this.setState({templateDetails: detailsNew});

    }

    render() {
        return (
            <FormLayout id="project-design" title="Create Project">
                {this.state.templateDetails && 
                    <Fragment>
                        <ProjectDesignForm 
                            project={this.state}
                            setProjectTemplate={this.setProjectTemplate} 
                            setPrivacyLevel={this.setPrivacyLevel}
                            setSampleDistribution={this.setSampleDistribution}
                            addSurveyQuestionRow={this.addSurveyQuestionRow}
                            setBaseMapSource={this.setBaseMapSource}
                            setPlotDistribution={this.setPlotDistribution} 
                            setPlotShape={this.setPlotShape}
                            setTemplatePlots={this.setTemplatePlots}
                            addSurveyQuestion={this.addSurveyQuestion}
                            topoSort={this.topoSort} 
                            getParentSurveyQuestions={this.getParentSurveyQuestions} 
                            getParentSurveyQuestionAnswers={this.getParentSurveyQuestionAnswers}
                            removeSurveyQuestion={this.removeSurveyQuestion}
                            removeSurveyQuestionRow={this.removeSurveyQuestionRow}
                            handleInputColor={this.handleInputColor} 
                            handleInputName={this.handleInputName}
                            handleChange={this.handleChange} 
                            handleInputParent={this.handleInputParent}
                        />
                        <ProjectManagement project={this.state} createProject={this.createProject} />
                    </Fragment>
                }
            </FormLayout>
        );
    }
}

function ProjectDesignForm(props) {
    return (
        <form id="project-design-form" className="px-2 pb-2" method="post"
              action={props.documentRoot + "/create-project"}
              encType="multipart/form-data">
        
                {props.project.projectList && 
                    <ProjectTemplateVisibility 
                        project={props.project} 
                        setProjectTemplate={props.setProjectTemplate} 
                    />
                }
                <ProjectInfo project={props.project} handleChange={props.handleChange}/>
                <ProjectVisibility project={props.project} setPrivacyLevel={props.setPrivacyLevel}/>
                <ProjectAOI project={props.project}/>
                {props.project.imageryList && 
                    <ProjectImagery project={props.project} setBaseMapSource={props.setBaseMapSource}/>
                }
                <PlotDesign 
                    project={props.project} 
                    useTemplatePlots={props.useTemplatePlots}
                    setPlotDistribution={props.setPlotDistribution}
                    setPlotShape={props.setPlotShape}
                    setTemplatePlots={props.setTemplatePlots}
                />
                {!props.project.useTemplatePlots && 
                    <SampleDesign project={props.project} setSampleDistribution={props.setSampleDistribution}/>
                }
                <SurveyDesign 
                    project={props.project}
                    addSurveyQuestionRow={props.addSurveyQuestionRow}
                    addSurveyQuestion ={props.addSurveyQuestion} 
                    topoSort={props.topoSort}
                    getParentSurveyQuestions={props.getParentSurveyQuestions} 
                    getParentSurveyQuestionAnswers={props.getParentSurveyQuestionAnswers}
                    removeSurveyQuestion={props.removeSurveyQuestion}
                    removeSurveyQuestionRow={props.removeSurveyQuestionRow}
                    handleInputColor={props.handleInputColor}
                    handleInputName={props.handleInputName}
                    handleInputParent={props.handleInputParent}
                />

        </form>
    );
}

function ProjectTemplateVisibility({ project, setProjectTemplate }) {
    return (
        <SectionBlock title = "Use Project Template (Optional)">
            <div id="project-template-selector">
                <div className="form-group">
                    <h3 htmlFor="project-template">Select Project</h3>
                    <select className="form-control form-control-sm" id="project-template"
                            name="project-template"
                            size="1" value={project.templateId} onChange={setProjectTemplate}>
                        {
                            project.projectList
                                .filter(proj => proj != null)
                                .map((proj,uid) =>
                                    <option key={uid} value={proj.id}>{proj.name}</option>
                                )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}


function ProjectInfo(props) {
    const { project: { templateDetails } } = props;
    return (
        <SectionBlock title="Project Info">
            <div id="project-info">
                <div className="form-group">
                    <h3 htmlFor="project-name">Name</h3>
                    <input className="form-control form-control-sm" type="text" id="project-name" name="name"
                        autoComplete="off" defaultValue={templateDetails.name}
                        onChange={props.handleChange}/>
                </div>
                <div className="form-group">
                    <h3 htmlFor="project-description">Description</h3>
                    <textarea className="form-control form-control-sm" id="project-description"
                            name="description"
                            value={templateDetails.description} onChange={props.handleChange}></textarea>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectVisibility({ project : { templateDetails : { privacyLevel } } }) {
    return (
        <SectionBlock title= "Project Visibility">
            <h3>Privacy Level</h3>
            <div id="project-visibility" className="mb-3" style={{'font-size': '.9rem'}}>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                            value="public" checked={privacyLevel === 'public'}
                            onChange={() => props.setPrivacyLevel('public')}/>
                    <label className="form-check-label" htmlFor="privacy-public">Public: <i>All Users</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                            value="private" onChange={() => props.setPrivacyLevel('private')}
                            checked={privacyLevel === 'private'}/>
                    <label className="form-check-label" htmlFor="privacy-private">Private: <i>Group
                        Admins</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-institution"
                            name="privacy-level"
                            value="institution" onChange={() => props.setPrivacyLevel('institution')}
                            checked={privacyLevel === 'institution'}/>
                    <label className="form-check-label" htmlFor="privacy-institution">Institution: <i>Group
                        Members</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-invitation"
                            name="privacy-level"
                            value="invitation" onChange={() => props.setPrivacyLevel('invitation')} disabled
                            checked={privacyLevel === 'invitation'}/>
                    <label className="form-check-label" htmlFor="privacy-invitation">Invitation: <i>Coming
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
                <div id="project-map">
                    <div className="col small text-center mb-2">Hold CTRL and click-and-drag a bounding box on the map</div>
                    <div className="form-group mx-4">
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lat-max" name="lat-max"
                                    defaultValue={latMax} placeholder="North" autoComplete="off" min="-90.0"
                                    max="90.0" step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                    defaultValue={lonMin} placeholder="West" autoComplete="off" min="-180.0"
                                    max="180.0" step="any"
                                />
                            </div>
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                    defaultValue={lonMax} placeholder="East" autoComplete="off" min="-180.0"
                                    max="180.0" step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                    defaultValue={latMin} placeholder="South" autoComplete="off" min="-90.0"
                                    max="90.0" step="any"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectImagery({ project, setBaseMapSource }) {
    return (
        <SectionBlock title="Project Imagery">
            <div id="project-imagery">
                <div className="form-group">
                    <h3 htmlFor="base-map-source">Basemap Source</h3>
                    <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                        size="1"
                        value={project.templateDetails && project.templateDetails.baseMapSource != null
                            ? project.templateDetails.baseMapSource
                            : ""}
                        onChange={setBaseMapSource}>
                        {
                            project.imageryList.map((imagery, uid) =>
                                <option key={uid} value={imagery.title}>{imagery.title}</option>
                            )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}

class PlotDesign extends React.Component {
  constructor(props) {
    super(props);
  }

  encodeImageFileAsURL(event) {
    var file = event.target.files[0];
    let reader = new FileReader();
    reader.onloadend = function() {
      let base64Data = reader.result;
      console.log("RESULT", base64Data);
    };
    reader.readAsDataURL(file);
  }

  render() {
    var {
      project: {
        useTemplatePlots,
        templateDetails,
        templateDetails: { plotDistribution, plotShape }
      }
    } = this.props;
    return (
      <SectionBlock title="Plot Design">
        <div id="plot-design">
          <div className="row">
            <div id="plot-design-col1" className="col">
              <h3>Template Plots</h3>
              <div className="form-check form-check-inline mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="use-template-plots"
                  name="use-template-plots"
                  defaultValue={useTemplatePlots}
                  onChange={() =>
                    this.props.setTemplatePlots(!useTemplatePlots)
                  }
                  checked={useTemplatePlots}
                />
                <label
                  className="form-check-label medium"
                  htmlFor="use-template-plots"
                >
                  Use Template Plots and Samples
                </label>
              </div>

              {!useTemplatePlots && (
                <Fragment>
                  <h3>Spatial Distribution</h3>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-random"
                      name="plot-distribution"
                      defaultValue="random"
                      onChange={() => this.props.setPlotDistribution("random")}
                      checked={plotDistribution === "random"}
                    />
                    <label
                      className="form-check-label medium"
                      htmlFor="plot-distribution-random"
                    >
                      Random
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-gridded"
                      name="plot-distribution"
                      defaultValue="gridded"
                      onChange={() => this.props.setPlotDistribution("gridded")}
                      checked={plotDistribution === "gridded"}
                    />
                    <label
                      className="form-check-label medium"
                      htmlFor="plot-distribution-gridded"
                    >
                      Gridded
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-csv"
                      name="plot-distribution"
                      defaultValue="csv"
                      onChange={() => this.props.setPlotDistribution("csv")}
                      checked={plotDistribution === "csv"}
                    />
                    <label
                      className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                      id="custom-csv-upload"
                    >
                      <medium>Upload CSV</medium>
                      <input
                        type="file"
                        accept="text/csv"
                        id="plot-distribution-csv-file"
                        defaultValue=""
                        name="plot-distribution-csv-file"
                        onChange={this.encodeImageFileAsURL}
                        style={{ display: "none" }}
                        disabled={plotDistribution != "csv"}
                      />
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-shp"
                      name="plot-distribution"
                      defaultValue="shp"
                      onChange={() => this.props.setPlotDistribution("shp")}
                      checked={plotDistribution === "shp"}
                    />
                    <label
                      className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                      id="custom-shp-upload"
                    >
                      <medium>Upload SHP</medium>
                      <input
                        type="file"
                        accept="application/zip"
                        id="plot-distribution-shp-file"
                        defaultValue=""
                        name="plot-distribution-shp-file"
                        onChange={this.encodeImageFileAsURL}
                        style={{ display: "none" }}
                        disabled={plotDistribution != "shp"}
                      />
                    </label>
                  </div>
                  <p id="plot-design-text" className="font-italic ml-2">-
                    {plotDistribution === "random" &&
                      "Plot centers will be randomly distributed within the AOI."}
                    {plotDistribution === "gridded" &&
                      "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below."}
                    {plotDistribution === "csv" &&
                      "Specify your own plot centers by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID."}
                    {plotDistribution === "shp" &&
                      "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID field."}
                  </p>

                  <div className="form-group mb-1">
                    <p htmlFor="num-plots">Number of plots</p>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      id="num-plots"
                      name="num-plots"
                      autoComplete="off"
                      min="0"
                      step="1"
                      defaultValue={templateDetails.numPlots || ""}
                      disabled={plotDistribution != "random"}
                    />
                  </div>
                  <div className="form-group mb-1">
                    <p htmlFor="plot-spacing">Plot spacing (m)</p>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      id="plot-spacing"
                      name="plot-spacing"
                      autoComplete="off"
                      min="0.0"
                      step="any"
                      defaultValue={templateDetails.plotSpacing || ""}
                      disabled={plotDistribution != "gridded"}
                    />
                  </div>
                  <hr />
                  <h3>Plot Shape</h3>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-shape-circle"
                      name="plot-shape"
                      defaultValue="circle"
                      onChange={() => this.props.setPlotShape("circle")}
                      checked={plotShape === "circle"}
                      disabled={plotDistribution === "shp"}
                    />
                    <label
                      className="form-check-label medium"
                      htmlFor="plot-shape-circle"
                    >
                      Circle
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-shape-square"
                      name="plot-shape"
                      defaultValue="square"
                      onChange={() => this.props.setPlotShape("square")}
                      checked={plotShape === "square"}
                      disabled={plotDistribution === "shp"}
                    />
                    <label
                      className="form-check-label medium"
                      htmlFor="plot-shape-square"
                    >
                      Square
                    </label>
                  </div>
                  <p htmlFor="plot-size">
                    {plotShape == "circle" ? "Diameter (m)" : "Width (m)"}
                  </p>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    id="plot-size"
                    name="plot-size"
                    autoComplete="off"
                    min="0.0"
                    step="any"
                    defaultValue={templateDetails.plotSize}
                    disabled={plotDistribution === "shp"}
                  />
                </Fragment>
              )}
            </div>
          </div>
        </div>
      </SectionBlock>
    );
  }
}


class SampleDesign extends React.Component {
    constructor(props) {
        super(props);
    };
    encodeImageFileAsURL(event) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onloadend = function () {
            let base64Data = reader.result;
            console.log('RESULT', base64Data);
        };
        reader.readAsDataURL(file);
    }
    render() {
        const { project: { templateDetails: { plotDistribution, sampleDistribution, samplesPerPlot, sampleResolution } } } = this.props;
        return (
            <SectionBlock title="Sample Design">
                <div id="sample-design">
                    <h3>Spatial Distribution</h3>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" type="radio" id="sample-distribution-random"
                            name="sample-distribution" defaultValue="random"
                            onChange={() => this.props.setSampleDistribution('random')}
                            checked={sampleDistribution === 'random'}
                            disabled={plotDistribution === 'shp'}
                        />
                        <label className="form-check-label medium"
                            htmlFor="sample-distribution-random">
                            Random
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" type="radio" id="sample-distribution-gridded"
                            name="sample-distribution" defaultValue="gridded"
                            onChange={() => this.props.setSampleDistribution('gridded')}
                            checked={sampleDistribution === 'gridded'}
                            disabled={plotDistribution === 'shp'}
                        />
                        <label className="form-check-label medium"
                            htmlFor="sample-distribution-gridded">
                            Gridded
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" type="radio" id="sample-distribution-csv"
                            name="sample-distribution" defaultValue="csv"
                            onChange={() => this.props.setSampleDistribution('csv')}
                            checked={sampleDistribution === 'csv'}
                            disabled={plotDistribution === 'random' || plotDistribution === 'gridded'}
                        />
                        <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                            id="sample-custom-csv-upload">
                            <medium>Upload CSV</medium>
                            <input 
                                type="file" accept="text/csv" id="sample-distribution-csv-file"
                                name="sample-distribution-csv-file"
                                defaultValue=""
                                onChange={this.encodeImageFileAsURL}
                                style={{ display: "none" }}
                                disabled={sampleDistribution != 'csv'}
                            />
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" type="radio" id="sample-distribution-shp"
                            name="sample-distribution" defaultValue="shp"
                            onChange={() => this.props.setSampleDistribution('shp')}
                            checked={sampleDistribution === 'shp'}
                            disabled={plotDistribution === 'random' || plotDistribution === 'gridded'}
                        />
                        <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                            id="sample-custom-shp-upload">
                            <medium>Upload SHP</medium>
                            <input
                                type="file" accept="application/zip" id="sample-distribution-shp-file"
                                name="sample-distribution-shp-file"
                                defaultValue=""
                                onChange={this.encodeImageFileAsURL}
                                style={{ display: "none" }}
                                disabled={sampleDistribution != 'shp'}
                            />
                        </label>
                    </div>
                    <p id="sample-design-text" className="font-italic ml-2">-
                        {sampleDistribution === 'random' &&
                            'Sample points will be randomly distributed within the plot boundary.'}
                        {sampleDistribution === 'gridded' &&
                            'Sample points will be arranged on a grid within the plot boundary using the sample resolution selected below.'}
                        {sampleDistribution === 'csv' &&
                            'Specify your own sample points by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID,SAMPLEID.'}
                        {sampleDistribution === 'shp' &&
                            'Specify your own sample shapes by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have PLOTID and SAMPLEID fields.'}
                    </p>
                    <div className="form-group mb-1">
                        <p htmlFor="samples-per-plot">Samples per plot</p>
                        <input
                            className="form-control form-control-sm" type="number" id="samples-per-plot"
                            name="samples-per-plot" autoComplete="off" min="0" step="1"
                            defaultValue={samplesPerPlot || ""}
                            disabled={sampleDistribution != 'random'}
                        />
                    </div>
                    <div className="form-group mb-1">
                        <p htmlFor="sample-resolution">Sample resolution (m)</p>
                        <input
                            className="form-control form-control-sm" type="number" id="sample-resolution"
                            name="sample-resolution" autoComplete="off" min="0.0" step="any"
                            defaultValue={sampleResolution || ""}
                            disabled={sampleDistribution != 'gridded'}
                        />
                    </div>
                </div>
            </SectionBlock>
        );
    }
}

function SurveyDesign(props){
    var answer_select = "";
    var answers = props.getParentSurveyQuestionAnswers(props.project.templateDetails.sampleValues);
    if (answers.length > 0) {
        answer_select = props.getParentSurveyQuestionAnswers(props.project.templateDetails.sampleValues).map((parentSurveyQuestionAnswer, uid) =>
            <option key={uid}
                    value={parentSurveyQuestionAnswer.id}>{parentSurveyQuestionAnswer.answer}</option>
        )
    }

    return (
        <SectionBlock title = "Survey Design">
            <div id="survey-design">
                <SurveyQuestionTree 
                    project={props.project}
                    addSurveyQuestionRow={props.addSurveyQuestionRow} topoSort={props.topoSort}
                    getParentSurveyQuestions={props.getParentSurveyQuestions}
                    removeSurveyQuestion={props.removeSurveyQuestion}
                    removeSurveyQuestionRow={props.removeSurveyQuestionRow}
                    handleInputColor={props.handleInputColor}
                    handleInputName={props.handleInputName}
                    handleInputParent={props.handleInputParent}
                />
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor="value-parent">Parent Question:</label>
                            </td>
                            <td>
                                <select
                                    id="value-parent" className="form-control form-control-sm" size="1"
                                    onChange={(e) => props.handleInputParent(e)}>
                                    <option value="">None</option>
                                    {
                                        (props.project.templateDetails.sampleValues).map((parentSurveyQuestion, uid) =>
                                            <option key={uid}
                                                value={parentSurveyQuestion.id}>{parentSurveyQuestion.question}
                                            </option>
                                        )
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="value-answer">Parent Answer:</label>
                            </td>
                            <td>
                                <select id="value-answer" className="form-control form-control-sm" size="1"
                                        onChange={(e) => props.handleInputParent(e)}>
                                    <option value="">Any</option>
                                    {answer_select}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><label htmlFor="value-SQ">New Question:</label></td>
                            <td>
                                <div id="add-sample-value-group">
                                    <input type="text" id="surveyQuestionText" autoComplete="off"
                                        value={project.newSurveyQuestionName}/>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td><input type="button" className="button" value="Add Survey Question"
                                    onClick={props.addSurveyQuestion}/></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </SectionBlock>
    );
}
class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
    };
    getCurrent = (node) => 
        this.props.project.templateDetails.sampleValues.filter(cNode => 
            cNode.parent_question == node).map((cNode,uid) => (
                <ul  key={`node_${uid}`} style={{listStyleType:"none"}}>
                    <li>
                        <SurveyQuestion parentProps={this.props} surveyQuestion={cNode}/>
                        {this.getCurrent(cNode.id)}
                    </li>

                </ul>
    ))
    render() {
        const { project } = this.props;
        return (
            <Fragment>
                {project.templateDetails && this.getCurrent(-1)}
            </Fragment>
        );
    }
}

function SurveyQuestion({ parentProps, parentProps: { project }, surveyQuestion }) {
    if (surveyQuestion.answers == null) {
        console.log("answers null");
    }
    return (
        <div className="sample-value-info">
            <h3 className="header px-0">
                <RemoveSurveyQuestionButton
                    removeSurveyQuestion={parentProps.removeSurveyQuestion}
                    surveyQuestion={surveyQuestion}
                />
                <label> Survey Question: {surveyQuestion.question}</label>
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

                        (surveyQuestion.answers).map((surveyAnswer, uid) => {

                            return <tr key={uid}>
                                <td>
                                    {surveyAnswer &&
                                        <RemoveSurveyQuestionRowButton
                                            removeSurveyQuestionRow={parentProps.removeSurveyQuestionRow}
                                            surveyQuestion={surveyQuestion}
                                            surveyAnswer={surveyAnswer}
                                        />
                                    }
                                </td>

                                <td>
                                    {surveyAnswer.answer}
                                </td>
                                <td>
                                    <div className="circle"
                                        style={{ backgroundColor: surveyAnswer.color, border: "solid 1px" }}></div>
                                </td>
                                <td>
                                    &nbsp;
                                </td>
                            </tr>
                        }
                        )
                    }
                    <SurveyQuestionTable
                        project={project}
                        surveyQuestion={surveyQuestion}
                        getParentSurveyQuestions={parentProps.getParentSurveyQuestions}
                        addSurveyQuestionRow={parentProps.addSurveyQuestionRow}
                        handleInputName={parentProps.handleInputName}
                        handleInputColor={parentProps.handleInputColor}
                        handleInputParent={parentProps.handleInputParent}
                    />
                </tbody>
            </table>
        </div>

    );

}

function RemoveSurveyQuestionButton(props) {
    return (<input id="remove-sample-value-group" type="button" className="button" value="-"
                   onClick={() => props.removeSurveyQuestion(props.surveyQuestion.question)}/>
    );
}

function RemoveSurveyQuestionRowButton(props) {
    return (
        <input type="button" className="button" value="-"
                onClick={() => props.removeSurveyQuestionRow(props.surveyQuestion.question, props.surveyAnswer.answer)}/>
    );
}

function SurveyQuestionTable(props) {
    let project = props.project;
    let answer = "", color = "#000000";
    if (project.newValueEntry[props.surveyQuestion.question]) {
        answer = project.newValueEntry[props.surveyQuestion.question].answer;
        color = project.newValueEntry[props.surveyQuestion.question].color;
    }
    return (
        <tr>
            <td>
                <input type="button" className="button" value="+"
                       onClick={() => props.addSurveyQuestionRow(props.surveyQuestion.question)}/>
            </td>
            <td>
                <input type="text" className="value-name" autoComplete="off"
                       value={answer} onChange={(e) => props.handleInputName(props.surveyQuestion.question, e)}/>
            </td>
            <td>
                <input type="color" className="value-color"
                       value={color} onChange={(e) => props.handleInputColor(props.surveyQuestion.question, e)}/>
            </td>
        </tr>
    );
}

function ProjectManagement(props) {
    return (
        <SectionBlock title="Project Management">
            <div id="project-management">
                <div className="row">
                    <input type="button" id="create-project" className="btn btn-outline-danger btn-sm btn-block"
                        name="create-project" value="Create Project"
                        onClick={props.createProject}/>
                    <div id="spinner"></div>
                </div>
            </div>
        </SectionBlock>
    );
}

export function renderCreateProjectPage(args) {
    ReactDOM.render(
        <Project 
            documentRoot={args.documentRoot} 
            userId={args.userId} 
            institutionId={args.institutionId}
        />,
        document.getElementById("project")
    );
}