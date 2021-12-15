import React from "react";
import ReactDOM from "react-dom";

import {StatsCell, StatsRow} from "./components/FormComponents";
import {LoadingModal, NavigationBar} from "./components/PageComponents";

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
            modalMessage: null
        };
    }

    /// Lifecycle

    componentDidMount() {
        this.processModal("Loading Project Details", this.getProjectDetails());
    }

    componentDidUpdate(prevProps, prevState) {
        // Show plots after both the map and plot list are loaded.
        if ((!prevState.mapConfig || prevState.plotList.length === 0)
            && this.state.mapConfig
            && this.state.plotList.length > 0) {
            mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList);
        }
    }

    /// API Calls

    getProjectDetails = () => {
        const {projectId} = this.props;
        return Promise.all([
            this.getProjectById(projectId),
            this.getProjectStats(projectId),
            this.getPlotList(projectId)
        ])
            .catch(error => {
                console.error(error);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    getProjectById = projectId =>
        fetch(`/get-project-by-id?projectId=${projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                if (data === "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = "/home";
                } else {
                    this.setState({projectDetails: data});
                    return this.getImageryList(data.institution);
                }
            });

    getImageryList = institutionId =>
        fetch(`/get-institution-imagery?institutionId=${institutionId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.setState({
                    imageryList: data,
                    projectDetails: {
                        ...this.state.projectDetails,
                        baseMapSource: this.state.projectDetails.baseMapSource
                                           || data[0].title
                    }
                }, this.showProjectMap);
            });

    getProjectStats = projectId =>
        fetch(`/get-project-stats?projectId=${projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.setState({stats: data});
            });

    getPlotList = projectId =>
        fetch(`/get-project-plots?projectId=${projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({plotList: data}));

    /// Helpers

    processModal = (message, promise) => this.setState(
        {modalMessage: message},
        () => promise.finally(() => this.setState({modalMessage: null}))
    );

    showProjectMap() {
        const {imageryId, boundary} = this.state.projectDetails;
        // TODO, CEO-286 have mercator only load imagery as selected. For now, only pass single imagery.
        const singleImagery = this.state.imageryList.find(i => i.id === imageryId);
        // Initialize the basemap
        const mapConfig = mercator.createMap(
            "project-map",
            [0.0, 0.0],
            1,
            [singleImagery]
        );
        mercator.setVisibleLayer(mapConfig, imageryId);
        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.addVectorLayer(
            mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(
                mercator.parseGeoJson(boundary, true)
            ),
            mercator.ceoMapStyles("geom", "yellow")
        );
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({mapConfig});
    }

    render() {
        return (
            <div
                className="d-flex flex-column full-height p-3"
                id="project-dashboard"
            >
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
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
                            projectDetails={this.state.projectDetails}
                            stats={this.state.stats}
                            userName={this.props.userName}
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
            totalPlots,
            plotAssignments,
            usersAssigned,
            analyzedPlots,
            partialPlots,
            unanalyzedPlots,
            flaggedPlots,
            userStats
        },
        projectDetails: {
            closedDate,
            createdDate,
            publishedDate
        },
        isProjectAdmin,
        userName
    } = props;

    const renderDate = (title, date) => (
        <div style={{alignItems: "center", display: "flex", marginRight: "1rem"}}>
            {title}:
            <span className="badge badge-pill bg-lightgreen ml-1">
                {date}
            </span>
        </div>
    );

    const renderStat = (title, stat) => (
        <span style={{width: "50%"}}>
            <StatsCell title={title}>{stat}</StatsCell>
        </span>
    );

    return (
        <div className="d-flex flex-column">
            <h2 className="header px-0">Project Stats</h2>
            {totalPlots > 0 && (
                <div className="p-1" id="project-stats">
                    <div className="mb-4">
                        <h3>Project Dates:</h3>
                        <div style={{display: "flex", flexWrap: "wrap", padding: "0 .5rem"}}>
                            {renderDate("Created", createdDate || "Unknown")}
                            {renderDate("Published", publishedDate || "N/A")}
                            {renderDate("Closed", closedDate || "N/A")}
                        </div>
                    </div>
                    <div className="mb-2">
                        <h3>Plot Stats:</h3>
                        <div style={{display: "flex", flexWrap: "wrap", padding: "0 .5rem"}}>
                            {renderStat("Total Plots", totalPlots)}
                            {plotAssignments > 0 && renderStat("Plot Assignments", plotAssignments)}
                            {plotAssignments > 0 && renderStat("Users Assigned", usersAssigned)}
                            {renderStat("Flagged", flaggedPlots)}
                            {renderStat("Analyzed", analyzedPlots)}
                            {plotAssignments > 0 && renderStat("Partial Plots", partialPlots)}
                            {renderStat("Unanalyzed", unanalyzedPlots)}
                        </div>
                    </div>
                    {userStats && (
                        <div>
                            <h3>User Completed:</h3>
                            {userStats.map((user, idx) => (
                                <StatsRow
                                    key={user.email}
                                    analysisTime={user.timedPlots > 0
                                        ? (user.seconds / user.timedPlots / 1.0).toFixed(2)
                                        : 0}
                                    plots={user.plots}
                                    title={(isProjectAdmin || user.email === userName)
                                        ? `${idx + 1}. ${user.email}`
                                        : `User ${idx + 1}`}
                                />
                            ))}
                            <StatsRow
                                analysisTime={userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                                    ? (userStats.reduce((p, c) => p + c.seconds, 0)
                                        / userStats.reduce((p, c) => p + c.timedPlots, 0)
                                        / 1.0).toFixed(2)
                                    : 0}
                                plots={userStats.reduce((p, c) => p + c.plots, 0)}
                                title="Total"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
                userName={args.userName}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
