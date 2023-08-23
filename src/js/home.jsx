import React from "react";
import ReactDOM from "react-dom";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import { mercator } from "./utils/mercator";
import { sortAlphabetically } from "./utils/generalUtils";
import SvgIcon from "./components/svg/SvgIcon";

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projects: [],
      imagery: [],
      institutions: [],
      showSidePanel: true,
      userInstitutions: [],
      modalMessage: "Loading institutions",
    };
  }

  componentDidMount() {
    Promise.all([this.getImagery(), this.getInstitutions(), this.getProjects()])
      .catch((response) => {
        console.log(response);
        alert("Error retrieving the collection data. See console for details.");
      })
      .finally(() => this.setState({ modalMessage: null }));
  }

  getProjects = () =>
    fetch("/get-home-projects")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          this.setState({ projects: data });
          return Promise.resolve();
        } else {
          return Promise.reject("No projects found");
        }
      });

  getImagery = () =>
    fetch("/get-public-imagery")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          this.setState({ imagery: data });
          return Promise.resolve();
        } else {
          return Promise.reject("No imagery found");
        }
      });

  getInstitutions = () =>
    fetch("/get-all-institutions")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          const userInstitutions =
            this.props.userRole !== "admin"
              ? data.filter((institution) => institution.isMember)
              : [];
          const institutions =
            userInstitutions.length > 0
              ? data.filter((institution) => !userInstitutions.includes(institution))
              : data;
          this.setState({
            institutions,
            userInstitutions,
          });
          return Promise.resolve();
        } else {
          return Promise.reject("No institutions found");
        }
      });

  toggleSidebar = (mapConfig) =>
    this.setState({ showSidePanel: !this.state.showSidePanel }, () => mercator.resize(mapConfig));

  render() {
    return (
      <div id="bcontainer">
        <span id="mobilespan" />
        <div className="Wrapper">
          <div className="row tog-effect">
            <SideBar
              institutions={this.state.institutions}
              projects={this.state.projects}
              showSidePanel={this.state.showSidePanel}
              userId={this.props.userId}
              userInstitutions={this.state.userInstitutions}
              userRole={this.props.userRole}
            />
            <MapPanel
              imagery={this.state.imagery}
              projects={this.state.projects}
              showSidePanel={this.state.showSidePanel}
              toggleSidebar={this.toggleSidebar}
            />
          </div>
        </div>
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
      </div>
    );
  }
}

class MapPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mapConfig: null,
      clusterExtent: [],
      clickedFeatures: [],
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
        className={
          this.props.showSidePanel
            ? "col-lg-9 col-md-12 pl-0 full-height"
            : "col-lg-9 col-md-12 pl-0 col-xl-12 col-xl-9 full-height"
        }
        id="mapPanel"
      >
        <div
          className="bg-lightgray"
          id="toggle-map-button"
          onClick={() => this.props.toggleSidebar(this.state.mapConfig)}
        >
          {this.props.showSidePanel ? (
            <SvgIcon icon="leftDouble" size="1.25rem" />
          ) : (
            <SvgIcon icon="rightDouble" size="1.25rem" />
          )}
        </div>
        <div className="full-height" id="home-map-pane" style={{ maxWidth: "inherit" }} />
        <ProjectPopup
          clusterExtent={this.state.clusterExtent}
          features={this.state.clickedFeatures}
          mapConfig={this.state.mapConfig}
        />
      </div>
    );
  }
}

class SideBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filterText: "",
      filterInstitution: true,
      useFirstLetter: false,
      sortByNumber: true,
      showEmptyInstitutions: false,
      showFilters: false,
    };
  }

  toggleShowFilters = () => this.setState({ showFilters: !this.state.showFilters });

  toggleFilterInstitution = () =>
    this.setState({ filterInstitution: !this.state.filterInstitution });

  toggleShowEmptyInstitutions = () =>
    this.setState({
      showEmptyInstitutions: !this.state.showEmptyInstitutions,
    });

  toggleSortByNumber = () => this.setState({ sortByNumber: !this.state.sortByNumber });

  toggleUseFirst = () => this.setState({ useFirstLetter: !this.state.useFirstLetter });

  updateFilterText = (newText) => this.setState({ filterText: newText });

  render() {
    return (
      this.props.showSidePanel && (
        <div
          className="col-lg-3 pr-0 pl-0 overflow-hidden full-height d-flex flex-column"
          id="lPanel"
        >
          {(this.props.userRole === "admin" || this.props.userId === -1) && (
            <div className="bg-darkgreen">
              <h1 className="tree_label" id="panelTitle">
                Institutions
              </h1>
            </div>
          )}
          {this.props.userId > 0 && <CreateInstitutionButton />}
          <InstitutionFilter
            filterInstitution={this.state.filterInstitution}
            filterText={this.state.filterText}
            showEmptyInstitutions={this.state.showEmptyInstitutions}
            showFilters={this.state.showFilters}
            sortByNumber={this.state.sortByNumber}
            toggleFilterInstitution={this.toggleFilterInstitution}
            toggleShowEmptyInstitutions={this.toggleShowEmptyInstitutions}
            toggleShowFilters={this.toggleShowFilters}
            toggleSortByNumber={this.toggleSortByNumber}
            toggleUseFirst={this.toggleUseFirst}
            updateFilterText={this.updateFilterText}
            useFirstLetter={this.state.useFirstLetter}
          />
          {this.props.userId > 0 && this.props.userRole !== "admin" && (
            <>
              <div className="bg-darkgreen">
                <h2 className="tree_label" id="panelTitle">
                  Your Affiliations
                </h2>
              </div>
              <InstitutionList
                filterInstitution={this.state.filterInstitution}
                filterText={this.state.filterText}
                institutionListType="user"
                institutions={this.props.userInstitutions}
                projects={this.props.projects}
                showEmptyInstitutions={this.state.showEmptyInstitutions}
                sortByNumber={this.state.sortByNumber}
                useFirstLetter={this.state.useFirstLetter}
                userId={this.props.userId}
              />
              <div className="bg-darkgreen">
                <h2 className="tree_label" id="panelTitle">
                  Other Institutions
                </h2>
              </div>
            </>
          )}
          {this.props.institutions.length > 0 && this.props.projects.length > 0 ? (
            <InstitutionList
              filterInstitution={this.state.filterInstitution}
              filterText={this.state.filterText}
              institutionListType="institutions"
              institutions={this.props.institutions}
              projects={this.props.projects}
              showEmptyInstitutions={this.state.showEmptyInstitutions}
              sortByNumber={this.state.sortByNumber}
              useFirstLetter={this.state.useFirstLetter}
              userId={this.props.userId}
            />
          ) : this.props.userInstitutions.length > 0 ? (
            <h3 className="p-3">No unaffiliated institutions found.</h3>
          ) : (
            <h3 className="p-3">Loading data...</h3>
          )}
        </div>
      )
    );
  }
}

function InstitutionList({
  institutions,
  projects,
  filterText,
  filterInstitution,
  useFirstLetter,
  showEmptyInstitutions,
  sortByNumber,
  institutionListType,
}) {
  const filterTextLower = filterText.toLocaleLowerCase();

  const filterString = (str) =>
    filterTextLower.length === 0 ||
    (useFirstLetter
      ? str.toLocaleLowerCase().startsWith(filterTextLower)
      : str.toLocaleLowerCase().includes(filterTextLower));

  const filteredProjects = filterInstitution
    ? projects
    : projects.filter((proj) => filterString(proj.name));

  const filterHasProj = (inst) =>
    inst.projects.length > 0 || showEmptyInstitutions || inst.isMember;

  const filteredInstitutions = institutions
    .map((inst) => ({
      ...inst,
      projects: filteredProjects.filter((proj) => inst.id === proj.institutionId),
    }))
    // Filtering by institution, contains search string and contains projects or user is member
    .filter((inst) => !filterInstitution || (filterHasProj(inst) && filterString(inst.name)))
    // Filtering by projects, and has projects to show
    .filter((inst) => filterInstitution || inst.projects.length > 0)
    .sort((a, b) =>
      sortByNumber ? b.projects.length - a.projects.length : sortAlphabetically(a.name, b.name)
    );

  const userInstStyle = institutionListType === "user" ? { maxHeight: "fit-content" } : {};

  return filteredInstitutions.length > 0 ? (
    <ul
      className="tree"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "3.5rem",
        flex: "1 1 0%",
        ...userInstStyle,
      }}
    >
      {filteredInstitutions.map((institution) => (
        <Institution
          key={institution.id}
          forceInstitutionExpand={!filterInstitution && filterText.length > 0}
          id={institution.id}
          name={institution.name}
          projects={institution.projects}
        />
      ))}
    </ul>
  ) : (
    <h3 className="p-3">
      {filterInstitution
        ? institutionListType === "user"
          ? "No Affiliations Found..."
          : "No Institutions Found..."
        : "No Projects Found..."}
    </h3>
  );
}

