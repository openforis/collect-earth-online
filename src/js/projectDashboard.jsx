import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import { StatsCell, StatsRow } from "./components/FormComponents";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import DataTable from "react-data-table-component";
import SvgIcon from "./components/svg/SvgIcon";
import { projectConditionalRowStyles,
         plotConditionalRowStyles,
         customStyles,
         projectStatsColumns,
         plotStatsColumns } from "./tableData";

import { mercator } from "./utils/mercator";

class ProjectDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projectDetails: {},
      projectStats: {},
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
        this.setState({ projectStats: data, plotId: data.plots[0].plot_id });
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
    const { aoiFeatures, plotSize, plotShape } = this.state.projectDetails;
    const mapConfig = this.state.mapConfig;
    const samples = this.state.plotInfo.samples;
    if(activeTab === 1 && samples) {
      mercator.removeLayerById(mapConfig, "currentAOI");
      mercator.removeLayerById(mapConfig, "currentPlot");
      mercator.removeLayerById(mapConfig, "currentSamples");
      mercator.addVectorLayer(
        mapConfig,
        "currentPlot",
        mercator.geometryToVectorSource(
          this.state.plotInfo?.plotGeom?.includes("Point")
            ? mercator.getPlotPolygon(
              this.state.plotInfo.plotGeom,
              plotSize,
              plotShape
            )
            : mercator.parseGeoJson(this.state.plotInfo.plotGeom, true)
        ),
        mercator.ceoMapStyles("geom", "yellow")
      );
      mercator.zoomMapToLayer(mapConfig, "currentPlot", 36);
      mercator.addVectorLayer(
        mapConfig,
        "currentSamples",
        mercator.samplesToVectorSource(samples),
        mercator.ceoMapStyles("geom", "red")
      );

    } else {
      mercator.removeLayerById(mapConfig, "currentPlot");
      mercator.removeLayerById(mapConfig, "currentSamples");
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
    this.showProjectMap(index);
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
          <QaqcInformation className="col-6"
                activeTab={this.state.activeTab}
                setActiveTab={this.setActiveTab}>
            <Tab label="Project Statistics">
              <div className="bg-lightgray col-12 project-stats">
                <ProjectStats
                  availability={this.state.projectDetails.availability}
                  isProjectAdmin={this.state.projectDetails.isProjectAdmin}
                  projectDetails={this.state.projectDetails}
                  stats={this.state.projectStats}
                  userName={this.props.userName}
                />
              </div>
            </Tab>
            <Tab label="Plot Statistics">
              <div className="bg-lightgray col-12">
                <PlotStats
                  projectId={this.props.projectId}
                  plotId={this.state.plotId || this.state.projectStats.plots[0]?.plot_id}
                  setPlotInfo={this.setPlotInfo}
                  showProjectMap={this.showProjectMap}
                  plots={this.state.projectStats.plots}
                  plotInfo={this.state.plotInfo}
                  activeTab={this.state.activeTab}
                />
              </div>
            </Tab>
            <Tab label="User Statistics">
              <div className="bg-lightgray col-12">
                <UserStats
                  userStats={this.state.projectStats.userStats}
                  analyzedPlots={this.state.projectStats.analyzedPlots}
                  isProjectAdmin={this.state.projectDetails.isProjectAdmin}
                  userName={this.props.userName}
                />
              </div>
            </Tab>
          </QaqcInformation>
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
      plots,
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
    <>
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
      <br/>
      Project Plots:
      <br/>
      <div style={{ maxHeight: '800px', overflowY: 'auto', minHeight: '800px' }}>
        <DataTable
	  columns={projectStatsColumns}
	  data={plots}
	  fixedHeader={true}
	  fixedHeaderScrollHeight={'200px'}
          conditionalRowStyles={projectConditionalRowStyles}
          customStyles={customStyles}
          pagination
        />
      </div>
    </>
  );
}

