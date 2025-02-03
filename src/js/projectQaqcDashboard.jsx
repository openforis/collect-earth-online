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
         userStatsColumns,
         plotStatsColumns } from "./tableData";

import { mercator } from "./utils/mercator";

class ProjectDashboardQaqc extends React.Component {
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
    this.setProjectStats = this.setProjectStats.bind(this);
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

  setProjectStats = (stats) =>  {
    this.setState({ projectStats: stats, plotId: stats.plots[0].plot_id });
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
                           setProjectStats={this.setProjectStats}
                           projectId={this.props.projectId}
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
                  projectPlots={this.state.projectStats.plots}
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
                  plots={this.state.projectStats.plots}
                  projectId={this.props.projectId}
                />
              </div>
            </Tab>
          </QaqcInformation>
        </div>
      </div>
    );
  }
}

function ProjectStats({ projectDetails, stats }) {
  const [plots, setPlots] = useState(stats.plots || []);

  useEffect(() => {
    setPlots(stats.plots || []);
  }, [stats.plots]);

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
        {stats.totalPlots > 0 && (
          <div className="p-1" id="project-stats">
            <div className="mb-4">
              <h3>Project Dates:</h3>
              <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
                {renderDate("Created", projectDetails.createdDate || "Unknown")}
                {renderDate("Published", projectDetails.publishedDate || "N/A")}
                {renderDate("Closed", projectDetails.closedDate || "N/A")}
              </div>
            </div>
            <div className="mb-2">
              <h3>Project Stats:</h3>
              <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
                {renderStat("Total Plots", stats.totalPlots)}
                {stats.plotAssignments > 0 && renderStat("Plot Assignments", stats.plotAssignments)}
                {stats.plotAssignments > 0 && renderStat("Users Assigned", stats.usersAssigned)}
                {renderStat("Flagged", stats.flaggedPlots)}
                {renderStat("Analyzed", stats.analyzedPlots)}
                {stats.plotAssignments > 0 && renderStat("Partial Plots", stats.partialPlots)}
                {renderStat("Unanalyzed", stats.unanalyzedPlots)}
                {renderStat("Average Confidence", `${stats.averageConfidence} %`)}
                {renderStat("Max Confidence", `${stats.maxConfidence} %`)}
                {renderStat("Min Confidence", `${stats.minConfidence} %`)}
              </div>
            </div>
          </div>
        )}
      </div>
      <br />
      Project Plots:
      <br />
      <div style={{ maxHeight: "800px", overflowY: "auto", minHeight: "800px" }}>
        <DataTable
          columns={projectStatsColumns}
          data={plots}
          fixedHeader={true}
          fixedHeaderScrollHeight={"200px"}
          conditionalRowStyles={plotConditionalRowStyles}
          customStyles={customStyles}
          pagination
        />
      </div>
    </>
  );
}