function InstitutionFilter(props) {
  return (
    <div className="form-control" id="filter-institution" style={{ height: "fit-content" }}>
      <div style={{ display: "inline-flex", width: "100%" }}>
        <input
          className="form-control"
          onChange={(e) => props.updateFilterText(e.target.value)}
          placeholder="Enter text to filter"
          type="text"
          value={props.filterText}
        />
        <button
          className="btn btn-sm btn-secondary"
          onClick={props.toggleShowFilters}
          title="Show/hide filter settings"
          type="button"
        >
          <SvgIcon icon="settings" size="1.25rem" />
        </button>
      </div>
      {props.showFilters && (
        <>
          <div className="d-inlineflex ml-1">
            <div className="form-check form-check-inline">Filter By:</div>
            <div className="form-check form-check-inline">
              <input
                checked={props.filterInstitution}
                className="form-check-input"
                id="filter-by-word"
                name="filter-institution"
                onChange={props.toggleFilterInstitution}
                type="radio"
              />
              Institution
            </div>
            <div className="form-check form-check-inline">
              <input
                checked={!props.filterInstitution}
                className="form-check-input"
                id="filter-by-letter"
                name="filter-institution"
                onChange={props.toggleFilterInstitution}
                type="radio"
              />
              Project
            </div>
            <div className="form-check form-check-inline">
              <input
                checked={props.useFirstLetter}
                className="form-check-input"
                id="filter-by-first-letter"
                onChange={props.toggleUseFirst}
                type="checkbox"
              />
              Match from beginning
            </div>
          </div>
          <div className="d-inlineflex ml-1">
            <div className="form-check form-check-inline">Sort By:</div>
            <div className="form-check form-check-inline">
              <input
                checked={props.sortByNumber}
                className="form-check-input"
                name="sort-institution"
                onChange={props.toggleSortByNumber}
                type="radio"
              />
              # of Projects
            </div>
            <div className="form-check form-check-inline">
              <input
                checked={!props.sortByNumber}
                className="form-check-input"
                name="sort-institution"
                onChange={props.toggleSortByNumber}
                type="radio"
              />
              A to Z
            </div>
            <div className="form-check form-check-inline">
              <input
                checked={props.showEmptyInstitutions}
                className="form-check-input"
                onChange={props.toggleShowEmptyInstitutions}
                type="checkbox"
              />
              Show Empty Institutions
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CreateInstitutionButton() {
  return (
    <div
      className="text-center p-2"
      style={{
        backgroundColor: "var(--yellow)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <a
        className="create-institution btn btn-lightgreen btn-md"
        href="/create-institution"
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <SvgIcon icon="plus" size="1rem" />
        <span style={{ marginLeft: "0.4rem" }}>Create New Institution</span>
      </a>
    </div>
  );
}

class Institution extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showProjectList: false,
    };
  }

  toggleShowProjectList = () => this.setState({ showProjectList: !this.state.showProjectList });

  render() {
    const { props } = this;
    return (
      <li>
        <div
          className="btn-lightgreen p-2"
          onClick={this.toggleShowProjectList}
          style={{
            alignItems: "center",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            margin: "2px",
          }}
        >
          <div
            style={{
              flex: 0,
              display: "inline-block",
              margin: "0 .5rem 0 .25rem",
              transition: "transform 150ms linear 0s",
              transform:
                (props.forceInstitutionExpand || this.state.showProjectList) && "rotate(90deg)",
            }}
          >
            {props.projects && props.projects.length > 0 && (
              <SvgIcon color="white" icon="rightCaret" size="0.9rem" />
            )}
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "1rem",
              fontWeight: "bold",
              margin: "0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {props.name}
          </div>
          <a
            className="btn btn-sm visit-btn"
            href={`/review-institution?institutionId=${props.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            VISIT
          </a>
        </div>
        {(props.forceInstitutionExpand || this.state.showProjectList) && (
          <ProjectList id={props.id} projects={props.projects} />
        )}
      </li>
    );
  }
}

function ProjectList(props) {
  return props.projects.map((project) => (
    <Project
      key={project.id}
      editable={project.editable}
      id={project.id}
      institutionId={props.id}
      name={project.name}
    />
  ));
}

function Project(props) {
  return (
    <div className="bg-lightgrey text-center p-1 px-auto d-flex">
      <a
        className="btn btn-sm btn-outline-lightgreen"
        href={`/collection?projectId=${props.id}`}
        style={{
          flexGrow: 1,
          marginRight: ".25rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {props.name || "*un-named*"}
      </a>
      {props.editable && (
        <a
          className="edit-project btn btn-sm btn-outline-yellow btn-block"
          href={`/review-project?projectId=${props.id}`}
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            width: "40px",
          }}
        >
          <SvgIcon icon="edit" size="1rem" />
        </a>
      )}
    </div>
  );
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
                        href={`/collection?projectId=${feature.get("projectId")}`}
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
    <NavigationBar userId={session.userId} userName={session.userName} version={session.version}>
      <Home userId={session.userId || -1} userRole={session.userRole || ""} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
