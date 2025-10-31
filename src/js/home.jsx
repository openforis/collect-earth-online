import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import { mercator } from "./utils/mercator";
import { sortAlphabetically } from "./utils/generalUtils";
import SvgIcon from "./components/svg/SvgIcon";
import Modal from "./components/Modal";
import { Sidebar, SidebarCard } from "./components/Sidebar";

import { useAtom, useAtomValue } from'jotai';
import { stateAtom } from './utils/constants';


export const InstitutionSidebar = ({
  institutions = [],
  projects = [],
  userInstitutions = [],
  userId,
  userRole,
  stateAtom
}) => {
  const [activeTab, setActiveTab] = useState("affiliations");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("institution");
  const [showEmpty, setShowEmpty] = useState(false);
  const [matchBeginning, setMatchBeginning] = useState(false);
  const [sortType, setSortType] = useState("projects");

  const otherInstitutions = useMemo(() => {
    const affiliatedIds = new Set(userInstitutions.map((u) => u.id));
    return institutions.filter((i) => !affiliatedIds.has(i.id));
  }, [institutions, userInstitutions]);

  const projectsByInstitution = useMemo(() => {
    const map = {};
    for (const p of projects) {
      if (!map[p.institutionId]) map[p.institutionId] = [];
      map[p.institutionId].push(p);
    }
    return map;
  }, [projects]);

  const visibleInstitutions = useMemo(() => {
    const list = activeTab === "affiliations" ? userInstitutions : otherInstitutions;
    return list.filter((inst) => {
      const matchFn = matchBeginning
        ? inst.name.toLowerCase().startsWith(search.toLowerCase())
        : inst.name.toLowerCase().includes(search.toLowerCase());
      const hasProjects = (projectsByInstitution[inst.id] || []).length > 0;
      if (!showEmpty && !hasProjects) return false;
      return matchFn;
    });
  }, [activeTab, userInstitutions, otherInstitutions, search, matchBeginning, showEmpty, projectsByInstitution]);

  return (
    <Sidebar header={null} stateAtom={stateAtom} footer={null} style={{ left: 0, width: "18vw" }}>
      <SidebarCard title="FILTERS">
        <div className="filter-section">
          <input
            className="form-control search-input"
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          <div className="filter-row" style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 14, marginLeft: 4 }}>
              <input
                type="radio"
                name="filterType"
                value="institution"
                checked={filterType === "institution"}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ marginRight: 4 }}
              />
              Institution
            </label>
            <label>
              <input
                type="radio"
                name="filterType"
                value="project"
                checked={filterType === "project"}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ marginRight: 4 }}
              />
              Project
            </label>
          </div>

          <div className="filter-row" style={{ marginBottom: 12 }}>
            <label style={{ marginRight: 18 }}>
              <input
                type="checkbox"
                checked={matchBeginning}
                onChange={() => setMatchBeginning(!matchBeginning)}
                style={{ marginRight: 4 }}
              />
              Match from Beginning
            </label>
            <label>
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={() => setShowEmpty(!showEmpty)}
                style={{ marginRight: 4 }}
              />
              Show Empty Institutions
            </label>
          </div>

          <div className="filter-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="sort-dropdown" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontWeight: "500" }}>Sort by:</label>
              <select
                className="form-control form-control-sm"
                onChange={(e) => setSortType(e.target.value)}
                value={sortType}
                style={{ flexGrow: 1 }}
              >
                <option value="projects">Number of Projects</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            <a
              className="create-institution btn btn-md"
              href="/create-institution"
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
                background: "#3D7F7A",
                color: "#FFFFFF"
              }}
            > Add New Institution </a>
          </div>

          <div
            className="tab-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #ddd",
              marginTop: 16,
            }}
          >
            <button
              onClick={() => setActiveTab("affiliations")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "8px 0",
                fontWeight: 600,
                color: activeTab === "affiliations" ? "#1b5e20" : "#666",
                borderBottom: activeTab === "affiliations" ? "3px solid #1b5e20" : "3px solid transparent",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
              }}
            >
              Your Affiliations ({userInstitutions.length})
            </button>
            <button
              onClick={() => setActiveTab("others")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                padding: "8px 0",
                fontWeight: 600,
                color: activeTab === "others" ? "#1b5e20" : "#666",
                borderBottom: activeTab === "others" ? "3px solid #1b5e20" : "3px solid transparent",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
              }}
            >
              Other Institutions ({otherInstitutions.length})
            </button>
          </div>
        </div>
      </SidebarCard>

      {visibleInstitutions.map((inst) => {
        const instProjects = projectsByInstitution[inst.id] || [];
        return (
          <SidebarCard key={inst.id} title={inst.name} collapsible defaultOpen={false}>
            <div
              className="institution-project-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "10px 14px 14px 14px",
                background: "#f8faf9",
                borderRadius: "0 0 6px 6px",
              }}
            >
              <div
                key={inst.id}
                className="project-item"
                style={{
                  padding: "10px 12px",
                  border: "1px solid #dfe4e1",
                  borderRadius: "6px",
                  background: "#3D7F7A",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
                onClick={() => (window.location.href = `/review-institution?institutionId=${inst.id}`)}
              >
                Visit Institution
              </div>
              {instProjects.map((project) => (
                <div
                  key={project.id}
                  className="project-item"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #dfe4e1",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "#2f3e2f",
                    transition: "background 0.15s ease",
                  }}
                onClick={() => (window.location.href = `/review-project?projectId=${project.id}&institutionId=${inst.id}`)}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f3")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {project.name}
                </div>
              ))}
            </div>
          </SidebarCard>
        );
      })}
    </Sidebar>
  );
};

