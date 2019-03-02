import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { sortAlphabetically } from "./utils/textUtils.js";

class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: [],
            imagery: [],
            institutions: [],
            showSidePanel: true,
        };
    }

    componentDidMount() {
        // Fetch projects
        Promise.all([this.getProjects(), this.getImagery(), this.getInstitutions()])
            .catch(response => {
                console.log(response);
                alert("Error retrieving the collection data. See console for details.");
            });
    }

    getProjects = () => fetch(this.props.documentRoot + "/get-all-projects?userId=" + this.props.userId)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({ projects: data });
                return Promise.resolve();
            } else {
                return Promise.reject("No projects found");
            }
        })

    getImagery = () => fetch(this.props.documentRoot + "/get-all-imagery")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({ imagery: data });
                return Promise.resolve();
            } else {
                return Promise.reject("No imagery found");
            }
        })

    getInstitutions = () => fetch(this.props.documentRoot + "/get-all-institutions")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({ institutions: data });
                return Promise.resolve();
            } else {
                return Promise.reject("No institutions found");
            }
        })

    toggleSidebar = () => this.setState({ showSidePanel: !this.state.showSidePanel });

    render() {
        return (
            <div id="bcontainer">
                <span id="mobilespan"></span>
                <div className="Wrapper">
                    <div className="row tog-effect">
                        <SideBar
                            documentRoot={this.props.documentRoot}
                            institutions={this.state.institutions}
                            projects={this.state.projects}
                            showSidePanel={this.state.showSidePanel}
                            userId={this.props.userId}
                            userName={this.props.userName}
                        />
                        <MapPanel
                            documentRoot={this.props.documentRoot}
                            imagery={this.state.imagery}
                            projects={this.state.projects}
                            showSidePanel={this.state.showSidePanel}
                            toggleSidebar={this.toggleSidebar}
                            userId={this.props.userId}
                        />
                    </div>
                </div>
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
            const mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, this.props.imagery.slice(0, 1));
            mercator.setVisibleLayer(mapConfig, this.props.imagery[0].title);
            this.setState({ mapConfig: mapConfig });
        }
        if (this.state.mapConfig && this.props.projects.length > 0
            && (!prevState.mapConfig || prevProps.projects.length === 0)) {

            this.addProjectMarkersAndZoom(this.state.mapConfig,
                                          this.props.projects,
                                          this.props.documentRoot,
                                          40); // clusterDistance = 40, use null to disable clustering
        }
    }

    addProjectMarkersAndZoom(mapConfig, projects, documentRoot, clusterDistance) {
        const projectSource = mercator.projectsToVectorSource(projects.filter(project => project.boundary));
        if (clusterDistance == null) {
            mercator.addVectorLayer(mapConfig,
                                    "projectMarkers",
                                    projectSource,
                                    ceoMapStyles.ceoIcon);
        } else {
            mercator.addVectorLayer(mapConfig,
                                    "projectMarkers",
                                    mercator.makeClusterSource(projectSource, clusterDistance),
                                    feature => mercator.getCircleStyle(10, "#3399cc", "#ffffff", 1, feature.get("features").length, "#ffffff"));
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
        mercator.zoomMapToExtent(mapConfig, projectSource.getExtent());
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
                                ? "col-lg-9 col-md-12 pl-0"
                                : "col-lg-9 col-md-12 pl-0 col-xl-12 col-xl-9"}
            >
                <div className="row no-gutters ceo-map-toggle">
                    <div
                        id="togbutton"
                        className="button col-xl-1 bg-lightgray d-none d-xl-block"
                        onClick={this.props.toggleSidebar}
                    >
                        <div className="empty-div" style={{ height: "50vh" }}/>
                        <div className="my-auto no-gutters text-center">
                            <div className={this.props.showSidePanel ? "" : "d-none"}>
                                <div className={"fa fa-caret-left"} />
                            </div>
                            <div className={this.props.showSidePanel ? "d-none" : ""}>
                                <div className={"fa fa-caret-right"} />
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-11 mr-0 ml-0 bg-lightgray">
                        <div id="home-map-pane" style={{ width: "100%", height: "100%", position: "fixed" }}></div>
                    </div>
                </div>
                <ProjectPopup
                    mapConfig={this.state.mapConfig}
                    clusterExtent={this.state.clusterExtent}
                    features={this.state.clickedFeatures}
                    documentRoot={this.props.documentRoot}
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
            containsProjects: false,
            showFilters: false,
        };
    }

    toggleShowFilters = () => this.setState({ showFilters: !this.state.showFilters });

    toggleFilterInstitution = () => this.setState({ filterInstitution: !this.state.filterInstitution });

    toggleContainsProjects = () => this.setState({ containsProjects: !this.state.containsProjects });

    toggleSortByNumber = () => this.setState({ sortByNumber: !this.state.sortByNumber });

    toggleUseFirst = () => this.setState({ useFirstLetter: !this.state.useFirstLetter });

    updateFilterText = (newText) => this.setState({ filterText: newText });

    render() {
        const filterTextLower = this.state.filterText.toLocaleLowerCase();

        const filteredProjects = this.props.projects
            .filter(proj => this.state.filterInstitution
                                    || (this.state.useFirstLetter
                                        ? proj.name.toLocaleLowerCase().startsWith(filterTextLower)
                                        : proj.name.toLocaleLowerCase().includes(filterTextLower)));

        const filteredInstitutions = this.props.institutions
            .filter(inst => !this.state.filterInstitution
                                    || (this.state.useFirstLetter
                                        ? inst.name.toLocaleLowerCase().startsWith(filterTextLower)
                                        : inst.name.toLocaleLowerCase().includes(filterTextLower)))
            .filter(inst => this.state.filterInstitution
                                    || filteredProjects.some(proj => inst.id === proj.institution))
            .filter(inst => !(this.state.filterInstitution && this.state.containsProjects)
                                    || this.props.projects.some(proj => inst.id === proj.institution))
            .sort((a, b) => this.state.sortByNumber
                                    ? this.props.projects.filter(proj => b.id === proj.institution).length
                                        - this.props.projects.filter(proj => a.id === proj.institution).length
                                    : sortAlphabetically(a.name, b.name));


        return this.props.showSidePanel
            ? (<div id="lPanel" className="col-lg-3 pr-0 pl-0 overflow-hidden full-height d-flex flex-column">
                <div className="bg-darkgreen">
                    <h1 className="tree_label" id="panelTitle">Institutions</h1>
                </div>
                {this.props.userName &&
                    <CreateInstitutionButton documentRoot={this.props.documentRoot}/>
                }
                <InstitutionFilter
                    documentRoot={this.props.documentRoot}
                    filteredInstitutions={this.props.institutions}
                    updateFilterText={this.updateFilterText}
                    filterText={this.state.filterText}
                    toggleUseFirst={this.toggleUseFirst}
                    useFirstLetter={this.state.useFirstLetter}
                    filterInstitution={this.state.filterInstitution}
                    toggleFilterInstitution={this.toggleFilterInstitution}
                    sortByNumber={this.state.sortByNumber}
                    toggleSortByNumber={this.toggleSortByNumber}
                    containsProjects={this.state.containsProjects}
                    toggleContainsProjects={this.toggleContainsProjects}
                    showFilters={this.state.showFilters}
                    toggleShowFilters={this.toggleShowFilters}
                />
                {this.props.institutions.length > 0
                    ? filteredInstitutions.length > 0
                        ? <ul className="tree" style={{ overflow: "hidden scroll" }}>
                            {filteredInstitutions.map((institution, uid) =>
                                <Institution
                                    key={uid}
                                    id={institution.id}
                                    name={institution.name}
                                    documentRoot={this.props.documentRoot}
                                    projects={filteredProjects
                                        .filter(project => project.institution === institution.id)}
                                    forceInstitutionExpand={!this.state.filterInstitution
                                                                    && this.state.filterText.length > 0}
                                />
                            )}
                        </ul>
                        : <h3 className="p-3">No Institutions Found...</h3>
                    : <h3 className="p-3">Loading data...</h3> }
            </div>
            ) : (
                ""
            );
    }
}

