import React, {Fragment} from "react";
import ReactDOM from "react-dom";
import {LoadingModal, NavigationBar} from "./components/PageComponents";
import {mercator} from "./utils/mercator.js";
import {sortAlphabetically, UnicodeIcon} from "./utils/generalUtils";
import SvgIcon from "./components/SvgIcon";

class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: [],
            imagery: [],
            institutions: [],
            showSidePanel: true,
            userInstitutions: [],
            modalMessage: null,
        };
    }

    componentDidMount() {
        // Fetch projects
        this.setState({modalMessage: "Loading institutions"}, () => {
            Promise.all([this.getImagery(), this.getInstitutions(), this.getProjects()])
                .catch(response => {
                    console.log(response);
                    alert("Error retrieving the collection data. See console for details.");
                })
                .finally(() => this.setState({modalMessage: null}));
        });
    }

    getProjects = () => fetch("/get-all-projects")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({projects: data.filter(d => d.validBoundary)});
                return Promise.resolve();
            } else {
                return Promise.reject("No projects found");
            }
        });

    getImagery = () => fetch("/get-public-imagery")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({imagery: data});
                return Promise.resolve();
            } else {
                return Promise.reject("No imagery found");
            }
        });

    getInstitutions = () => fetch("/get-all-institutions")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                const userInstitutions = (this.props.userRole !== "admin")
                    ? data.filter(institution => institution.members.includes(this.props.userId))
                    : [];
                const institutions = (userInstitutions.length > 0)
                    ? data.filter(institution => !userInstitutions.includes(institution))
                    : data;
                this.setState({
                    institutions: institutions,
                    userInstitutions: userInstitutions,
                });
                return Promise.resolve();
            } else {
                return Promise.reject("No institutions found");
            }
        });

    toggleSidebar = (mapConfig) => this.setState(
        {showSidePanel: !this.state.showSidePanel},
        () => mercator.resize(mapConfig)
    );

    render() {
        return (
            <div id="bcontainer">
                <span id="mobilespan"></span>
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
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
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
        if (this.state.mapConfig == null && this.props.imagery.length > 0 && prevProps.imagery.length === 0) {
            const homePageLayer = this.props.imagery.find(
                function (imagery) {
                    return imagery.title === "Mapbox Satellite w/ Labels";
                }
            ) || this.props.imagery[0];
            const mapConfig = mercator.createMap("home-map-pane", [70, 15], 2.1, [homePageLayer]);
            mercator.setVisibleLayer(mapConfig, homePageLayer.id);
            this.setState({mapConfig: mapConfig});
        }
        if (this.state.mapConfig && this.props.projects.length > 0
            && (!prevState.mapConfig || prevProps.projects.length === 0)) {

            this.addProjectMarkers(this.state.mapConfig,
                                   this.props.projects,
                                   40); // clusterDistance = 40, use null to disable clustering
        }
    }

    addProjectMarkers(mapConfig, projects, clusterDistance) {
        const projectSource = mercator.projectsToVectorSource(projects.filter(project => project.boundary));
        if (clusterDistance == null) {
            mercator.addVectorLayer(mapConfig,
                                    "projectMarkers",
                                    projectSource,
                                    mercator.ceoMapStyles("cluster", 0));
        } else {
            mercator.addVectorLayer(mapConfig,
                                    "projectMarkers",
                                    mercator.makeClusterSource(projectSource, clusterDistance),
                                    feature => mercator.ceoMapStyles("cluster", feature.get("features").length));
        }
        mercator.addOverlay(mapConfig, "projectPopup", document.getElementById("projectPopUp"));
        const overlay = mercator.getOverlayByTitle(mapConfig, "projectPopup");
        mapConfig.map.on("click",
                         event => {
                             if (mapConfig.map.hasFeatureAtPixel(event.pixel)) {
                                 const clickedFeatures = [];
                                 mapConfig.map.forEachFeatureAtPixel(event.pixel, feature => clickedFeatures.push(feature));
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
                id="mapPanel"
                className={this.props.showSidePanel
                                ? "col-lg-9 col-md-12 pl-0 full-height"
                                : "col-lg-9 col-md-12 pl-0 col-xl-12 col-xl-9 full-height"}
            >
                <div
                    id="toggle-map-button"
                    className="bg-lightgray"
                    onClick={() => this.props.toggleSidebar(this.state.mapConfig)}
                >
                    {this.props.showSidePanel
                        ? <SvgIcon icon="leftDouble" size="1.25rem"/>
                        : <SvgIcon icon="rightDouble" size="1.25rem"/>
                    }
                </div>
                <div id="home-map-pane" className="full-height" style={{maxWidth: "inherit"}}></div>
                <ProjectPopup
                    mapConfig={this.state.mapConfig}
                    clusterExtent={this.state.clusterExtent}
                    features={this.state.clickedFeatures}
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

    toggleShowFilters = () => this.setState({showFilters: !this.state.showFilters});

    toggleFilterInstitution = () => this.setState({filterInstitution: !this.state.filterInstitution});

    toggleShowEmptyInstitutions = () => this.setState({showEmptyInstitutions: !this.state.showEmptyInstitutions});

    toggleSortByNumber = () => this.setState({sortByNumber: !this.state.sortByNumber});

    toggleUseFirst = () => this.setState({useFirstLetter: !this.state.useFirstLetter});

    updateFilterText = (newText) => this.setState({filterText: newText});

    render() {
        return this.props.showSidePanel &&
            <div id="lPanel" className="col-lg-3 pr-0 pl-0 overflow-hidden full-height d-flex flex-column">
                {(this.props.userRole === "admin" || this.props.userId === -1) &&
                    <div className="bg-darkgreen">
                        <h1 className="tree_label" id="panelTitle">Institutions</h1>
                    </div>
                }
                {this.props.userId > 0 &&
                    <CreateInstitutionButton/>
                }
                <InstitutionFilter
                    updateFilterText={this.updateFilterText}
                    filterText={this.state.filterText}
                    toggleUseFirst={this.toggleUseFirst}
                    useFirstLetter={this.state.useFirstLetter}
                    filterInstitution={this.state.filterInstitution}
                    toggleFilterInstitution={this.toggleFilterInstitution}
                    sortByNumber={this.state.sortByNumber}
                    toggleSortByNumber={this.toggleSortByNumber}
                    showEmptyInstitutions={this.state.showEmptyInstitutions}
                    toggleShowEmptyInstitutions={this.toggleShowEmptyInstitutions}
                    showFilters={this.state.showFilters}
                    toggleShowFilters={this.toggleShowFilters}
                />
                {this.props.userId > 0 && this.props.userRole !== "admin" &&
                    <Fragment>
                        <div className="bg-darkgreen">
                            <h2 className="tree_label" id="panelTitle">Your Affiliations</h2>
                        </div>
                        <InstitutionList
                            userId={this.props.userId}
                            institutions={this.props.userInstitutions}
                            projects={this.props.projects}
                            filterText={this.state.filterText}
                            useFirstLetter={this.state.useFirstLetter}
                            filterInstitution={this.state.filterInstitution}
                            sortByNumber={this.state.sortByNumber}
                            showEmptyInstitutions={this.state.showEmptyInstitutions}
                            institutionListType="user"
                        />
                        <div className="bg-darkgreen">
                            <h2 className="tree_label" id="panelTitle">Other Institutions</h2>
                        </div>
                    </Fragment>
                }
                {this.props.institutions.length > 0 && this.props.projects.length > 0
                ?
                    <InstitutionList
                        userId={this.props.userId}
                        institutions={this.props.institutions}
                        projects={this.props.projects}
                        filterText={this.state.filterText}
                        useFirstLetter={this.state.useFirstLetter}
                        filterInstitution={this.state.filterInstitution}
                        sortByNumber={this.state.sortByNumber}
                        showEmptyInstitutions={this.state.showEmptyInstitutions}
                        institutionListType="institutions"
                    />
                : (
                    this.props.userInstitutions.length > 0
                        ? <h3 className="p-3">No unaffiliated institutions found.</h3>
                        : <h3 className="p-3">Loading data...</h3>
                )}
            </div>;
    }
}

function InstitutionList({
    userId,
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

    const filteredProjects = projects
        .filter(proj => filterInstitution
                        || (useFirstLetter
                            ? proj.name.toLocaleLowerCase().startsWith(filterTextLower)
                            : proj.name.toLocaleLowerCase().includes(filterTextLower)));

    const filterString = (inst) => useFirstLetter
                                    ? inst.name.toLocaleLowerCase().startsWith(filterTextLower)
                                    : inst.name.toLocaleLowerCase().includes(filterTextLower);

    const filterHasProj = (inst) => filteredProjects.some(proj => inst.id === proj.institution)
                                    || showEmptyInstitutions
                                    || inst.admins.includes(userId)
                                    || inst.members.includes(userId);

    const filteredInstitutions = institutions
        // Filtering by institution, contains search string and contains projects or user is member
        .filter(inst => !filterInstitution || filterString(inst))
        .filter(inst => !filterInstitution || filterTextLower.length > 0 || filterHasProj(inst))
        // Filtering by projects, and has projects to show
        .filter(inst => filterInstitution || filteredProjects.some(proj => inst.id === proj.institution))
        .sort((a, b) => sortByNumber
                            ? projects.filter(proj => b.id === proj.institution).length
                                - projects.filter(proj => a.id === proj.institution).length
                            : sortAlphabetically(a.name, b.name));

    const userInstStyle = institutionListType === "user" ? {maxHeight: "fit-content"} : {};

    return (
        filteredInstitutions.length > 0
        ?
            <ul
                className="tree"
                style={{
                    overflowY: "scroll",
                    overflowX: "hidden",
                    minHeight: "3.5rem",
                    flex: "1 1 0%",
                    ...userInstStyle,
                }}
            >
                {filteredInstitutions.map((institution, uid) =>
                    <Institution
                        key={uid}
                        id={institution.id}
                        name={institution.name}
                        projects={filteredProjects
                            .filter(project => project.institution === institution.id)}
                        forceInstitutionExpand={!filterInstitution && filterText.length > 0}
                    />
                )}
            </ul>
        :
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
        <div id="filter-institution" className="form-control" style={{height: "fit-content"}}>
            <div style={{display: "inline-flex", width: "100%"}}>
                <input
                    type="text"
                    placeholder="Enter text to filter"
                    className="form-control"
                    value={props.filterText}
                    onChange={e => props.updateFilterText(e.target.value)}
                />
                <a href="#" onClick={props.toggleShowFilters}>
                    <img
                        src={props.showFilters ? "/img/hidefilter.png" : "/img/showfilter.png"}
                        width="40"
                        height="40"
                        style={{padding: "5px"}}
                        alt="Show/Hide Filters"
                        title="show/hide filters"
                    />
                </a>
            </div>
            {props.showFilters &&
                <Fragment>
                    <div className="d-inlineflex">
                        <div className="form-check form-check-inline">
                            Filter By:
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="filter-by-word"
                                name="filter-institution"
                                checked={props.filterInstitution}
                                onChange={props.toggleFilterInstitution}
                            />
                            Institution
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="filter-by-letter"
                                name="filter-institution"
                                checked={!props.filterInstitution}
                                onChange={props.toggleFilterInstitution}
                            />
                            Project
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="filter-by-first-letter"
                                onChange={props.toggleUseFirst}
                                checked={props.useFirstLetter}
                            />
                            Match from beginning
                        </div>
                    </div>
                    <div className="d-inlineflex">
                        <div className="form-check form-check-inline">
                            Sort By:
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="sort-institution"
                                checked={props.sortByNumber}
                                onChange={props.toggleSortByNumber}
                            />
                            # of Projects
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="sort-institution"
                                checked={!props.sortByNumber}
                                onChange={props.toggleSortByNumber}
                            />
                            ABC..
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={props.showEmptyInstitutions}
                                onChange={props.toggleShowEmptyInstitutions}
                            />
                            Show Empty Institutions
                        </div>
                    </div>
                </Fragment>
            }
        </div>
    );
}

function CreateInstitutionButton() {
    return (
        <div className="btn-yellow text-center p-2">
            <a
                className="create-institution"
                style={{display:"block"}}
                href={"/create-institution"}
            >
                <UnicodeIcon icon="add" backgroundColor="#31BAB0"/> Create New Institution
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

    toggleShowProjectList = () => this.setState({showProjectList: !this.state.showProjectList});

    render() {
        const {props} = this;
        return (
            <li>
                <div
                    className="btn btn-lightgreen btn-block p-2 rounded-0"
                    style={{marginBottom: "2px"}}
                    onClick={this.toggleShowProjectList}
                >
                    <div className="d-flex justify-content-between align-items-center">
                        <div style={{flex: "0 0 1rem"}}>
                            {props.projects && props.projects.length > 0 && (
                                props.forceInstitutionExpand || this.state.showProjectList ? "\u25BC" : "\u25BA"
                            )}
                        </div>
                        <div style={{flex: 1}}>
                            {props.name}
                        </div>
                        <div
                            className="btn btn-sm visit-btn"
                            onClick={e => {
                                e.stopPropagation();
                                window.location = `/review-institution?institutionId=${props.id}`;
                            }}
                        >
                            VISIT
                        </div>
                    </div>
                </div>
                {(props.forceInstitutionExpand || this.state.showProjectList) &&
                    <ProjectList
                        id={props.id}
                        projects={props.projects}
                    />
                }
            </li>
        );
    }
}

function ProjectList(props) {
    return props.projects
        .map((project, uid) =>
            <Project
                key={uid}
                id={project.id}
                institutionId={props.id}
                editable={project.editable}
                name={project.name}
            />
        );
}

function Project(props) {
    return (
        <div className="bg-lightgrey text-center p-1 row px-auto">
            <div className={props.editable ? "col-lg-10 pr-lg-1" : "col mb-1 mx-0"}>
                <a
                    className="btn btn-sm btn-outline-lightgreen btn-block"
                    style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    href={`/collection?projectId=${props.id}`}
                >
                    {props.name || "*un-named*"}
                </a>
            </div>
            {props.editable &&
                <div className="col-lg-2 pl-lg-0">
                    <a
                        className="edit-project btn btn-sm btn-outline-yellow btn-block"
                        href={`/review-project?projectId=${props.id}`}
                    >
                        <UnicodeIcon icon="edit"/>
                    </a>
                </div>
            }
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
            <div id="projectPopUp" className="d-flex flex-column" style={{maxHeight: "40vh"}}>
                <div className="cTitle">
                    <h1>{this.props.features.length > 1 ? "Cluster info" : "Project info"}</h1>
                </div>
                <div className="cContent" style={{padding: "10px", overflow: "auto"}}>
                    <table className="table table-sm" style={{tableLayout: "fixed"}}>
                        <tbody>
                            {this.props.features.map((feature, uid) =>
                                <React.Fragment key={uid}>
                                    <tr className="d-flex" style={{borderTop: "1px solid gray"}}>
                                        <td className="small col-6 px-0 my-auto">Name</td>
                                        <td className="small col-6 pr-0">
                                            <a
                                                href={`/collection?projectId=${feature.get("projectId")}`}
                                                className="btn btn-sm btn-block btn-outline-lightgreen"
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
                                        <td className="small col-6 pr-0" style={{wordBreak: "break-all"}}>
                                            {feature.get("description")}
                                        </td>
                                    </tr>
                                    <tr className="d-flex" style={{borderBottom: "1px solid gray"}}>
                                        <td className="small col-6 px-0 my-auto">Number of plots</td>
                                        <td className="small col-6 pr-0">{feature.get("numPlots")}</td>
                                    </tr>
                                </React.Fragment>
                            )}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    id="zoomToCluster"
                    className="mt-0 mb-0 btn btn-sm btn-block btn-outline-yellow"
                    style={{
                        cursor: "pointer",
                        minWidth: "350px",
                        display: this.props.features.length > 1 ? "block" : "none",
                    }}
                >
                    <UnicodeIcon icon="magnify"/> Zoom to cluster
                </button>
            </div>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Home
                userId={args.userId || -1}
                userRole={args.userRole || ""}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
