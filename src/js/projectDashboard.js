import React from "react";
import ReactDOM from "react-dom";

import {StatsCell, StatsRow} from "./components/FormComponents";
import {NavigationBar} from "./components/PageComponents";

import {mercator} from "./utils/mercator";

class ProjectDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: {},
            stats: {},
            imageryList: [],
            mapConfig: null,
            plotList: [],
            isMapShown: false
        };
    }

    componentDidMount() {
        this.getProjectById(this.props.projectId);
        this.getProjectStats(this.props.projectId);
        this.getPlotList(this.props.projectId);
    }

    componentDidUpdate(prevProps, prevState) {
        // Load imagery after getting project details to find institution.
        if (Object.entries(prevState.projectDetails).length === 0
                && prevState.projectDetails.constructor === Object
                && this.state.projectDetails.institution) {
            this.getImageryList(this.state.projectDetails.institution);
        }
        // Show the project map
        if (this.state.imageryList.length > 0 && this.state.projectDetails.id && !this.state.isMapShown) {
            this.setState({
                projectDetails: {
                    ...this.state.projectDetails,
                    baseMapSource: this.state.projectDetails.baseMapSource
                                   || this.state.imageryList[0].title
                },
                isMapShown: true
            });
            this.showProjectMap();
        }
        if (this.state.isMapShown && this.state.plotList.length > 0) {
            mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList);
        }
    }

    getProjectById(projectId) {
        fetch(`/get-project-by-id?projectId=${projectId}`)
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
                    window.location = "/home";
                } else {
                    this.setState({projectDetails: data});
                }
            });
    }

    getProjectStats(projectId) {
        fetch(`/get-project-stats?projectId=${projectId}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
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
        fetch(`/get-institution-imagery?institutionId=${institutionId}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList: data});
            });
    }

    getPlotList(projectId) {
        fetch(`/get-project-plots?projectId=${projectId}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
            });
    }

    showProjectMap() {
        // Initialize the basemap
        const mapConfig = mercator.createMap("project-map",
                                             [0.0, 0.0],
                                             1,
                                             this.state.imageryList);
        mercator.setVisibleLayer(mapConfig, this.state.projectDetails.imageryId);
        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(
                                    mercator.parseGeoJson(this.state.projectDetails.boundary, true)
                                ),
                                mercator.ceoMapStyles("geom", "yellow"));
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        // Show the plot centers on the map (but constrain to <= 100 points)
        this.setState({mapConfig});
    }

    render() {
        return (
            <div className="d-flex flex-column full-height p-3">
                <div className="bg-darkgreen">
                    <h1>Project Dashboard</h1>
                </div>
                <div className="d-flex justify-content-around mt-3 flex-grow-1">
                    <div className="bg-lightgray col-7">
                        <ProjectAOI/>
                    </div>
                    <div className="bg-lightgray col-4">
                        <ProjectStats
                            availability={this.state.projectDetails.availability}
                            isProjectAdmin={this.state.projectDetails.isProjectAdmin}
                            stats={this.state.stats}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

function ProjectStats(props) {
    const {
        stats: {
            analyzedPlots,
            closedDate,
            contributors,
            createdDate,
            flaggedPlots,
            members,
            publishedDate,
            unanalyzedPlots,
            userStats
        },
        availability,
        isProjectAdmin
    } = props;
    const numPlots = flaggedPlots + analyzedPlots + unanalyzedPlots;
    return numPlots
        ? (
            <div className="d-flex flex-column">
                <h2 className="header px-0">Project Stats</h2>
                <div className="p-1" id="project-stats">
                    <div className="mb-4">
                        <h3>Project Dates:</h3>
                        <div className="container row pl-4">
                            <div className="pr-4">
                                Date Created
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {createdDate || "Unknown"}
                                </span>
                            </div>
                            <div className="pr-4">
                                Date Published
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {publishedDate || (availability === "unpublished" ? "Draft" : "Unknown")}
                                </span>
                            </div>
                            <div className="pr-4">
                                Date Closed
                                <span className="badge badge-pill bg-lightgreen ml-3">
                                    {closedDate || (["archived", "closed"].includes(availability) ? "Unknown" : "Open")}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mb-2">
                        <h3>Project Stats:</h3>
                        <div className="row pl-2">
                            <div className="col-6">
                                <StatsCell title="Members">{members}</StatsCell>
                                <StatsCell title="Contributors">{contributors}</StatsCell>
                                <StatsCell title="Total Plots">{numPlots}</StatsCell>

                            </div>
                            <div className="col-6">
                                <StatsCell title="Flagged Plots">{flaggedPlots}</StatsCell>
                                <StatsCell title="Analyzed Plots">{analyzedPlots}</StatsCell>
                                <StatsCell title="Unanalyzed Plots">{unanalyzedPlots}</StatsCell>
                            </div>
                        </div>
                    </div>
                    {userStats && (
                        <div>
                            <h3>Plots Completed:</h3>
                            <StatsRow
                                analysisTime={userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                                    ? (userStats.reduce((p, c) => p + c.seconds, 0)
                                        / userStats.reduce((p, c) => p + c.timedPlots, 0)
                                        / 1.0).toFixed(2)
                                    : 0}
                                plots={userStats.reduce((p, c) => p + c.plots, 0)}
                                title="Total"
                            />
                            {isProjectAdmin && userStats.map(user => (
                                <StatsRow
                                    key={user.user}
                                    analysisTime={user.timedPlots > 0
                                        ? (user.seconds / user.timedPlots / 1.0).toFixed(2)
                                        : 0}
                                    plots={user.plots}
                                    title={user.user}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ) : <p>Loading...</p>;
}

function ProjectAOI() {
    return (
        <div className="d-flex flex-column h-100">
            <h2 className="header px-0">Project AOI</h2>
            <div id="project-map" style={{flex: 1}}/>
        </div>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <ProjectDashboard
                projectId={args.projectId || "0"}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