function InstitutionFilter(props) {
    return (
        <div className="InstitutionFilter form-control">
            <div id="filter-institution" style={{ display: "inline-flex", width: "100%" }}>
                <input
                    type="text"
                    id="filterInstitution"
                    autoComplete="off"
                    placeholder="Enter text to filter"
                    className="form-control"
                    value={props.filterText}
                    onChange={e => props.updateFilterText(e.target.value)}
                />
                <a href="#" onClick={props.toggleShowFilters}>
                    <img
                        src={props.documentRoot + (props.showFilters ? "/img/hidefilter.png" : "/img/showfilter.png")}
                        width="40"
                        height="40"
                        style={{ padding: "5px" }}
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
                                checked={props.containsProjects}
                                onChange={props.toggleContainsProjects}
                            />
                            Contains projects
                        </div>
                    </div>
                </Fragment>
            }
        </div>
    );
}

function CreateInstitutionButton(props) {
    return (
        <div className="bg-yellow text-center p-2">
            <a
                className="create-institution"
                style={{ display:"block" }}
                href={props.documentRoot + "/create-institution"}
            >
                <span className="fa fa-file" /> Create New Institution
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
                    className="btn bg-lightgreen btn-block m-0 p-2 rounded-0"
                    onClick={this.toggleShowProjectList}
                >
                    <div className="row">
                        <div className="col-lg-10 my-auto">
                            <p
                                className="tree_label text-white m-0"
                                htmlFor={"c" + props.id}
                            >
                                <input type="checkbox" className="d-none" id={"c" + props.id}/>
                                <span className="">{props.name}</span>
                            </p>
                        </div>
                        <div className="col-lg-1">
                            <a
                                className="institution_info btn btn-sm btn-outline-lightgreen"
                                href={props.documentRoot + "/review-institution/" + props.id}
                            >
                                <span className="fa fa-info" style={{ color: "white" }} />
                            </a>
                        </div>
                    </div>
                </div>

                {(props.forceInstitutionExpand || this.state.showProjectList) &&
                    <ProjectList
                        id={props.id}
                        projects={props.projects}
                        documentRoot={props.documentRoot}
                    />
                }
            </li>
        );
    }
}

