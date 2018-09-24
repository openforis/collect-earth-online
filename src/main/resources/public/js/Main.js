class Project extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            details: null,
            stats: null,
            imageryList: null,
            mapConfig: null,
            plotList: null,
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            newSampleValueGroupName: "",
            newValueEntry: {},
            projectList: null,
            templateId: "0",
            // FIXME: Add these attributes to the JSON database
            dateCreated: null,
            datePublished: null,
            dateClosed: null,
            dateArchived: null,
            stateTransitions : {
                nonexistent: "Create",
                unpublished: "Publish",
                published: "Close",
                closed: "Archive",
                archived: "Archive"
            },
        };
    };
    logFormData(formData)
    {
        console.log(new Map(formData.entries()));
    }
    createProject() {
        if (confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            var formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.props.institution);
            formData.append("plot-distribution-csv-file", document.getElementById("plot-distribution-csv-file").files[0]);
            formData.append("sample-values", JSON.stringify(this.state.details.sampleValues));
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/create-project",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
                data: formData
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error creating project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.details;
                detailsNew.availability = "unpublished";
                ref.setState({details: detailsNew});
                utils.hide_element("spinner");
                var newProjectId = data;
                window.location = ref.props.documentRoot + "/project/" + newProjectId;
            });
        }
    }
    publishProject() {
        if (confirm("Do you REALLY want to publish this project?")) {
            utils.show_element("spinner");
            var ref=this;
            $.ajax({
                url: this.props.documentRoot + "/publish-project/" + this.state.details.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error publishing project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.details;
                detailsNew.availability = "published";
                ref.setState({details: detailsNew});
                utils.hide_element("spinner");
            });
        }
    }
    closeProject() {
        if (confirm("Do you REALLY want to close this project?")) {
            utils.show_element("spinner");
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/close-project/" + this.state.details.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error closing project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.details;
                detailsNew.availability = "closed";
                ref.setState({details: detailsNew});
                utils.hide_element("spinner");
            });
        }
    }

    archiveProject() {
        if (confirm("Do you REALLY want to archive this project?!")) {
            utils.show_element("spinner");
            var ref = this;
            $.ajax({
                url: this.props.documentRoot + "/archive-project/" + this.state.details.id,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
            }).fail(function (response) {
                utils.hide_element("spinner");
                console.log(response);
                alert("Error archiving project. See console for details.");
            }).done(function (data) {
                var detailsNew = ref.state.details;
                detailsNew.availability = "archived";
                ref.setState({details: detailsNew});
                utils.hide_element("spinner");
                alert("Project " + ref.state.details.id + " has been archived.");
                window.location = ref.props.documentRoot + "/home";
            });
        }
    }
    changeAvailability() {
        if (this.state.details.availability == "nonexistent") {
            this.createProject();
        } else if (this.state.details.availability == "unpublished") {
            this.publishProject();
        } else if (this.state.details.availability == "published") {
            this.closeProject();
        } else if (this.state.details.availability == "closed") {
            this.archiveProject();
        }
    }
    configureGeoDash() {
        if (this.state.plotList != null) {
            window.open(this.state.documentRoot + "/widget-layout-editor?editable=true&"
                + encodeURIComponent("title=" + this.state.details.name
                    + "&pid=" + this.state.details.id
                    + "&aoi=[" + mercator.getPlotExtent(this.state.plotList[0].center,
                        this.state.details.plotSize,
                        this.state.details.plotShape)
                    + "]&daterange=&bcenter=" + this.state.plotList[0].center
                    + "&bradius=" + this.state.details.plotSize / 2),
                "_geo-dash");
        }
    }
    downloadPlotData() {
        window.open(this.state.documentRoot + "/dump-project-aggregate-data/" + this.state.details.id, "_blank");
    }
    downloadSampleData() {
        window.open(this.state.documentRoot + "/dump-project-raw-data/" + this.state.details.id, "_blank");
    }
    setProjectTemplate() {
        const templateProject = this.state.projectList.find(
            function (project) {
                return project.id == this.state.templateId;
            },
            this
        );
        this.setState({details : JSON.parse(JSON.stringify(templateProject))}); // clone project
        this.updateUnmanagedComponents(this.state.templateId);
    }
    setPrivacyLevel(privacyLevel) {
        var detailsNew = ref.state.details;
        detailsNew.privacyLevel = privacyLevel;
        ref.setState({details: detailsNew});
    }
    setBaseMapSource() {
        mercator.setVisibleLayer(this.state.mapConfig, this.state.details.baseMapSource);
    }
    setPlotDistribution(plotDistribution) {
        var detailsNew = ref.state.details;
        detailsNew.plotDistribution = plotDistribution;
        ref.setState({details: detailsNew});
        if (plotDistribution == "random") {
            utils.enable_element("num-plots");
            utils.disable_element("plot-spacing");
        } else if (plotDistribution == "gridded") {
            utils.disable_element("num-plots");
            utils.enable_element("plot-spacing");
        } else {
            utils.disable_element("num-plots");
            utils.disable_element("plot-spacing");
        }
    }
    
    render(){
        var header;
        if(this.props.projectId=="0")
        {
           header= <h1>Create Project</h1>
        }
        else{
           header= <h1>Review Project</h1>
        }
        return(
            <div id="project-design" className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                <div class="bg-darkgreen mb-3 no-container-margin">
                    {header}
                </div>
                <ProjectStats/>
                <ProjectDesignForm/>
                <ProjectManagement/>
            </div>
        );
    }
}

