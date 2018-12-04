import React from 'react';
import ReactDOM from 'react-dom';
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";

class ProjectDashboard extends React.Component {
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
        };
    };

    componentDidMount() {
        if (this.state.details == null) {
            this.getProjectById(this.props.projectId);
        }
        if (this.state.stats == null) {
            this.getProjectStats(this.props.projectId);
        }
        if (this.state.imageryList == null) {
            this.getImageryList(this.props.institutionId);
        }
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
                    window.location = this.props.documentRoot + "/home";
                } else {
                    var detailsNew = data;
                    var sv = detailsNew.sampleValues;
                    var newSV = [];
                    var tempSQ = {id: -1, question: "", answers: [], parent_question: -1, parent_answer: -1};
                    if (sv.length > 0) {
                        sv.map((sq) => {
                                if (sq.name) {
                                    tempSQ.id = sq.id;
                                    tempSQ.question = sq.name;
                                    sq.values.map((sa) => {
                                        if (sa.name) {
                                            if (sa.id > 0) {
                                                tempSQ.answers.push({id: sa.id, answer: sa.name, color: sa.color});
                                            }
                                        }
                                        else {
                                            tempSQ.answers.push(sa);
                                        }

                                    });
                                    if (tempSQ.id > 0) {
                                        newSV.push(tempSQ);
                                    }
                                }
                                else {
                                    newSV.push(sq);
                                }
                            }
                        );
                    }
                    detailsNew.sampleValues = newSV;
                    this.setState({details: detailsNew});
                    this.updateUnmanagedComponents(this.props.projectId);

                }
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
                ceoMapStyles.yellowPolygon);
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

            if (this.state.imageryList && this.state.imageryList.length > 0) {
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

    render() {
        return (
            <div id="project-design" className="col-xl-6 col-lg-8 border bg-lightgray mb-5"
                 style={{display: "contents"}}>
                <div className="bg-darkgreen mb-3 no-container-margin" style={{width: "100%", margin: "0 10px 0 10px"}}>
                    <h1>Project Dashboard</h1>
                </div>
                <div style={{display: "inline-flex", width: "100%", margin: "0 10px 0 10px"}}>
                    <div className="bg-lightgray" style={{margin: "20px", width: "70%"}}>
                        <ProjectAOI projectId={this.props.projectId} project={this.state}/>
                    </div>
                    <div className="bg-lightgray" style={{margin: "20px", width: "30%"}}>
                        <ProjectStats project={this.state}
                                      project_stats_visibility={this.props.project_stats_visibility}/>
                    </div>

                </div>
            </div>
        );
    }
}

function ProjectStats(props) {
    var project = props.project;
    if (project.stats != null) {
        return (
            <div id="project-stats" className="header">
                <div className="col">

                    <h2 className="header px-0">Project Stats</h2>
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

        );
    }
    else {
        return (<span></span>);
    }
}

function ProjectAOI(props) {
    return (
        <div className="header">
            <div className="col">
                <h2 className="header px-0">Project AOI</h2>
                <div id="project-aoi">
                    <div id="project-map"></div>
                </div>
            </div>
        </div>
    );
}

export function renderProjectDashboardPage(args) {
    ReactDOM.render(
        <ProjectDashboard documentRoot={args.documentRoot} userId={args.userId} projectId={args.projectId} institutionId={args.institutionId}
                 project_stats_visibility={args.project_stats_visibility}
                 project_template_visibility={args.project_template_visibility}/>,
        document.getElementById("project_dashboard")
    );
}