function ProjectList(props) {
    return props.projects
        .map(
            (project, uid) =>
                <Project
                    key={uid}
                    id={project.id}
                    institutionId={props.id}
                    editable={project.editable}
                    name={project.name}
                    documentRoot={props.documentRoot}
                />
        );
}

function Project(props) {
    return props.editable
        ?
            <div className="bg-lightgrey text-center p-1 row px-auto">
                <div className="col-lg-10 pr-lg-1">
                    <a
                        className="view-project btn btn-sm btn-outline-lightgreen btn-block"
                        href={props.documentRoot + "/collection/" + props.id}
                    >
                        {props.name}
                    </a>
                </div>
                <div className="col-lg-2 pl-lg-0">
                    <a
                        className="edit-project btn btn-sm btn-outline-yellow btn-block"
                        href={props.documentRoot + "/review-project/" + props.id}
                    >
                        <span className="fa fa-edit" />
                    </a>
                </div>
            </div>
        :
            <div className="bg-lightgrey text-center p-1 row">
                <div className="col mb-1 mx-0">
                    <a
                        className="btn btn-sm btn-outline-lightgreen btn-block"
                        href={props.documentRoot + "/collection/" + props.id}
                    >
                        {props.name}
                    </a>
                </div>
            </div>;
}

class ProjectPopup extends React.Component {
    componentDidMount() {
        // There is some kind of bug in attaching this onClick handler directly to its button in render().
        document.getElementById("zoomToCluster").onclick = () => {
            mercator.zoomMapToExtent(this.props.mapConfig, this.props.clusterExtent);
            mercator.getOverlayByTitle(this.props.mapConfig, "projectPopup").setPosition(undefined);
        };
    }

    render() {
        return (
            <div id="projectPopUp">
                <div className="cTitle">
                    <h1>{this.props.features.length > 1 ? "Cluster info" : "Project info"}</h1>
                </div>
                <div className="cContent" style={{ padding:"10px" }}>
                    <table className="table table-sm">
                        <tbody>
                            {
                                this.props.features.map((feature, uid) =>
                                    <React.Fragment key={uid}>
                                        <tr className="d-flex" style={{ borderTop: "1px solid gray" }}>
                                            <td className="small col-6 px-0 my-auto">Name</td>
                                            <td className="small col-6 pr-0">
                                                <a
                                                    href={this.props.documentRoot + "/collection/" + feature.get("projectId")}
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
                                            <td className="small col-6 pr-0">{feature.get("description")}</td>
                                        </tr>
                                        <tr className="d-flex" style={{ borderBottom: "1px solid gray" }}>
                                            <td className="small col-6 px-0 my-auto">Number of plots</td>
                                            <td className="small col-6 pr-0">{feature.get("numPlots")}</td>
                                        </tr>
                                    </React.Fragment>
                                )
                            }
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
                    <span className="fa fa-search-plus"/>Zoom to cluster
                </button>
            </div>
        );
    }
}

export function renderHomePage(args) {
    ReactDOM.render(
        <Home documentRoot={args.documentRoot} userId={args.userId} userName={args.userName}/>,
        document.getElementById("home")
    );
}
