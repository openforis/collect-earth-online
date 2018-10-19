import React from "react";
import ReactDOM from "react-dom";
import { mercator } from "../js/mercator-openlayers.js";

class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: []
        };
    }

    componentDidMount() {
        // Fetch projects
        fetch(this.props.documentRoot + "/get-all-projects?userId=" + this.props.userId)
            .then(response => response.json())
            .then(data => this.setState({projects: data}));
    }

    render() {
        return (
            <div id="bcontainer">
                <span id="mobilespan"></span>
                <div className="Wrapper">
                    <div className="row tog-effect">
                        <SideBar documentRoot={this.props.documentRoot}
                                 userName={this.props.userName}
                                 projects={this.state.projects}/>
                        <MapPanel documentRoot={this.props.documentRoot}
                                  userId={this.props.userId}
                                  projects={this.state.projects}/>
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
            imagery: [],
            mapConfig: null
        };
    }

    componentDidMount() {
        // Fetch imagery
        fetch(this.props.documentRoot + "/get-all-imagery")
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }

    componentDidUpdate() {
        if (this.state.mapConfig == null && this.state.imagery.length > 0) {
            const mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, this.state.imagery.slice(0,1));
            mercator.setVisibleLayer(mapConfig, this.state.imagery[0].title);
            this.setState({mapConfig: mapConfig});
        }
        if (this.state.mapConfig != null && this.props.projects.length > 0) {
            mercator.addProjectMarkersAndZoom(this.state.mapConfig,
                                              this.props.projects,
                                              this.props.documentRoot,
                                              40); // clusterDistance = 40, use null to disable clustering
        }
    }

    render() {
        return (
            <div id="mapPanel" className="col-lg-9 col-md-12 pl-0 pr-0">
                <div className="row no-gutters ceo-map-toggle">
                    <div id="togbutton" className="button col-xl-1 bg-lightgray d-none d-xl-block">
                        <div className="row h-100">
                            <div className="col-lg-12 my-auto no-gutters text-center">
                                <span id="tog-symb"><i className="fa fa-caret-left"></i></span>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-11 mr-0 ml-0 bg-lightgray">
                        <div id="home-map-pane" style={{width: "100%", height: "100%", position: "fixed"}}></div>
                    </div>
                </div>
            </div>
        );
    }
}

function SideBar(props) {
    return (
        <div id="lPanel" className="col-lg-3 pr-0 pl-0">
            <div className="bg-darkgreen">
                <h1 className="tree_label" id="panelTitle">Institutions</h1>
            </div>
            <ul className="tree">
                <CreateInstitutionButton userName={props.userName} documentRoot={props.documentRoot}/>
                <InstitutionList projects={props.projects} documentRoot={props.documentRoot}/>
            </ul>

        </div>
    );
}

function CreateInstitutionButton(props) {
    if (props.userName != "") {
        return (
            <a className="create-institution" href={props.documentRoot + "/institution/0"}>
                <li className="bg-yellow text-center p-2"><i className="fa fa-file"></i> Create New Institution</li>
            </a>
        );
    } else {
        return (
            <span></span>
        );
    }
}

class InstitutionList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutions: []
        };
    }

    componentDidMount() {
        // Fetch institutions
        fetch(this.props.documentRoot + "/get-all-institutions")
            .then(response => response.json())
            .then(data => this.setState({institutions: data}));
    }

    render() {
        return (
            this.state.institutions.map(
                (institution, uid) =>
                    <Institution key={uid}
                                 id={institution.id}
                                 name={institution.name}
                                 documentRoot={this.props.documentRoot}
                                 projects={this.props.projects.filter(project => project.institution == institution.id)}/>
            )
        );
    }
}

function Institution(props) {
    return (
        <li>
            <div className="btn bg-lightgreen btn-block m-0 p-2 rounded-0"
                 data-toggle="collapse"
                 href={"#collapse" + props.id}
                 role="button"
                 aria-expanded="false">
                <div className="row">
                    <div className="col-lg-10 my-auto">
                        <p className="tree_label text-white m-0"
                           htmlFor={"c" + props.id}>
                            <input type="checkbox" className="d-none" id={"c" + props.id}/>
                            <span className="">{props.name}</span>
                        </p>
                    </div>
                    <div className="col-lg-1">
                        <a className="institution_info btn btn-sm btn-outline-lightgreen"
                           href={props.documentRoot + "/institution/" + props.id}>
                            <i className="fa fa-info" style={{color: "white"}}></i>
                        </a>
                    </div>
                </div>
            </div>
            <ProjectList id={props.id} projects={props.projects} documentRoot={props.documentRoot}/>
        </li>
    );
}

function ProjectList(props) {
    return (
        <div className="collapse" id={"collapse" + props.id}>
            {
                props.projects.map(
                    (project, uid) =>
                        <Project key={uid}
                                 id={project.id}
                                 institutionId={props.id}
                                 editable={project.editable}
                                 name={project.name}
                                 documentRoot={props.documentRoot}/>
                )
            }
        </div>
    );
}

function Project(props) {
    if (props.editable == true) {
        return (
            <div className="bg-lightgrey text-center p-1 row px-auto">
                <div className="col-lg-8 pr-lg-1">
                    <a className="view-project btn btn-sm btn-outline-lightgreen btn-block"
                       href={props.documentRoot + "/collection/" + props.id}>
                        {props.name}
                    </a>
                </div>
                <div className="col-lg-4 pl-lg-0">
                    <a className="edit-project btn btn-sm btn-outline-yellow btn-block"
                       href={props.documentRoot + "/project/" + props.id}>
                        <i className="fa fa-edit"></i> Review
                    </a>
                </div>
            </div>
        );
    } else {
        return (
            <div className="bg-lightgrey text-center p-1 row">
                <div className="col mb-1 mx-0">
                    <a className="btn btn-sm btn-outline-lightgreen btn-block"
                       href={props.documentRoot + "/collection/" + props.id}>
                        {props.name}
                    </a>
                </div>
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