const PlotStats = ({ projectId, plotId, activeTab, setPlotInfo, showProjectMap, projectPlots, plotInfo }) => {
  const [newPlotId, setNewPlotId] = useState(plotId);
  const [inputPlotId, setInputPlotId] = useState(plotId);
  const [plots, setPlots] = useState(projectPlots);

  useEffect(() => {
    console.log(activeTab);
    if(activeTab === 1) {
      getPlotData(-10000000, "next");
      setNewPlotId(plotId);
      setInputPlotId(plotId);
    }
  }, [activeTab]);

  useEffect(() => {
    setPlots(projectPlots);
  }, [projectPlots]);
  
  const plotOverview =  plots?.find((plot) => plot.plot_id === newPlotId);
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
            getPlotData(inputPlotId, "id");
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

  const setTableData = () => {
    return samplesInfo?.map(sample => {
      const samplesDisagreements = plotOverview.details.usersPlotInfo?.find(
        (up) => up.visible_id === sample.visibleId && up.user_id === sample.userId
      );
      return samplesDisagreements?.disagreements
        ? {
          ...sample,
          disagreement: samplesDisagreements.disagreements.some(obj => 
            Object.values(obj).some(value => value !== 0)
          ),
          answers: JSON.stringify(samplesDisagreements.saved_answers),
        }
      : sample;
    })
  }
  return (
    <>
      <div className="d-flex flex-column">
        <br/>
        <h3> Plot Navigation</h3>
        {navButtons()}
        <div className="mb-2">
          <h3>Plot Stats:</h3>
          <div style={{ display: "flex", flexWrap: "wrap", padding: "0 .5rem" }}>
            {renderStat("Total Samples", 2)}
            {renderStat("Flagged", plotOverview?.num_flags)}
            {renderStat("Average Confidence", `${plotOverview?.avg_confidence} %`)}
            {renderStat("Max Confidence", `${plotOverview?.max_confidence} %`)}
            {renderStat("Min Confidence", `${plotOverview?.min_confidence} %`)}
            {renderStat("Disagreement", `${(plotOverview?.disagreement ?? 0).toFixed(2)} %`)}
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
            data={setTableData()}
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


const UserStats = ({ userStats, analyzedPlots, isProjectAdmin, userName, plots, projectId }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  const calculateUserDisagreement = () => {
    const userDisagreement = {};
    plots.forEach((plot) => {
      const usersInfo = plot.details?.usersPlotInfo || [];
      
      usersInfo.forEach((userInfo) => {
        const userId = userInfo.user_id;
        const disagreements = userInfo.disagreements || [];
        
        const totalAnswers = disagreements.length;
        if (totalAnswers === 0) return;  // Avoid division by zero
        
      const disagreeCount = disagreements.reduce((count, disagreement) => {
        return count + (Object.values(disagreement).some(value => value !== 0) ? 1 : 0);
      }, 0);
        
        if (!userDisagreement[userId]) {
          userDisagreement[userId] = { disagreeCount: 0, totalAnswers: 0 };
        }
        
        userDisagreement[userId].disagreeCount += disagreeCount;
        userDisagreement[userId].totalAnswers += totalAnswers;
      });
    });
    
    const result = {};
    for (const userId in userDisagreement) {
      const { disagreeCount, totalAnswers } = userDisagreement[userId];
      result[userId] = ((disagreeCount / totalAnswers) * 100).toFixed(2);
    }
    
    return result;
  }

  const handleSelectedChange = ({ selectedRows }) => {
    console.log(selectedRows);
    setSelectedUsers(selectedUsers);
  }

  const mergedUserStats = () => {
    const disagreement = calculateUserDisagreement();
    return userStats?.map(user => {
      const analysisTime = user.timedPlots > 0 ? (user.seconds / user.timedPlots / 1.0).toFixed(1) : 0;
      return {
        ...user,
        disagreement: parseFloat((disagreement[user.user_id] || "0.00")),
        analysisTime: (analysisTime >= 60) ? `${(analysisTime / 60).toFixed(2)} mins/plot` : `${analysisTime} secs/plot`
      }
    });
  }

  const disableUsers = async () => {
    try {
      const response = await fetch(`/disable-users?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to disable users: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error disabling users:', error);
      alert('An error occurred while disabling users.');
    }
  }
  
  return (
    <>
      {userStats && (
        <div className="d-flex flex-column"
             style ={{ maxHeight: "1000px", overflowY: "auto", overflowX: "hidden"}}>
          <br/>
          <h3>Users Information</h3>
          <div style={{ maxHeight: "800px", minHeight: "500px"}}>
          <DataTable
	    columns={userStatsColumns}
            data={mergedUserStats()}
	    fixedHeader={true}
	    fixedHeaderScrollHeight={'200px'}
            customStyles={customStyles}
            selectableRows
            onSelectedRowsChange={handleSelectedChange}
            pagination
          />
          </div>
          <hr/>
          <div className="row mb-3 ml-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="disable-button"
              style={{ height: "38px" }}
              onClick={() => disableUsers()}
            >
              Ignore Selected Users
            </button>
            <button
              className="enable-button"
              style={{ height: "38px" }}
              onClick={() => null}
            >
              Accept Selected Users
            </button>
              </div>
          </div>
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

const RenderFileInput = ({ projectId, setProjectStats }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  useEffect(() => {
    if (!file) {
      setError('No file selected');
      return;
    }
    try {
      const result = handleJsonFileUpload(file);
      setProjectStats(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [file]);

  
  const handleJsonFileUpload = async (file) => {
    if (!file || file.type !== 'application/json') {
      throw new Error('Please select a valid JSON file');
    }
    const fileContent = await file.text();

    let jsonContent;
    try {
      jsonContent = {"sotFileJson": JSON.parse(fileContent)};
    } catch (e) {
      throw new Error('Invalid JSON file');
    }
    const response = await fetch(`/sot-disagreement?projectId=${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonContent),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };
  
  const downloadFile = async () => {
    try {
      const response = await fetch(`/sot-example?projectId=${projectId}`);
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
          Upload file
          <input
            accept={"application/json"}
            defaultValue=""
            id="source-of-truth-file"
            onChange={handleFileChange}
            style={{ display: "block" }}
            type="file"
          />
        </label>
        <label className="ml-3 text-nowrap">File: {file ? file.name : 'No file selected'}</label>
        
        <div
          style={{
            margin: "0 20px",
            borderLeft: "1px solid #ccc",
            height: "40px",
          }}
        ></div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
        <a href="#" onClick={downloadFile}>
          Download example source of truth file
        </a>
      </div>
    </div>
  );
}

const QaqcInformation = ({ children, activeTab, setActiveTab, setProjectStats, projectId }) => {
  return (
    <>
      <div className="d-flex flex-column h-100 fixed-width">
        <h2 className="header px-0">QAQC Information</h2>
        <RenderFileInput
          projectId={projectId}
          setProjectStats={setProjectStats}/>
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
      <ProjectDashboardQaqc projectId={params.projectId || "0"} userName={session.userName} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
