class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            userId: this.props.userId,
            projectId: this.props.projectId,
            institutionId: this.props.institutionId,
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
            stateTransitions: {
                nonexistent: "Create",
                unpublished: "Publish",
                published: "Close",
                closed: "Archive",
                archived: "Archive"
            },
        };
        this.setPrivacyLevel = this.setPrivacyLevel.bind(this);
        this.setPlotDistribution = this.setPlotDistribution.bind(this);
        this.setPlotShape = this.setPlotShape.bind(this);
        this.setSampleDistribution = this.setSampleDistribution.bind(this);
        this.configureGeoDash = this.configureGeoDash.bind(this);
        this.downloadPlotData = this.downloadPlotData.bind(this);
        this.downloadSampleData = this.downloadSampleData.bind(this);
        this.closeProject = this.closeProject.bind(this);
        this.changeAvailability = this.changeAvailability.bind(this);
        this.setBaseMapSource = this.setBaseMapSource.bind(this);
        this.addSampleValueGroup = this.addSampleValueGroup.bind(this);
        this.removeSampleValueGroup = this.removeSampleValueGroup.bind(this);
        this.addSampleValueRow = this.addSampleValueRow.bind(this);
        this.getParentSampleValues = this.getParentSampleValues.bind(this);
        this.setProjectTemplate = this.setProjectTemplate.bind(this);
        this.getSampleValueGroupByName = this.getSampleValueGroupByName.bind(this);
        this.removeSampleValueRow = this.removeSampleValueRow.bind(this);
        this.handleInputName = this.handleInputName.bind(this);
        this.handleInputColor = this.handleInputColor.bind(this);
        this.handleInputParent = this.handleInputParent.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.topoSort = this.topoSort.bind(this);
        this.createProject = this.createProject.bind(this);
    };

    componentDidMount() {
        this.initialization(this.props.documentRoot, this.state.userId, this.state.projectId, this.state.institutionId);
    }

    initialization(documentRoot, userId, projectId, institutionId) {
        if (this.state.details == null) {
            this.getProjectById(projectId);
        }
        else {

            if (this.state.details.id == 0) {
                this.state.details.privacyLevel = "private";
                this.state.details.projectDistribution = "random";
                this.state.details.plotShape = "circle";
                this.state.details.sampleDistribution = "random";
                this.getProjectList(userId, projectId);
            }
            else if (this.state.details.id != 0) {
                if (document.getElementById("num-plots") != null) {
                    if (document.getElementById("plot-distribution-gridded").checked)
                        document.getElementById("plot-design-text").innerHTML = "Description about gridded";
                    if (document.getElementById("plot-distribution-random").checked)
                        document.getElementById("plot-design-text").innerHTML = "Description about random";
                    if (document.getElementById("plot-distribution-csv").checked)
                        document.getElementById("plot-design-text").innerHTML ="Description about csv upload";
                    if (document.getElementById("plot-distribution-shp").checked)
                        document.getElementById("plot-design-text").innerHTML ="Description about shp upload";

                    if (document.getElementById("sample-distribution-gridded").checked)
                        document.getElementById("sample-design-text").innerHTML = "Description about gridded";
                    if (document.getElementById("sample-distribution-random").checked)
                        document.getElementById("sample-design-text").innerHTML = "Description about random";
                    if (document.getElementById("sample-distribution-csv").checked)
                        document.getElementById("sample-design-text").innerHTML = "Description about csv upload";
                    if (document.getElementById("sample-distribution-shp").checked)
                        document.getElementById("sample-design-text").innerHTML = "Description about shp upload";

                }
                this.getProjectStats(projectId);
            }
            if (this.state.imageryList == null) {
                this.getImageryList(institutionId);
            }
            else this.updateUnmanagedComponents(projectId);
        }
    }

    // var logFormData=function(formData)
    // {
    //     console.log(new Map(formData.entries()));
    // };
    createProject() {
        if (confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            var formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.props.institutionId);
            formData.append("plot-distribution-csv-file", document.getElementById("plot-distribution-csv-file").files[0]);
            formData.append("sample-values", JSON.stringify(this.state.details.sampleValues));
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
            var ref = this;
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

        if (this.state.plotList != null && this.state.details != null) {
            window.open(this.props.documentRoot + "/widget-layout-editor?editable=true&"
                + encodeURIComponent("institutionId=" + this.state.details.institution
                    + "&pid=" + this.state.details.id),
                "_geo-dash");
        }
    }

    downloadPlotData() {
        window.open(this.props.documentRoot + "/dump-project-aggregate-data/" + this.state.details.id, "_blank");
    }

    downloadSampleData() {
        window.open(this.props.documentRoot + "/dump-project-raw-data/" + this.state.details.id, "_blank");
    }

    setProjectTemplate(event) {
        this.setState({templateId: event.target.value});
        const templateProject = this.state.projectList.find(
            function (project) {
                return project.id == event.target.value;
            },
            this
        );
        this.setState({details: JSON.parse(JSON.stringify(templateProject))},
            function () {
                this.updateUnmanagedComponents(this.state.templateId);
            }
        ); // clone project

    }

    setPrivacyLevel(privacyLevel) {
        if (this.state.details != null) {
            var detailsNew = this.state.details;
            detailsNew.privacyLevel = privacyLevel;
            this.setState({details: detailsNew});
        }
    }

    setBaseMapSource() {
        var e = document.getElementById("base-map-source");
        var bms = e.options[e.selectedIndex].value;
        var detailsNew = this.state.details;
        detailsNew.baseMapSource = bms;

        this.setState({details: detailsNew});
        mercator.setVisibleLayer(this.state.mapConfig, this.state.details.baseMapSource);
    }

    setPlotDistribution(plotDistribution) {
        if (this.state.details != null) {
            var detailsNew = this.state.details;
            detailsNew.plotDistribution = plotDistribution;
            this.setState({details: detailsNew});
            if (document.getElementById("num-plots") != null) {
                if (plotDistribution == "random") {
                    utils.enable_element("plot-size");
                    utils.enable_element("num-plots");
                    utils.disable_element("plot-spacing");
                    utils.disable_element("plot-distribution-csv-file");
                    utils.disable_element("plot-distribution-shp-file");
                    document.getElementById("plot-design-text").innerHTML="Description about random";

                } else if (plotDistribution == "gridded") {
                    utils.enable_element("plot-size");
                    utils.disable_element("num-plots");
                    utils.enable_element("plot-spacing");
                    utils.disable_element("plot-distribution-csv-file");
                    utils.disable_element("plot-distribution-shp-file");
                    document.getElementById("plot-design-text").innerHTML="Description about gridded";

                } else if(plotDistribution == "csv"){
                    utils.enable_element("plot-size");
                    utils.disable_element("num-plots");
                    utils.disable_element("plot-spacing");
                    utils.disable_element("plot-distribution-shp-file");
                    utils.enable_element("plot-distribution-csv-file");
                    document.getElementById("plot-design-text").innerHTML="Description about csv upload";

                }
                else{
                    utils.disable_element("plot-size");
                    utils.disable_element("num-plots");
                    utils.disable_element("plot-spacing");
                    utils.disable_element("plot-distribution-csv-file");
                    utils.enable_element("plot-distribution-shp-file");
                    document.getElementById("plot-design-text").innerHTML="Description about shp upload";

                }
            }
        }
    }

    setPlotShape(plotShape) {
        if (this.state.details != null) {
            var detailsNew = this.state.details;
            detailsNew.plotShape = plotShape;
            this.setState({details: detailsNew});
        }
    }

    setSampleDistribution(sampleDistribution) {
        if (this.state.details != null) {
            var detailsNew = this.state.details;
            detailsNew.sampleDistribution = sampleDistribution;
            this.setState({details: detailsNew});
            if (document.getElementById("samples-per-plot") != null && document.getElementById("sample-resolution") != null)
                if (sampleDistribution == "random") {
                    utils.enable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.disable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML="Description about random";

                } else if(sampleDistribution == "gridded") {
                    utils.disable_element("samples-per-plot");
                    utils.enable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.disable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML="Description about gridded";
                }
                else if(sampleDistribution == "csv"){
                    utils.disable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-shp-file");
                    utils.enable_element("sample-distribution-csv-file");
                    document.getElementById("sample-design-text").innerHTML="Description about csv upload";
                }
                else{
                    utils.disable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.enable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML="Description about shp upload";
                }
        }
    }

    getParentSampleValues(sampleValues) {
        return sampleValues.filter(
            function (sampleValue) {
                return sampleValue.parent == null || sampleValue.parent == "";
            }
        );
    }

    getChildSampleValues(sampleValues, parentSampleValue) {
        return sampleValues.filter(
            function (sampleValue) {
                return sampleValue.parent == parentSampleValue.name;
            }
        );
    }

    topoSort(sampleValues) {
        var parentSampleValues = this.getParentSampleValues(sampleValues);
        var parentChildGroups = parentSampleValues.map(
            function (parentSampleValue) {
                var childSampleValues = sampleValues.filter(
                    function (sampleValue) {
                        return sampleValue.parent == parentSampleValue.name;
                    }
                );
                return [parentSampleValue].concat(childSampleValues);
            },
            this
        );
        return [].concat.apply([], parentChildGroups);
    }

    addSampleValueGroup() {
        if (this.state.details != null) {
            var groupName = document.getElementById("samplevaluegrouptext").value;
            if (groupName != "") {
                var newValueEntryNew = this.state.newValueEntry;
                newValueEntryNew[groupName] = {name: "", color: "#000000", image: "", parent: ""};
                var detailsNew = this.state.details;
                detailsNew.sampleValues.push({name: groupName, values: []});
                this.setState({newValueEntry: newValueEntryNew, details: detailsNew, newSampleValueGroupName: ""});
                document.getElementById("samplevaluegrouptext").value = "";
            } else {
                alert("Please enter a sample value group name first.");
            }
        }
    }

    removeSampleValueGroup(sampleValueGroupName) {
        if (this.state.details != null) {
            var detailsNew = this.state.details;
            detailsNew.sampleValues = detailsNew.sampleValues.filter(
                function (sampleValueGroup) {
                    return sampleValueGroup.name != sampleValueGroupName;
                }
            );
            this.setState({
                details: detailsNew
            });
        }
    }

    getSampleValueGroupByName(sampleValueGroupName) {
        return this.state.details.sampleValues.find(
            function (sampleValueGroup) {
                return sampleValueGroup.name == sampleValueGroupName;
            }
        );
    }

    removeSampleValueRow(sampleValueGroupName, sampleValueName) {
        var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
        sampleValueGroup.values = sampleValueGroup.values.filter(
            function (sampleValue) {
                return sampleValue.name != sampleValueName && sampleValue.parent != sampleValueName;
            }
        );
        this.setState({});
    }

    addSampleValueRow(sampleValueGroupName) {
        var entry = this.state.newValueEntry[sampleValueGroupName];
        if (entry.name != "") {
            var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
            sampleValueGroup.values.push({
                name: entry.name,
                color: entry.color,
                image: entry.image,
                parent: entry.parent
            });
            entry.name = "";
            entry.color = "#000000";
            entry.image = "";
            entry.parent = "";

        } else {
            alert("A sample value must possess both a name and a color.");
        }
        var dNew = this.state.newValueEntry;
        dNew[sampleValueGroupName] = entry;
        this.setState({newValueEntry: dNew});
    }

    getProjectById(projectId) {
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
                    this.setState({details: data});
                    if (this.state.details.id == 0) {
                        this.initialization(this.props.documentRoot, this.state.userId, projectId, this.state.institutionId);
                    } else {
                        this.initialization(this.props.documentRoot, this.state.userId, projectId, this.state.details.institution);
                    }
                }
            });
    }

    getProjectList(userId, projectId) {
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
                var projList = this.state.projectList;
                projList.unshift(JSON.parse(JSON.stringify(this.state.details)));
                this.setState({projectList: projList});
                this.setState({userId: userId});
                this.setState({projectId: "" + projectId});
            });
    }

    getProjectStats(projectId) {
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

    getImageryList(institutionId) {
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
                this.initialization(this.props.documentRoot, this.props.userId, this.state.details.id, this.props.institutionId);
            });
    }

    getPlotList(projectId, maxPlots) {
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
                this.showPlotCenters(projectId, maxPlots);
            });
    }

    showPlotCenters(projectId, maxPlots) {
        if (this.state.plotList == null) {
            // Load the current project plots
            this.getPlotList(projectId, maxPlots);
        } else {
            // Draw the plot shapes on the map
            mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
            mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
            mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");
            mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.details.plotShape);
        }
    }

    showProjectMap(projectId) {
        // Initialize the basemap
        if (this.state.mapConfig == null) {
            this.setState({mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)});
        }

        mercator.setVisibleLayer(this.state.mapConfig, this.state.details.baseMapSource);
        if (this.state.details.id == 0) {
            // Enable dragbox interaction if we are creating a new project
            var displayDragBoxBounds = function (dragBox) {
                var extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                document.getElementById("lon-min").value = extent[0];
                document.getElementById("lat-min").value = extent[1];
                document.getElementById("lon-max").value = extent[2];
                document.getElementById("lat-max").value = extent[3];
            };
            mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
            mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
            mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
            mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");
            mercator.disableDragBoxDraw(this.state.mapConfig);
            mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
        } else {
            // Extract bounding box coordinates from the project boundary and show on the map
            var boundaryExtent = mercator.parseGeoJson(this.state.details.boundary, false).getExtent();
            this.setState({lonMin: boundaryExtent[0]});
            this.setState({latMin: boundaryExtent[1]});
            this.setState({lonMax: boundaryExtent[2]});
            this.setState({latMax: boundaryExtent[3]});

            // Display a bounding box with the project's AOI on the map and zoom to it
            mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
            mercator.addVectorLayer(this.state.mapConfig,
                "currentAOI",
                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.details.boundary, true)),
                ceoMapStyles.polygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

            // Force reloading of the plotList
            this.setState({plotList: null});

            // Show the plot centers on the map (but constrain to <= 100 points)
            this.showPlotCenters(projectId, 100);
        }
    }

    updateUnmanagedComponents(projectId) {
        if (this.state.details != null) {
            // Enable the input fields that are connected to the radio buttons if their values are not null
            if (this.state.details.plotDistribution == "gridded") {
                utils.enable_element("plot-spacing");
            }
            if (this.state.details.sampleDistribution == "gridded") {
                utils.enable_element("sample-resolution");
            }

            if (this.state.imageryList.length > 0) {
                var detailsNew = this.state.details;
                detailsNew.baseMapSource = this.state.details.baseMapSource || this.state.imageryList[0].title;
                // If baseMapSource isn't provided by the project, just use the first entry in the imageryList
                this.setState({details: detailsNew},
                    this.showProjectMap(projectId)
                );
                // Draw a map with the project AOI and a sampling of its plots
            }
        }
    }

    handleInputName(sampleValueGroup, event) {
        var newValueEntryNew = this.state.newValueEntry;
        if (newValueEntryNew[sampleValueGroup]) {
            newValueEntryNew[sampleValueGroup].name = event.target.value;
        }
        else
            newValueEntryNew[sampleValueGroup] = {name: event.target.value, color: "#000000", image: "", parent: ""};
        this.setState({newValueEntry: newValueEntryNew});

    }

    handleInputColor(sampleValueGroup, event) {
        var newValueEntryNew = this.state.newValueEntry;
        newValueEntryNew[sampleValueGroup].color = event.target.value;

        this.setState({newValueEntry: newValueEntryNew});

    }

    handleInputParent(sampleValueGroup, event) {
        var newValueEntryNew = this.state.newValueEntry;
        newValueEntryNew[sampleValueGroup].parent = event.target.value;

        this.setState({newValueEntry: newValueEntryNew});

    }

    handleChange(event) {
        var detailsNew = this.state.details;

        if (event.target.id == "project-name") {
            detailsNew.name = event.target.value;
        }
        else if (event.target.id = "project-description") {
            detailsNew.description = event.target.value;
        }
        this.setState({details: detailsNew});

    }

    render() {
        var header;
        if (this.props.projectId == "0") {
            header = <h1>Create Project</h1>
        }
        else {
            header = <h1>Review Project</h1>
        }
        return (
            <div id="project-design" className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                <div class="bg-darkgreen mb-3 no-container-margin">
                    {header}
                </div>
                <ProjectStats project={this.state} project_stats_visibility={this.props.project_stats_visibility}/>
                <ProjectDesignForm projectId={this.props.projectId} project={this.state}
                                   project_template_visibility={this.props.project_template_visibility}
                                   setProjectTemplate={this.setProjectTemplate} setPrivacyLevel={this.setPrivacyLevel}
                                   setSampleDistribution={this.setSampleDistribution}
                                   addSampleValueRow={this.addSampleValueRow}
                                   setBaseMapSource={this.setBaseMapSource}
                                   setPlotDistribution={this.setPlotDistribution} setPlotShape={this.setPlotShape}
                                   addSampleValueGroup={this.addSampleValueGroup}
                                   topoSort={this.topoSort} getParentSampleValues={this.getParentSampleValues}
                                   removeSampleValueGroup={this.removeSampleValueGroup}
                                   removeSampleValueRow={this.removeSampleValueRow}
                                   handleInputColor={this.handleInputColor} handleInputName={this.handleInputName}
                                   handleChange={this.handleChange} handleInputParent={this.handleInputParent}/>
                <ProjectManagement project={this.state} projectId={this.props.projectId}
                                   configureGeoDash={this.configureGeoDash} downloadPlotData={this.downloadPlotData}
                                   downloadSampleData={this.downloadSampleData}
                                   changeAvailability={this.changeAvailability} createProject={this.createProject}/>
            </div>
        );
    }
}

