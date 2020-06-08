import React from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";

class ProjectDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: {},
            stats: {},
            imageryList: [],
            mapConfig: null,
            plotList: [],
            dateCreated: null,
            datePublished: null,
            dateClosed: null,
            dateArchived: null,
            isMapShown: false,
        };
    }

    componentDidMount() {
        this.getProjectById(this.props.projectId);
        this.getProjectStats(this.props.projectId);
        this.getPlotList(this.props.projectId, 100);//100 is the number of plots you want to see on the map
    }

    componentDidUpdate(prevProps, prevState) {
        // Load imagery after getting project details to find institution.
        if (Object.entries(prevState.projectDetails).length === 0 && prevState.projectDetails.constructor === Object && this.state.projectDetails.institution) {
            this.getImageryList(this.state.projectDetails.institution);
        }
        // Show the project map
        if (this.state.imageryList.length > 0 && this.state.projectDetails.id && !this.state.isMapShown) {
            this.setState({
                projectDetails: {
                    ...this.state.projectDetails,
                    baseMapSource: this.state.projectDetails.baseMapSource
                                   || this.state.imageryList[0].title,
                },
                isMapShown: true,
            });
            this.showProjectMap();
        }
        if (this.state.isMapShown && this.state.plotList.length > 0) {
            mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.projectDetails.plotShape);
        }
    }

    getProjectById(projectId) {
        fetch(this.props.documentRoot + "/get-project-by-id?projectId=" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                if (data === "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.props.documentRoot + "/home";
                } else {
                    const newSurveyQuestions = convertSampleValuesToSurveyQuestions(data.sampleValues);
                    this.setState({ projectDetails: { ...data, surveyQuestions: newSurveyQuestions }});
                }
            });
    }

    getProjectStats(projectId) {
        fetch(this.props.documentRoot + "/get-project-stats?projectId=" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving project stats. See console for details.");
                }
            })
            .then(data => {
                this.setState({ stats: data });
            });
    }

    getImageryList(institutionId) {
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({ imageryList: data });
            });
    }

    getPlotList(projectId, maxPlots) {
        fetch(this.props.documentRoot + "/get-project-plots?projectId=" + projectId + "&max=" + maxPlots)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            })
            .then(data => {
                this.setState({ plotList: data });
            });
    }

    showProjectMap() {
        // Initialize the basemap
        const mapConfig = mercator.createMap("project-map",
                                             [0.0, 0.0],
                                             1,
                                             this.state.imageryList,
                                             this.props.documentRoot);
        mercator.setVisibleLayer(mapConfig, this.state.projectDetails.imageryId);
        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        // Show the plot centers on the map (but constrain to <= 100 points)
        this.setState({ mapConfig: mapConfig });
    }

    render() {
        return (
            <div
                id="project-design"
                className="col-xl-6 col-lg-8 border bg-lightgray mb-5"
                style={{ display: "contents" }}
            >
                <div className="bg-darkgreen mb-3 no-container-margin" style={{ width: "100%", margin: "0 10px 0 10px" }}>
                    <h1>Project Dashboard</h1>
                </div>
                <div style={{ display: "inline-flex", width: "100%", margin: "0 10px 0 10px" }}>
                    <div className="bg-lightgray" style={{ margin: "20px", width: "70%" }}>
                        <ProjectAOI/>
                    </div>
                    <div className="bg-lightgray" style={{ margin: "20px", width: "30%" }}>
                        <ProjectStats
                            project={this.state}
                            project_stats_visibility={this.props.project_stats_visibility}
                        />
                    </div>

                </div>
            </div>
        );
    }
}

function ProjectStats(props) {
    return (
        <div id="project-stats" className="header">
            <div className="col">
                <h2 className="header px-0">Project Stats</h2>
                <table className="table table-sm">
                    <tbody>
                        <tr>
                            <td>Members</td>
                            <td>{props.project.stats.members}</td>
                            <td>Contributors</td>
                            <td>{props.project.stats.contributors}</td>
                        </tr>
                        <tr>
                            <td>Total Plots</td>
                            <td>{props.project.projectDetails.numPlots}</td>
                            <td>Date Created</td>
                            <td>{props.project.dateCreated}</td>
                        </tr>
                        <tr>
                            <td>Flagged Plots</td>
                            <td>{props.project.stats.flaggedPlots}</td>
                            <td>Date Published</td>
                            <td>{props.project.datePublished}</td>
                        </tr>
                        <tr>
                            <td>Analyzed Plots</td>
                            <td>{props.project.stats.analyzedPlots}</td>
                            <td>Date Closed</td>
                            <td>{props.project.dateClosed}</td>
                        </tr>
                        <tr>
                            <td>Unanalyzed Plots</td>
                            <td>{props.project.stats.unanalyzedPlots}</td>
                            <td>Date Archived</td>
                            <td>{props.project.dateArchived}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProjectAOI() {
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
        <ProjectDashboard
            documentRoot={args.documentRoot}
            userId={args.userId}
            projectId={args.projectId}
            project_stats_visibility={args.project_stats_visibility}
            project_template_visibility={args.project_template_visibility}
        />,
        document.getElementById("project-dashboard")
    );
}