function ProjectStats(props) {
    return(
        <div className="row mb-3">
            <div id="project-stats" className={"col "+ props.project_stats_visibility}>
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
                            <td>{project.stats.members}</td>
                            <td>Contributors</td>
                            <td>{project.stats.contributors}</td>
                        </tr>
                        <tr>
                            <td>Total Plots</td>
                            <td>{project.details.numPlots || 0}</td>
                            <td>Date Created</td>
                            <td>{project.dateCreated}</td>
                        </tr>
                        <tr>
                            <td>Flagged Plots</td>
                            <td>{project.stats.flaggedPlots}</td>
                            <td>Date Published</td>
                            <td>{project.datePublished}</td>
                        </tr>
                        <tr>
                            <td>Analyzed Plots</td>
                            <td>{project.stats.analyzedPlots}</td>
                            <td>Date Closed</td>
                            <td>{project.dateClosed}</td>
                        </tr>
                        <tr>
                            <td>Unanalyzed Plots</td>
                            <td>{project.stats.unanalyzedPlots}</td>
                            <td>Date Archived</td>
                            <td>{project.dateArchived}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ProjectDesignForm(props){
    var addSampleValueGroupButton="";
    if(props.projectId=="0"){
        addSampleValueGroupButton= <div id="add-sample-value-group">
            <input type="button" className="button" value="Add Sample Value Group"
                   onClick={project.addSampleValueGroup()}/>
                <input type="text" autoComplete="off" value={project.newSampleValueGroupName}/>
        </div>;
    }

    return(
        <form id="project-design-form" className="px-2 pb-2" method="post" action={props.documentRoot+"/create-project"}
              encType="multipart/form-data">
            <ProjectTemplateVisibility/>
            <ProjectInfo/>
            <ProjectVisibility/>
            <ProjectAOI/>
            <ProjectImagery/>
            <PlotDesign/>
            <SampleDesign/>
            <SampleValueInfo/>
            {addSampleValueGroupButton}
        </form>
    );
}

function ProjectTemplateVisibility(props) {
    return(
        <div className={"row "+props.project_template_visibility}>
            <div className="col">
                <h2 className="header px-0">Use Project Template (Optional)</h2>
                <div id="project-template-selector">
                    <div className="form-group">
                        <h3 htmlFor="project-template">Select Project</h3>
                        <select className="form-control form-control-sm" id="project-template" name="project-template"
                                size="1" value={project.templateId} onChange={project.setProjectTemplate()}>
                            {
                                project.projectList.map(proj=>
                                    <option value={ proj.id }>{proj.name}</option>
                                )
                            }

                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectInfo(props){
    return(
        <div className="row">
            <div className="col">
                <h2 className="header px-0">Project Info</h2>
                <div id="project-info">
                    <div className="form-group">
                        <h3 htmlFor="project-name">Name</h3>
                        <input className="form-control form-control-sm" type="text" id="project-name" name="name"
                               autoComplete="off" value={project.details.name}/>
                    </div>
                    <div className="form-group">
                        <h3 htmlFor="project-description">Description</h3>
                        <textarea className="form-control form-control-sm" id="project-description" name="description"
                                  value={project.details.description}></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectVisibility(props) {
    return(
        <div className="row">
            <div className="col">
                <h2 className="header px-0">Project Visibility</h2>
                <h3>Privacy Level</h3>
                <div id="project-visibility" className="mb-3">
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                               value="public" onClick={project.setPrivacyLevel('public')}/>
                            <label className="form-check-label small" htmlFor="privacy-public">Public: <i>All Users</i></label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                               value="private" onClick={project.setPrivacyLevel('private')} checked/>
                            <label className="form-check-label small" htmlFor="privacy-private">Private: <i>Group
                                Admins</i></label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" id="privacy-institution" name="privacy-level"
                               value="institution" onClick={project.setPrivacyLevel('institution')}/>
                            <label className="form-check-label small" htmlFor="privacy-institution">Institution: <i>Group
                                Members</i></label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" id="privacy-invitation" name="privacy-level"
                               value="invitation" onClick={project.setPrivacyLevel('invitation')} disabled/>
                            <label className="form-check-label small" htmlFor="privacy-invitation">Invitation: <i>Coming
                                Soon</i></label>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectAOI(props) {
    var msg = "";
    if (props.projectId == "0") {
        msg = <div className="row">
            <div className="col small text-center mb-2">Hold CTRL and click-and-drag a bounding box on the map</div>
        </div>;
    }

    return (
        <div class="row">
            <div class="col">
                <h2 class="header px-0">Project AOI</h2>
                <div id="project-aoi">
                    <div id="project-map"></div>
                    {msg}
                    <div class="form-group mx-4">
                        <div class="row">
                            <div class="col-md-6 offset-md-3">
                                <input class="form-control form-control-sm" type="number" id="lat-max" name="lat-max"
                                       value={project.latMax} placeholder="North" autocomplete="off" min="-90.0"
                                       max="90.0" step="any"/>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <input class="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                       value={project.lonMin} placeholder="West" autocomplete="off" min="-180.0"
                                       max="180.0" step="any"/>
                            </div>
                            <div class="col-md-6">
                                <input class="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                       value={project.lonMax} placeholder="East" autocomplete="off" min="-180.0"
                                       max="180.0" step="any"/>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 offset-md-3">
                                <input class="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                       value={project.latMin} placeholder="South" autocomplete="off" min="-90.0"
                                       max="90.0" step="any"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProjectImagery(props) {
    return(
        <div className="row mb-3">
            <div className="col">
                <h2 className="header px-0">Project Imagery</h2>
                <div id="project-imagery">
                    <div className="form-group mb-1">
                        <h3 htmlFor="base-map-source">Basemap Source</h3>
                        <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                                size="1"
                                value="project.details.baseMapSource" onChange={project.setBaseMapSource()}>
                            {
                                project.imageryList.map(imagery =>
                                    <option value={imagery.title}>{imagery.title}</option>
                                )
                            }

                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlotDesign(props){
    return(
        <div className="row mb-3">
            <div className="col">
                <h2 className="header px-0">Plot Design</h2>
                <div id="plot-design">
                    <div className="row">
                        <div id="plot-design-col1" className="col">
                            <h3>Spatial Distribution</h3>
                            <div className="form-check form-check-inline">
                                <input className="form-check-input" type="radio" id="plot-distribution-random"
                                       name="plot-distribution" value="random"
                                       onClick={project.setPlotDistribution('random')} checked/>
                                    <label className="form-check-label small"
                                           htmlFor="plot-distribution-random">Random</label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input className="form-check-input" type="radio" id="plot-distribution-gridded"
                                       name="plot-distribution" value="gridded"
                                       onClick={project.setPlotDistribution('gridded')}/>
                                    <label className="form-check-label small"
                                           htmlFor="plot-distribution-gridded">Gridded</label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input className="form-check-input" type="radio" id="plot-distribution-csv"
                                       name="plot-distribution" value="csv"
                                       onClick={project.setPlotDistribution('csv')}/>
                                    <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                           id="custom-csv-upload">
                                        <small>Upload CSV</small>
                                        <input type="file" accept="text/csv" id="plot-distribution-csv-file"
                                               style={{display: "none"}}/>
                                    </label>
                            </div>
                            <div className="form-group mb-1">
                                <p htmlFor="num-plots">Number of plots</p>
                                <input className="form-control form-control-sm" type="number" id="num-plots"
                                       name="num-plots" autoComplete="off" min="0" step="1"
                                       value={project.details.numPlots}/>
                            </div>
                            <div className="form-group mb-1">
                                <p htmlFor="plot-spacing">Plot spacing (m)</p>
                                <input className="form-control form-control-sm" type="number" id="plot-spacing"
                                       name="plot-spacing" autoComplete="off" min="0.0" step="any"
                                       value={project.details.plotSpacing} disabled/>
                            </div>
                        </div>
                    </div>
                    <hr/>
                    <div className="row">
                        <div id="plot-design-col2" className="col">
                            <h3>Plot Shape</h3>
                            <div className="form-check form-check-inline">
                                <input className="form-check-input" type="radio" id="plot-shape-circle"
                                       name="plot-shape" value="circle" onClick={project.setPlotShape('circle')}
                                       checked/>
                                    <label className="form-check-label small" htmlFor="plot-shape-circle">Circle</label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input className="form-check-input" type="radio" id="plot-shape-square"
                                       name="plot-shape" value="square" onClick={project.setPlotShape('square')}/>
                                    <label className="form-check-label small" htmlFor="plot-shape-square">Square</label>
                            </div>
                            <p htmlFor="plot-size">{"Plot "+project.details.plotShape == 'circle' ? 'Diameter' : 'Width'+ "(m)"}</p>
                            <input className="form-control form-control-sm" type="number" id="plot-size"
                                   name="plot-size" autoComplete="off" min="0.0" step="any"
                                   value={project.details.plotSize}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SampleDesign(props){
return(
    <div className="row mb-3">
        <div className="col">
            <div id="sample-design">
                <h2 className="header px-0">Sample Design</h2>
                <h3>Spatial Distribution</h3>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="sample-distribution-random"
                           name="sample-distribution" value="random" onClick={project.setSampleDistribution('random')}
                           checked/>
                        <label className="form-check-label small" htmlFor="sample-distribution-random">Random</label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="sample-distribution-gridded"
                           name="sample-distribution" value="gridded"
                           onClick={project.setSampleDistribution('gridded')}/>
                        <label className="form-check-label small" htmlFor="sample-distribution-gridded">Gridded</label>
                </div>
                <div className="form-group mb-1">
                    <p htmlFor="samples-per-plot">Samples per plot</p>
                    <input className="form-control form-control-sm" type="number" id="samples-per-plot"
                           name="samples-per-plot" autoComplete="off" min="0" step="1"
                           value={project.details.samplesPerPlot}/>
                </div>
                <div className="form-group mb-1">
                    <p htmlFor="sample-resolution">Sample resolution (m)</p>
                    <input className="form-control form-control-sm" type="number" id="sample-resolution"
                           name="sample-resolution" autoComplete="off" min="0.0" step="any"
                           value={project.details.sampleResolution} disabled/>
                </div>
            </div>
        </div>
    </div>
);
}

function SampleValueInfo(props) {
    var removeSampleValueGroupButton = "", removeSampleValueRowButton = "", sampleValueTable = "";
    if (props.projectId == "0") {
        removeSampleValueGroupButton = <input id="remove-sample-value-group" type="button" className="button" value="-"
                                              onClick={project.removeSampleValueGroup(sampleValueGroup.name)}/>
        removeSampleValueRowButton = <input type="button" className="button" value="-"
                                            onClick={project.removeSampleValueRow(sampleValueGroup.name, sampleValue.name)}/>;
        sampleValueTable = <tr>
            <td>
                <input type="button" className="button" value="+"
                       onClick={project.addSampleValueRow(sampleValueGroup.name)}/>
            </td>
            <td>
                <input type="text" className="value-name" autoComplete="off"
                       value={project.newValueEntry[sampleValueGroup.name].name}/>
            </td>
            <td>
                <input type="color" className="value-color"
                       value={project.newValueEntry[sampleValueGroup.name].color}/>
            </td>
            <td>
                <label htmlFor="value-parent">Parent:</label>
                <select id="value-parent" className="form-control form-control-sm" size="1"
                        value={project.newValueEntry[sampleValueGroup.name].parent}>
                    <option value="">None</option>
                    {
                        project.getParentSampleValues(sampleValueGroup.values).map(parentSampleValue =>
                            <option value={parentSampleValue.name}>{parentSampleValue.name}</option>
                        )
                    }
                </select>
            </td>
        </tr>;
    }
    return (

        project.details.sampleValues.map(sampleValueGroup =>
            <div className="sample-value-info">
                <h2 className="header px-0">
                    {removeSampleValueGroupButton}
                    Sample Value Group: {sampleValueGroup.name}
                </h2>
                <table className="table table-sm">
                    <thead>
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">Name</th>
                        <th scope="col">Color</th>
                        <!-- <th scope="col">Reference Image</th> -->
                        <th scope="col">&nbsp;</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        project.topoSort(sampleValueGroup.values).map(sampleValue=>
                            <tr>
                                <td>
                                    {removeSampleValueRowButton}
                                </td>
                                <td style={{
                                    "font-style": sampleValue.parent == null || sampleValue.parent == ''
                                        ? 'normal'
                                        : 'italic', "text-indent": '10px'
                                }}>
                                    {sampleValue.name}
                                </td>
                                <td>
                                    <div className="circle"
                                         style={{"background-color": sampleValue.color, border: "solid 1px"}}></div>
                                </td>
                                <!-- <td>
                                  {{ sampleValue.image }}
                                  </td> -->
                                <td>
                                    &nbsp;
                                </td>
                            </tr>

                        )
                    }
                    {sampleValueTable}
                    </tbody>
                </table>
            </div>
        )


    );
}

function ProjectManagement(props) {
    var buttons = "";
    if (props.projectId == "0") {
        buttons = <input type="button" id="create-project" className="btn btn-outline-danger btn-sm btn-block"
                         name="create-project" value="Create Project"
                         onClick={project.createProject()}/>;
    }
    else {
        buttons = <input type="button" id="configure-geo-dash" className="btn btn-outline-lightgreen btn-sm btn-block"
                         name="configure-geo-dash" value="Configure Geo-Dash"
                         onClick={project.configureGeoDash()}
                         style={{display: project.details.availability == 'unpublished' || project.details.availability == 'published' ? 'block' : 'none'}}/>;


        buttons = {buttons} + <input type="button" id="download-plot-data"
                                     className="btn btn-outline-lightgreen btn-sm btn-block"
                                     name="download-plot-data" value="Download Plot Data"
                                     onClick={project.downloadPlotData()}
                                     style={{display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none'}}/>;

        buttons = {buttons} + <input type="button" id="download-sample-data"
                                     className="btn btn-outline-lightgreen btn-sm btn-block"
                                     name="download-sample-data" value="Download Sample Data"
                                     onClick={project.downloadSampleData()}
                                     style={{display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none'}}/>;
        buttons = {buttons} + <input type="button" id="change-availability"
                                     className="btn btn-outline-danger btn-sm btn-block"
                                     name="change-availability"
                                     value={project.stateTransitions[project.details.availability] + "Project"}
                                     onClick={project.changeAvailability()}/>;
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

function renderProject(documentRoot, userId, projectId,institutionId,projectStatsVisibility,projectTemplateVisibility) {
    ReactDOM.render(
        <Project documentRoot={documentRoot} userId={userId} projectId={projectId} institutionId={institutionId}
                 projectStatsVisibility={projectStatsVisibility} projectTemplateVisibility={projectTemplateVisibility}/>,
        document.getElementById("project")
    );
}