function ProjectStats(props) {
    var project = props.project;
    if (project.stats != null) {
        return (<div className="row mb-3">
                <div id="project-stats" className={"col " + props.project_stats_visibility}>
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
    else {
        return (<span></span>);
    }
}

function ProjectDesignForm(props) {
    var addSampleValueGroupButton = "";
    if (props.projectId == "0") {
        addSampleValueGroupButton = <div id="add-sample-value-group">
            <input type="button" className="button" value="Add Sample Value Group"
                   onClick={props.addSampleValueGroup}/>&nbsp;
            <input type="text" id="samplevaluegrouptext" autoComplete="off" value={project.newSampleValueGroupName}/>
        </div>;
    }
    return (
        <form id="project-design-form" className="px-2 pb-2" method="post"
              action={props.documentRoot + "/create-project"}
              encType="multipart/form-data">
            <ProjectTemplateVisibility project={props.project} setProjectTemplate={props.setProjectTemplate}/>
            <ProjectInfo project={props.project} handleChange={props.handleChange}/>
            <ProjectVisibility project={props.project} setPrivacyLevel={props.setPrivacyLevel}/>
            <ProjectAOI projectId={props.projectId} project={props.project}/>
            <ProjectImagery project={props.project} setBaseMapSource={props.setBaseMapSource}/>
            <PlotDesign project={props.project} setPlotDistribution={props.setPlotDistribution}
                        setPlotShape={props.setPlotShape}/>
            <SampleDesign project={props.project} setSampleDistribution={props.setSampleDistribution}/>
            <SampleValueInfo project={props.project} projectId={props.projectId}
                             addSampleValueRow={props.addSampleValueRow} topoSort={props.topoSort}
                             getParentSampleValues={props.getParentSampleValues}
                             removeSampleValueGroup={props.removeSampleValueGroup}
                             removeSampleValueRow={props.removeSampleValueRow} handleInputColor={props.handleInputColor}
                             handleInputName={props.handleInputName} handleInputParent={props.handleInputParent}/>
            {addSampleValueGroupButton}
        </form>
    );
}

function ProjectTemplateVisibility(props) {
    var project = props.project;
    if (project.projectList != null) {
        return (
            <div className={"row " + props.project_template_visibility}>
                <div className="col">
                    <h2 className="header px-0">Use Project Template (Optional)</h2>
                    <div id="project-template-selector">
                        <div className="form-group">
                            <h3 htmlFor="project-template">Select Project</h3>
                            <select className="form-control form-control-sm" id="project-template"
                                    name="project-template"
                                    size="1" value={project.templateId} onChange={props.setProjectTemplate}>
                                {
                                    project.projectList.map(proj =>
                                        <option value={proj.id}>{proj.name}</option>
                                    )
                                }
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    else {
        return (<span></span>);
    }
}

function ProjectInfo(props) {
    var project = props.project;
    if (project.details != null) {
        return (
            <div className="row">
                <div className="col">
                    <h2 className="header px-0">Project Info</h2>
                    <div id="project-info">
                        <div className="form-group">
                            <h3 htmlFor="project-name">Name</h3>
                            <input className="form-control form-control-sm" type="text" id="project-name" name="name"
                                   autoComplete="off" defaultValue={project.details.name}
                                   onChange={props.handleChange}/>
                        </div>
                        <div className="form-group">
                            <h3 htmlFor="project-description">Description</h3>
                            <textarea className="form-control form-control-sm" id="project-description"
                                      name="description"
                                      value={project.details.description} onChange={props.handleChange}></textarea>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    else {
        return (<span></span>);
    }
}

function ProjectVisibility(props) {
    if (props.project.details != null) {
        return (
            <div className="row">
                <div className="col">
                    <h2 className="header px-0">Project Visibility</h2>
                    <h3>Privacy Level</h3>
                    <div id="project-visibility" className="mb-3">
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                                   value="public" checked={props.project.details.privacyLevel === 'public'}
                                   onClick={() => props.setPrivacyLevel('public')}/>
                            <label className="form-check-label small" htmlFor="privacy-public">Public: <i>All Users</i></label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                                   value="private" onClick={() => props.setPrivacyLevel('private')}
                                   checked={props.project.details.privacyLevel === 'private'}/>
                            <label className="form-check-label small" htmlFor="privacy-private">Private: <i>Group
                                Admins</i></label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="privacy-institution"
                                   name="privacy-level"
                                   value="institution" onClick={() => props.setPrivacyLevel('institution')}
                                   checked={props.project.details.privacyLevel === 'institution'}/>
                            <label className="form-check-label small" htmlFor="privacy-institution">Institution: <i>Group
                                Members</i></label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="privacy-invitation"
                                   name="privacy-level"
                                   value="invitation" onClick={() => props.setPrivacyLevel('invitation')} disabled
                                   checked={props.project.details.privacyLevel === 'invitation'}/>
                            <label className="form-check-label small" htmlFor="privacy-invitation">Invitation: <i>Coming
                                Soon</i></label>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (<span></span>);
}

function ProjectAOI(props) {
    var project = props.project;
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
                                       defaultValue={project.latMax} placeholder="North" autocomplete="off" min="-90.0"
                                       max="90.0" step="any"/>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <input class="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                       defaultValue={project.lonMin} placeholder="West" autocomplete="off" min="-180.0"
                                       max="180.0" step="any"/>
                            </div>
                            <div class="col-md-6">
                                <input class="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                       defaultValue={project.lonMax} placeholder="East" autocomplete="off" min="-180.0"
                                       max="180.0" step="any"/>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 offset-md-3">
                                <input class="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                       defaultValue={project.latMin} placeholder="South" autocomplete="off" min="-90.0"
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
    var project = props.project;
    if (project.imageryList != null) {
        return (
            <div className="row mb-3">
                <div className="col">
                    <h2 className="header px-0">Project Imagery</h2>
                    <div id="project-imagery">
                        <div className="form-group mb-1">
                            <h3 htmlFor="base-map-source">Basemap Source</h3>
                            <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                                    size="1"
                                    value={project.details.baseMapSource} onChange={props.setBaseMapSource}>
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
    else {
        return (<span></span>);
    }
}

function PlotDesign(props) {
    var project = props.project;
    var plotshape = "";
    if (project.details != null) {
        plotshape = <React.Fragment>
            <p htmlFor="plot-size">{"Plot " + project.details.plotShape == 'circle' ? 'Diameter' : 'Width' + "(m)"}</p>
            <input className="form-control form-control-sm" type="number" id="plot-size"
                   name="plot-size" autoComplete="off" min="0.0" step="any"
                   defaultValue={project.details.plotSize}/>
        </React.Fragment>
        return (
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
                                           onClick={() => props.setPlotDistribution('random')}
                                           checked={props.project.details.plotDistribution === 'random'}/>
                                    <label className="form-check-label small"
                                           htmlFor="plot-distribution-random">Random</label>
                                </div>
                                <div className="form-check form-check-inline">
                                    <input className="form-check-input" type="radio" id="plot-distribution-gridded"
                                           name="plot-distribution" defaultValue="gridded"
                                           onClick={() => props.setPlotDistribution('gridded')}
                                           checked={props.project.details.plotDistribution === 'gridded'}/>
                                    <label className="form-check-label small"
                                           htmlFor="plot-distribution-gridded">Gridded</label>
                                </div>
                                <div className="form-check form-check-inline">
                                    <input className="form-check-input" type="radio" id="plot-distribution-csv"
                                           name="plot-distribution" defaultValue="csv"
                                           onClick={() => props.setPlotDistribution('csv')}
                                           checked={props.project.details.plotDistribution === 'csv'}/>
                                    <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                           id="custom-csv-upload">
                                        <small>Upload CSV</small>
                                        <input type="file" accept="text/csv" id="plot-distribution-csv-file"
                                               style={{display: "none"}} disabled/>
                                    </label>
                                </div>
                                <div className="form-check form-check-inline">
                                    <input className="form-check-input" type="radio" id="plot-distribution-shp"
                                           name="plot-distribution" defaultValue="shp"
                                           onClick={() => props.setPlotDistribution('shp')}
                                           checked={props.project.details.plotDistribution === 'shp'}/>
                                    <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                           id="custom-shp-upload">
                                        <small>Upload SHP</small>
                                        <input type="file" accept=".shp" id="plot-distribution-shp-file"
                                               style={{display: "none"}} disabled/>
                                    </label>
                                </div>
                                <p id="plot-design-text">Description about random</p>

                                <div className="form-group mb-1">
                                    <p htmlFor="num-plots">Number of plots</p>
                                    <input className="form-control form-control-sm" type="number" id="num-plots"
                                           name="num-plots" autoComplete="off" min="0" step="1"
                                           defaultValue={project.details == null ? "" : project.details.numPlots}/>
                                </div>
                                <div className="form-group mb-1">
                                    <p htmlFor="plot-spacing">Plot spacing (m)</p>
                                    <input className="form-control form-control-sm" type="number" id="plot-spacing"
                                           name="plot-spacing" autoComplete="off" min="0.0" step="any"
                                           defaultValue={project.details == null ? "" : project.details.plotSpacing}
                                           disabled/>
                                </div>
                            </div>
                        </div>
                        <hr/>
                        <div className="row">
                            <div id="plot-design-col2" className="col">
                                <h3>Plot Shape</h3>
                                <div className="form-check form-check-inline">
                                    <input className="form-check-input" type="radio" id="plot-shape-circle"
                                           name="plot-shape" defaultValue="circle"
                                           onClick={() => props.setPlotShape('circle')}
                                           checked={props.project.details.plotShape === 'circle'}/>
                                    <label className="form-check-label small" htmlFor="plot-shape-circle">Circle</label>
                                </div>
                                <div className="form-check form-check-inline">
                                    <input className="form-check-input" type="radio" id="plot-shape-square"
                                           name="plot-shape" defaultValue="square"
                                           onClick={() => props.setPlotShape('square')}
                                           checked={props.project.details.plotShape === 'square'}/>
                                    <label className="form-check-label small" htmlFor="plot-shape-square">Square</label>
                                </div>
                                {plotshape}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    else {
        return (<span></span>);
    }
}

function SampleDesign(props) {
    var project = props.project;
    if (project.details != null) {
        return (
            <div className="row mb-3">
                <div className="col">
                    <div id="sample-design">
                        <h2 className="header px-0">Sample Design</h2>
                        <h3>Spatial Distribution</h3>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="sample-distribution-random"
                                   name="sample-distribution" defaultValue="random"
                                   onClick={() => props.setSampleDistribution('random')}
                                   checked={props.project.details.sampleDistribution === 'random'}/>
                            <label className="form-check-label small"
                                   htmlFor="sample-distribution-random">Random</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="sample-distribution-gridded"
                                   name="sample-distribution" defaultValue="gridded"
                                   onClick={() => props.setSampleDistribution('gridded')}
                                   checked={props.project.details.sampleDistribution === 'gridded'}/>
                            <label className="form-check-label small"
                                   htmlFor="sample-distribution-gridded">Gridded</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="sample-distribution-csv"
                                   name="sample-distribution" defaultValue="csv"
                                   onClick={() => props.setSampleDistribution('csv')}
                                   checked={props.project.details.sampleDistribution === 'csv'}/>
                            <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                   id="sample-custom-csv-upload">
                                <small>Upload CSV</small>
                                <input type="file" accept="text/csv" id="sample-distribution-csv-file"
                                       style={{display: "none"}} disabled/>
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" id="sample-distribution-shp"
                                   name="sample-distribution" defaultValue="shp"
                                   onClick={() => props.setSampleDistribution('shp')}
                                   checked={props.project.details.sampleDistribution === 'shp'}/>
                            <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                   id="sample-custom-shp-upload">
                                <small>Upload SHP</small>
                                <input type="file" accept=".shp" id="sample-distribution-shp-file"
                                       style={{display: "none"}} disabled/>
                            </label>
                        </div>
                        <p id="sample-design-text">Description about random</p>
                        <div className="form-group mb-1">
                            <p htmlFor="samples-per-plot">Samples per plot</p>
                            <input className="form-control form-control-sm" type="number" id="samples-per-plot"
                                   name="samples-per-plot" autoComplete="off" min="0" step="1"
                                   defaultValue={project.details.samplesPerPlot}/>
                        </div>
                        <div className="form-group mb-1">
                            <p htmlFor="sample-resolution">Sample resolution (m)</p>
                            <input className="form-control form-control-sm" type="number" id="sample-resolution"
                                   name="sample-resolution" autoComplete="off" min="0.0" step="any"
                                   defaultValue={project.details.sampleResolution} disabled/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    else return (<span></span>);
}

function SampleValueInfo(props) {
    var project = props.project;
    if (project.details != null) {
        return (
            project.details.sampleValues.map(sampleValueGroup =>
                <div className="sample-value-info">
                    <h2 className="header px-0">
                        <RemoveSampleValueGroupButton projectId={props.projectId}
                                                      removeSampleValueGroup={props.removeSampleValueGroup}
                                                      sampleValueGroup={sampleValueGroup}/>
                        Sample Value Group: {sampleValueGroup.name}
                    </h2>
                    <table className="table table-sm">
                        <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Name</th>
                            <th scope="col">Color</th>
                            <th scope="col">&nbsp;</th>
                        </tr>
                        </thead>
                        <tbody>
                        {
                            props.topoSort(sampleValueGroup.values).map(sampleValue =>
                                <tr>
                                    <td>
                                        <RemoveSampleValueRowButton projectId={props.projectId}
                                                                    removeSampleValueRow={props.removeSampleValueRow}
                                                                    sampleValueGroup={sampleValueGroup}
                                                                    sampleValue={sampleValue}/>
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
                                    <td>
                                        &nbsp;
                                    </td>
                                </tr>
                            )
                        }
                        <SampleValueTable project={project} projectId={props.projectId}
                                          sampleValueGroup={sampleValueGroup}
                                          getParentSampleValues={props.getParentSampleValues}
                                          addSampleValueRow={props.addSampleValueRow}
                                          handleInputName={props.handleInputName}
                                          handleInputColor={props.handleInputColor}
                                          handleInputParent={props.handleInputParent}/>
                        </tbody>
                    </table>
                </div>
            )
        );
    }
    else {
        return (<span></span>);
    }
}

function RemoveSampleValueGroupButton(props) {
    if (props.projectId == "0") {
        return (<input id="remove-sample-value-group" type="button" className="button" value="-"
                       onClick={() => props.removeSampleValueGroup(props.sampleValueGroup.name)}/>
        );
    }
    else
        return (<span></span>);
}

function RemoveSampleValueRowButton(props) {
    if (props.projectId == "0") {
        if (props.sampleValue) {
            return (
                <input type="button" className="button" value="-"
                       onClick={() => props.removeSampleValueRow(props.sampleValueGroup.name, props.sampleValue.name)}/>
            );
        }
        else return (<h1></h1>);
    }
    else
        return (<span></span>);
}

function SampleValueTable(props) {
    var project = props.project;
    var name = "", color = "", parent = "";
    if (project.newValueEntry[props.sampleValueGroup.name]) {
        name = project.newValueEntry[props.sampleValueGroup.name].name;
        color = project.newValueEntry[props.sampleValueGroup.name].color;
        parent = project.newValueEntry[props.sampleValueGroup.name].parent;

    }
    if (props.projectId == "0") {
        return (
            <tr>
                <td>
                    <input type="button" className="button" value="+"
                           onClick={() => props.addSampleValueRow(props.sampleValueGroup.name)}/>
                </td>
                <td>
                    <input type="text" className="value-name" autoComplete="off"
                           value={name} onChange={(e) => props.handleInputName(props.sampleValueGroup.name, e)}/>
                </td>
                <td>
                    <input type="color" className="value-color"
                           value={color} onChange={(e) => props.handleInputColor(props.sampleValueGroup.name, e)}/>
                </td>
                <td>
                    <label htmlFor="value-parent">Parent:</label>
                    <select id="value-parent" className="form-control form-control-sm" size="1" defaultValue={parent}
                            onChange={(e) => props.handleInputParent(props.sampleValueGroup.name, e)}>
                        <option value="">None</option>
                        {
                            props.getParentSampleValues(props.sampleValueGroup.values).map(parentSampleValue =>
                                <option value={parentSampleValue.name}>{parentSampleValue.name}</option>
                            )
                        }
                    </select>
                </td>
            </tr>
        );
    }
    else
        return (<span></span>);
}

function ProjectManagement(props) {
    var project = props.project;
    var buttons = "";
    if (props.projectId == "0") {
        buttons = <input type="button" id="create-project" className="btn btn-outline-danger btn-sm btn-block"
                         name="create-project" value="Create Project"
                         onClick={props.createProject}/>;
    }
    else {
        if (project.details != null) {
            buttons = <React.Fragment>
                <input type="button" id="configure-geo-dash" className="btn btn-outline-lightgreen btn-sm btn-block"
                       name="configure-geo-dash" value="Configure Geo-Dash"
                       onClick={props.configureGeoDash}
                       style={{display: project.details.availability == 'unpublished' || project.details.availability == 'published' ? 'block' : 'none'}}/>


                <input type="button" id="download-plot-data"
                       className="btn btn-outline-lightgreen btn-sm btn-block"
                       name="download-plot-data" value="Download Plot Data"
                       onClick={props.downloadPlotData}
                       style={{display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none'}}/>

                <input type="button" id="download-sample-data"
                       className="btn btn-outline-lightgreen btn-sm btn-block"
                       name="download-sample-data" value="Download Sample Data"
                       onClick={props.downloadSampleData}
                       style={{display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none'}}/>
                <input type="button" id="change-availability"
                       className="btn btn-outline-danger btn-sm btn-block"
                       name="change-availability"
                       value={project.stateTransitions[project.details.availability] + "Project"}
                       onClick={props.changeAvailability}/>
            </React.Fragment>
        }
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

function renderProject(documentRoot, userId, projectId,institutionId,project_stats_visibility,project_template_visibility) {
    ReactDOM.render(
        <Project documentRoot={documentRoot} userId={userId} projectId={projectId} institutionId={institutionId}
                 project_stats_visibility={project_stats_visibility}
                 project_template_visibility={project_template_visibility}/>,
        document.getElementById("project")
    );
}