function Home ({ userRole, userId }) {
  const [appState, setAppState] = useAtom(stateAtom);  
  
  function getProjects () {
    fetch("/get-home-projects")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          setAppState(prev => ({ ... prev,  projects: data }));
          return Promise.resolve();
        } else {
          return Promise.reject("No projects found");
        }
      });}

  function getImagery () {
    fetch("/get-public-imagery")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {          
          setAppState(prev => ({ ... prev, imagery: data }));          
          return Promise.resolve();
        } else {
          return Promise.reject("No imagery found");
        }
      });}
  
  function getInstitutions () {
    fetch("/get-all-institutions")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          const userInstitutions =
                userRole !== "admin"
                ? data.filter((institution) => institution.isMember)
                : [];
          const institutions =
                userInstitutions.length > 0
                ? data.filter((institution) => !userInstitutions.includes(institution))
                : data;
          setAppState(prev => ({ ...prev,
            institutions,
            userInstitutions,
          }));
          return Promise.resolve();
        } else {
          return Promise.reject("No institutions found");
        }
      });
  }
  function toggleSidebar (mapConfig) {
    setAppState(prev => ({ ... prev, showSidePanel: !prev.showSidePanel }), () => mercator.resize(mapConfig));}
  
  useEffect(()=>{
    Promise.all([getImagery(), getInstitutions(), getProjects()])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);
  
  return (
    <div id="bcontainer">
      <span id="mobilespan" />
      <div className="Wrapper">
        <div className="row tog-effect"
             style={{flexWrap: 'nowrap'}}>
          <InstitutionSidebar
            institutions={appState.institutions}
            projects={appState.projects}
            userId={userId}
            userInstitutions={appState.userInstitutions}
            userRole={userRole}
            stateAtom={stateAtom}
          />
          <MapPanel
            imagery={appState.imagery}
            projects={appState.projects}
            showSidePanel={appState.showSidePanel}
            toggleSidebar={toggleSidebar}
          />
        </div>
      </div>     
      {appState.modal?.alert &&
       <Modal title={appState.modal.alert.alertType}
              onClose={()=>{setAppState({ ... appState, modal: null});}}>
         {appState.modal.alert.alertMessage}
       </Modal>}
      {appState.modalMessage && <LoadingModal message={appState.modalMessage} />}
    </div>
  );
}

class MapPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mapConfig: null,
      clusterExtent: [],
      clickedFeatures: [],
      modal: null,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.mapConfig === null &&
        this.props.imagery.length > 0 &&
        prevProps.imagery.length === 0
    ) {
      this.initializeMap();
    }

    if (
      this.state.mapConfig &&
        this.props.projects.length > 0 &&
        (!prevState.mapConfig || prevProps.projects.length === 0)
    ) {
      this.addProjectMarkers(this.state.mapConfig, this.props.projects, 40); // clusterDistance = 40, use null to disable clustering
    }
  }

  initializeMap = () => {
    const homePageLayer =
          this.props.imagery.find((imagery) => imagery.title === "Mapbox Satellite w/ Labels") ||
          this.props.imagery[0];
    const mapConfig = mercator.createMap("home-map-pane", [70, 15], 2.1, [homePageLayer]);
    mercator.setVisibleLayer(mapConfig, homePageLayer.id);
    this.setState({ mapConfig });
  };

  addProjectMarkers(mapConfig, projects, clusterDistance) {
    const projectSource = mercator.projectsToVectorSource(
      projects.filter((project) => project.centroid)
    );
    if (clusterDistance == null) {
      mercator.addVectorLayer(
        mapConfig,
        "projectMarkers",
        projectSource,
        mercator.ceoMapStyles("cluster", 0)
      );
    } else {
      mercator.addVectorLayer(
        mapConfig,
        "projectMarkers",
        mercator.makeClusterSource(projectSource, clusterDistance),
        (feature) => mercator.ceoMapStyles("cluster", feature.get("features").length)
      );
    }
    mercator.addOverlay(mapConfig, "projectPopup", document.getElementById("projectPopUp"));
    const overlay = mercator.getOverlayByTitle(mapConfig, "projectPopup");
    mapConfig.map.on("click", (event) => {
      if (mapConfig.map.hasFeatureAtPixel(event.pixel)) {
        const clickedFeatures = [];
        mapConfig.map.forEachFeatureAtPixel(event.pixel, (feature) =>
          clickedFeatures.push(feature)
        );
        this.showProjectPopup(overlay, clickedFeatures[0]);
      } else {
        overlay.setPosition(undefined);
      }
    });
  }

  showProjectPopup(overlay, feature) {
    if (mercator.isCluster(feature)) {
      overlay.setPosition(feature.get("features")[0].getGeometry().getCoordinates());
      this.setState({
        clusterExtent: mercator.getClusterExtent(feature),
        clickedFeatures: feature.get("features"),
      });
    } else {
      overlay.setPosition(feature.getGeometry().getCoordinates());
      this.setState({
        clusterExtent: [],
        clickedFeatures: feature.get("features"),
      });
    }
  }

  render() {
    return (
      <div
        className="full-height full-width"
        id="mapPanel"
      >
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
        {this.props.showSidePanel == null ?
         (<div
            className='bg-lightgray hide-toggle'
            id="toggle-map-button"
            onClick={() => this.props.toggleSidebar(this.state.mapConfig)}
          ><SvgIcon icon="rightDouble" size="1.25rem" /></div>) :
         (<div
            className={'bg-lightgray ' +
                       (this.props.showSidePanel 
                        ? 'slide-toggle-in'
                        : 'slide-toggle-out')}
          id="toggle-map-button"
          onClick={() => this.props.toggleSidebar(this.state.mapConfig)}
        >
          {this.props.showSidePanel ? (
            <SvgIcon icon="leftDouble" size="1.25rem" />
          ) : (
            <SvgIcon icon="rightDouble" size="1.25rem" />
          )}
        </div>)}
        <div className="full-height full-width" id="home-map-pane" style={{ maxWidth: "inherit" }} />
        <ProjectPopup
          clusterExtent={this.state.clusterExtent}
          features={this.state.clickedFeatures}
          mapConfig={this.state.mapConfig}
        />
      </div>
    );
  }
}

class ProjectPopup extends React.Component {
  componentDidMount() {
    // There is some kind of bug in attaching this onClick handler directly to its button in render().
    document.getElementById("zoomToCluster").onclick = () => {
      mercator.zoomMapToExtent(this.props.mapConfig, this.props.clusterExtent, 128);
      mercator.getOverlayByTitle(this.props.mapConfig, "projectPopup").setPosition(undefined);
    };
  }

  render() {
    return (
      <div className="d-flex flex-column" id="projectPopUp" style={{ maxHeight: "40vh" }}>
        <div className="cTitle">
          <h1>{this.props.features.length > 1 ? "Cluster info" : "Project info"}</h1>
        </div>
        <div className="cContent" style={{ padding: "10px", overflow: "auto" }}>
          <table className="table table-sm" style={{ tableLayout: "fixed" }}>
            <tbody>
              {this.props.features.map((feature) => (
                <React.Fragment key={feature.get("projectId")}>
                  <tr className="d-flex" style={{ borderTop: "1px solid gray" }}>
                    <td className="small col-6 px-0 my-auto">Name</td>
                    <td className="small col-6 pr-0">
                      <a
                        className="btn btn-sm btn-block btn-outline-lightgreen"
                        href={`/collection?projectId=${feature.get("projectId")}&institutionId=${feature.get("institutionId")}`}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {feature.get("name")}
                      </a>
                    </td>
                  </tr>
                  <tr className="d-flex">
                    <td className="small col-6 px-0 my-auto">Description</td>
                    <td className="small col-6 pr-0" style={{ wordBreak: "break-all" }}>
                      {feature.get("description")}
                    </td>
                  </tr>
                  <tr className="d-flex" style={{ borderBottom: "1px solid gray" }}>
                    <td className="small col-6 px-0 my-auto">Number of plots</td>
                    <td className="small col-6 pr-0">{feature.get("numPlots")}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="mt-0 mb-0 btn btn-sm btn-block btn-outline-yellow"
          id="zoomToCluster"
          style={{
            alignItems: "center",
            cursor: "pointer",
            justifyContent: "center",
            minWidth: "350px",
            display: this.props.features.length > 1 ? "flex" : "none",
          }}
          type="button"
        >
          <SvgIcon icon="zoomIn" size="1rem" />
          <span style={{ marginLeft: "0.4rem" }}>Zoom to cluster</span>
        </button>
      </div>
    );
  }
}


export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>      
      <Home userId={session.userId || -1} userRole={session.userRole || ""} />
    </NavigationBar>,
    
    document.getElementById("app")
  );
}
