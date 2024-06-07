import React, { useState } from "react";
import ReactDOM from "react-dom";

import { StatsCell, StatsRow } from "./components/FormComponents";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import { getQueryString } from "./utils/generalUtils";
import SvgIcon from "./components/svg/SvgIcon";

import { mercator } from "./utils/mercator";

class ProjectDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projectDetails: {},
      stats: {},
      imageryList: [],
      mapConfig: null,
      plotList: [],
      modalMessage: null,
      activeTab: 0,
      plotId: 1,
      plotInfo: {},
    };
      // Bind the methods to the class instance
    this.showProjectMap = this.showProjectMap.bind(this);
    this.setActiveTab = this.setActiveTab.bind(this);
    this.setPlotInfo = this.setPlotInfo.bind(this);
  }

  /// Lifecycle

  componentDidMount() {
    this.processModal("Loading Project Details", this.getProjectDetails());
  }

  componentDidUpdate(prevProps, prevState) {
    // Show plots after both the map and plot list are loaded.
    if (
      (!prevState.mapConfig || prevState.plotList.length === 0) &&
      this.state.mapConfig &&
      this.state.plotList.length > 0
    ) {
      mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList);
    }
    // Initialize the map when both projectDetails and imageryList are available
    if (
      (!prevState.projectDetails || prevState.imageryList.length === 0) &&
      this.state.projectDetails &&
      this.state.imageryList.length > 0
    ) {
      this.initializeMap();
    }
  }

  initializeMap() {
    const { imageryId, aoiFeatures } = this.state.projectDetails;
    const singleImagery = this.state.imageryList.find((i) => i.id === imageryId);
    // Initialize the basemap
    const mapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, [singleImagery]);
    mercator.setVisibleLayer(mapConfig, imageryId);
    mercator.removeLayerById(mapConfig, "currentPlot");
    mercator.addVectorLayer(
      mapConfig,
      "currentAOI",
      mercator.geomArrayToVectorSource(aoiFeatures),
      mercator.ceoMapStyles("geom", "yellow")
    );
    mercator.zoomMapToLayer(mapConfig, "currentAOI");
    this.setState({ mapConfig });
  }

  
  /// API Calls
  getProjectDetails = () => {
    const { projectId } = this.props;
    return Promise.all([
      this.getProjectById(projectId),
      this.getProjectStats(projectId),
      this.getPlotList(projectId),
    ]).catch((error) => {
      console.error(error);
      alert("Error retrieving the project info. See console for details.");
    });
  };

  getProjectById = (projectId) =>
    fetch(`/get-project-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data === "") {
          alert("No project found with ID " + projectId + ".");
          window.location = "/home";
        } else {
          this.setState({ projectDetails: data });
          return this.getImageryList(data.institution);
        }
      });

  getImageryList = (institutionId) =>
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.setState(
          {
            imageryList: data,
            projectDetails: {
              ...this.state.projectDetails,
              baseMapSource: this.state.projectDetails.baseMapSource || data[0].title,
            },
          }
        );
      });
  
  getProjectStats = (projectId) =>
    fetch(`/project-stats?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.setState({ stats: data });
      });

  getPlotList = (projectId) =>
    fetch(`/get-project-plots?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.setState({ plotList: data }));

  /// Helpers

  processModal = (message, promise) =>
    this.setState({ modalMessage: message }, () =>
      promise.finally(() => this.setState({ modalMessage: null }))
    );

  showProjectMap(activeTab = 0) {
    const { imageryId, aoiFeatures } = this.state.projectDetails;
    const mapConfig = this.state.mapConfig;
    // Display a bounding box with the project's AOI on the map and zoom to it
    if(activeTab === 1) {
      mercator.removeLayerById(mapConfig, "currentAOI");
      mercator.removeLayerById(mapConfig, "currentPlot");
      mercator.addVectorLayer(
        mapConfig,
        "currentPlot",
        mercator.geometryToVectorSource(
          this.state.plotInfo.plotGeom.includes("Point")
            ? mercator.getPlotPolygon(
              this.state.plotInfo.plotGeom,
              projectDetails.plotSize,
              projectDetails.plotShape
            )
            : mercator.parseGeoJson(this.state.plotInfo.plotGeom, true)
        ),
        mercator.ceoMapStyles("geom", "yellow")
      );
      mercator.zoomMapToLayer(mapConfig, "currentPlot", 36);

    } else {
      mercator.removeLayerById(mapConfig, "currentPlot");
      mercator.addVectorLayer(
        mapConfig,
        "currentAOI",
        mercator.geomArrayToVectorSource(aoiFeatures),
        mercator.ceoMapStyles("geom", "yellow")
      );
      mercator.zoomMapToLayer(mapConfig, "currentAOI");
      mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList);
    }
    this.setState({ mapConfig });
  }
  
  setActiveTab = (index) => {
    this.setState({ activeTab: index });
  };
  
  setPlotInfo = (stats) => {
    this.setState({ plotInfo: stats });
  }
  
  render() {
    return (
      <div className="d-flex flex-column full-height p-3" id="project-dashboard">
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        <div className="bg-darkgreen">
          <h1>Project Dashboard</h1>
        </div>
        <div className="d-flex justify-content-around mt-3 flex-grow-1">
          <div className="bg-lightgray col-6">
            <ProjectAOI />
          </div>
          <Tabs className="col-6"
                activeTab={this.state.activeTab}
                setActiveTab={this.setActiveTab}>
            <Tab label="Project Statistics">
              <div className="bg-lightgray col-12">
                <ProjectStats
                  availability={this.state.projectDetails.availability}
                  isProjectAdmin={this.state.projectDetails.isProjectAdmin}
                  projectDetails={this.state.projectDetails}
                  stats={this.state.stats}
                  userName={this.props.userName}
                />
              </div>
            </Tab>
            <Tab label="Plot Statistics">
              <div className="bg-lightgray col-12">
                <PlotStats
                  projectId={this.props.projectId}
                  plotId={this.state.plotId}
                  setPlotInfo={this.setPlotInfo}
                  showProjectMap={this.showProjectMap}
                />
              </div>
            </Tab>
            <Tab label="User Statistics">
              <div className="bg-lightgray col-12">
                <UserStats
                  userStats={this.state.stats.userStats}
                  analyzedPlots={this.state.stats.analyzedPlots}
                  isProjectAdmin={this.state.projectDetails.isProjectAdmin}
                  userName={this.props.userName}
                />
              </div>
            </Tab>
          </Tabs>
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
      averageConfidence,
      minConfidence,
      maxConfidence,
      flaggedPlots,
    },
    projectDetails: { closedDate, createdDate, publishedDate },
  } = props;

  const renderDate = (title, date) => (
    <div style={{ alignItems: "center", display: "flex", marginRight: "1rem" }}>
      {title}:<span className="badge badge-pill bg-lightgreen ml-1">{date}</span>
    </div>
  );

  const renderStat = (title, stat) => (
    <span style={{ width: "50%" }}>
      <StatsCell title={title}>{stat}</StatsCell>
    </span>
  );

  return (
    <div className="d-flex flex-column">
      {totalPlots > 0 && (
        <div className="p-1" id="project-stats">
          <div className="mb-4">
            <h3>Project Dates:</h3>
            <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
              {renderDate("Created", createdDate || "Unknown")}
              {renderDate("Published", publishedDate || "N/A")}
              {renderDate("Closed", closedDate || "N/A")}
            </div>
          </div>
          <div className="mb-2">
            <h3>Project Stats:</h3>
            <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
              {renderStat("Total Plots", totalPlots)}
              {plotAssignments > 0 && renderStat("Plot Assignments", plotAssignments)}
              {plotAssignments > 0 && renderStat("Users Assigned", usersAssigned)}
              {renderStat("Flagged", flaggedPlots)}
              {renderStat("Analyzed", analyzedPlots)}
              {plotAssignments > 0 && renderStat("Partial Plots", partialPlots)}
              {renderStat("Unanalyzed", unanalyzedPlots)}
              {renderStat("Average Confidence", `${averageConfidence} %`)}
              {renderStat("Max Confidence", `${maxConfidence} %`)}
              {renderStat("Min Confidence", `${minConfidence} %`)}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PlotStats = ({ projectId, plotId, setPlotInfo, showProjectMap }) => {
  const [plotStats, setPlotStats] = useState({});
  const [newPlotId, setNewPlotId] = useState(plotId);

  const  getPlotData = (visibleId, direction) => {
    fetch(
      `/qaqc-plot?visibleId=${visibleId}&direction=${direction}&projectId=${projectId}`
    )
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data === "not-found") {
          const err = (direction === "id" ? "Plot not" : "No more plots") +
                " found for this navigation mode.";
          alert(err);
        } else {
          setPlotInfo(data);
          setNewPlotId(data.visibleId);
          showProjectMap(1);
        }
      })
      .catch((response) => {
        console.error(response);
        alert("Error retrieving plot data. See console for details.");
      })
  };
  
  const navButtons = () => (
    <div className="row justify-content-center mb-2" id="plot-nav">
      <button
        className="btn btn-outline-lightgreen btn-sm"
        onClick={() => getPlotData(newPlotId, "previous")}
        type="button"
      >
        <SvgIcon icon="leftArrow" size="0.9rem" />
      </button>
      <button
        className="btn btn-outline-lightgreen btn-sm mx-1"
        onClick={() => getPlotData(newPlotId, "next")}
        type="button"
      >
        <SvgIcon icon="rightArrow" size="0.9rem" />
      </button>
      <input
        autoComplete="off"
        className="col-4 px-0 ml-2 mr-1"
        id="plotId"
        onChange={(e) => setNewPlotId(e.target.value)}
        type="number"
        value={newPlotId}
      />
      <button
        className="btn btn-outline-lightgreen btn-sm"
        onClick={() => !isNaN(newPlotId) ? getPlotData(newPlotId, "id")
                                         : alert("Please enter a number to go to plot.")}
        type="button"
      >
        Go to plot
      </button>
    </div>
  );
  
  return (
    <div className="d-flex flex-column">
      {navButtons()}
    </div>
  );
}


const UserStats = ({ userStats, analyzedPlots, isProjectAdmin, userName }) => {
  return (
    <>
      {userStats && (
        <div>
          <h3>User Completed:</h3>
          {userStats.map((user, idx) => (
            <StatsRow
              key={user.email}
              analysisTime={
                user.timedPlots > 0 ? (user.seconds / user.timedPlots / 1.0).toFixed(2) : 0
              }
              plots={user.analyzed + user.flagged}
              title={
                isProjectAdmin || user.email === userName
                  ? `${idx + 1}. ${user.email}`
                  : `User ${idx + 1}`
              }
            />
          ))}
          <StatsRow
            analysisTime={
              userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                ? (
                  userStats.reduce((p, c) => p + c.seconds, 0) /
                    userStats.reduce((p, c) => p + c.timedPlots, 0) /
                    1.0
                ).toFixed(2)
                : 0
            }
            plots={analyzedPlots}
            title="Total"
          />
        </div>
      )}
    </>
  );
}

function ProjectAOI() {
  return (
    <div className="d-flex flex-column h-100">
      <h2 className="header px-0">Project AOI</h2>
      <div id="project-map" style={{ flex: 1 }} />
    </div>
  );
}

const Tabs = ({ children, activeTab, setActiveTab }) => {
  return (
    <>
      <div className="d-flex flex-column h-100 fixed-width">
        <h2 className="header px-0">QAQC Information</h2>
        <div>
          <div className="tab-buttons">
            {React.Children.map(children, (child, index) => (
              <button
                key={index}
                className={activeTab === index ? 'active' : ''}
                onClick={() => setActiveTab(index)}
              >
                {child.props.label}
              </button>
            ))}
          </div>
          <div className="tab-content fixed-width-content">
            {React.Children.map(children, (child, index) => (
              <div
                key={index}
                style={{ display: activeTab === index ? 'block' : 'none' }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const Tab = ({ label, children }) => {
  return <div>{children}</div>;
};

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <ProjectDashboard projectId={params.projectId || "0"} userName={session.userName} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