const PlotStats = ({ projectId, plotId, activeTab, setPlotInfo, showProjectMap, plots, plotInfo }) => {
  const [newPlotId, setNewPlotId] = useState(plotId);
  const [inputPlotId, setInputPlotId] = useState(plotId);

  useEffect(() => {
    console.log(activeTab);
    if(activeTab === 1) {
      getPlotData(-10000000, "next");
    }
  }, [activeTab]);
  
  const plotOverview = plots?.filter((plot) => plot.plot_id === newPlotId)[0];
  const samplesInfo = plotInfo?.samples?.map((sample) => ({ ...sample, id: `${sample.visibleId}_${sample.userId}`}));

  const renderStat = (title, stat) => (
    <span style={{ width: "50%" }}>
      <StatsCell title={title}>{stat}</StatsCell>
    </span>
  );

  const getPlotData = (visibleId, direction) => {
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
        setInputPlotId(data.visibleId);
        setNewPlotId(data.visibleId);
        if (activeTab === 1) {
          showProjectMap(activeTab);
        }
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
        onChange={(e) => setInputPlotId(e.target.value)}
        type="number"
        value={inputPlotId}
      />
      <button
        className="btn btn-outline-lightgreen btn-sm"
        onClick={() => {
          if (!isNaN(inputPlotId)) {
            setNewPlotId(inputPlotId); // Update newPlotId when the button is clicked
            getPlotData(inputPlotId, "id"); // Fetch data with the new value
          } else {
            alert("Please enter a number to go to plot.");
          }
        }}
        type="button"
      >
        Go to plot
      </button>
    </div>
  );

  const disagreement = (sampleDisagreement) => {
    if(sampleDisagreement) {
      const allValues = Object.values(sampleDisagreement)
            .map(Object.values)
            .flat();
      const total = allValues.reduce((sum, value) => sum + value, 0);
      const count = allValues.length;
      return (total / count).toFixed(2);
    } else {
      return 0;
    }
  }

  return (
    <>
      <div className="d-flex flex-column">
        <h3> Plot Navigation: </h3>
        {navButtons()}
        <div className="mb-2">
          <h3>Plot Stats:</h3>
          <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
            {renderStat("Total Samples", 2)}
            {renderStat("Flagged", plotOverview?.num_flags)}
            {renderStat("Average Confidence", `${plotOverview?.avg_confidence} %`)}
            {renderStat("Max Confidence", `${plotOverview?.avg_confidence} %`)}
            {renderStat("Min Confidence", `${plotOverview?.avg_confidence} %`)}
            {renderStat("Disagreement", `${disagreement(plotOverview?.details?.samplesDisagreements)}`)}
          </div>
        </div>
      </div>
      <br/>
      Project Plots:
      <br/>
      <div style={{ maxHeight: '800px', overflowY: 'auto', minHeight: '800px' }}>
        {(Object.keys(plotInfo).length !== 0) && (
          <DataTable
	    columns={plotStatsColumns}
	    data={samplesInfo.map(sample => {
              const visibleId = sample.visibleId.toString();
              const samplesDisagreements = plotOverview?.details.samplesDisagreements;
              return samplesDisagreements[visibleId]
                ? { ...sample, disagreement: Object.values(samplesDisagreements[visibleId]).some((i) => i !== 0)}
              : sample;
            })}
	    fixedHeader={true}
	    fixedHeaderScrollHeight={'200px'}
            conditionalRowStyles={plotConditionalRowStyles}
            customStyles={customStyles}
            pagination
          />
        )}
      </div>     
    </>
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

const RenderFileInput = () => {
  const downloadFile = async () => {
    try {
      const response = await fetch("/sot-example");
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "example-source-of-truth.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };
  return (
    <div className="mb-3">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <label
          className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
          htmlFor="source-of-truth-file"
          id="custom-upload"
          style={{ display: "flex", alignItems: "center", width: "fit-content" }}
        >
          Upload plot file
          <input
            accept={"application/json"}
            defaultValue=""
            id="source-of-truth-file"
            onChange={(e) => null}
            style={{ display: "block" }}
            type="file"
          />
        </label>
        <label className="ml-3 text-nowrap">File:{" "}</label>
        
        <div
          style={{
            margin: "0 20px",
            borderLeft: "1px solid #ccc",
            height: "40px",
          }}
        ></div>
        
        <div style={{ display: "flex", alignItems: "center" }}>
          <p style={{ margin: 0, marginRight: "10px" }}>Calculate disagreement using:</p>
          
          <label style={{ marginRight: "10px" }}>
            <input
              type="radio"
              name="disagreement"
              value="option1"
              style={{ verticalAlign: "middle" }}
              checked
            />{" "}
            Peer comparison
          </label>
          <label>
            <input
              type="radio"
              name="disagreement"
              value="option2"
              style={{ verticalAlign: "middle" }}
            />{" "}
            Source of Truth
          </label>
        </div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
        <a href="#" onClick={downloadFile}>
          Download example source of truth file
        </a>
      </div>
    </div>
  );
}

const QaqcInformation = ({ children, activeTab, setActiveTab }) => {
  return (
    <>
      <div className="d-flex flex-column h-100 fixed-width">
        <h2 className="header px-0">QAQC Information</h2>
        <RenderFileInput/>
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
