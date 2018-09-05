class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documentRoot: props.documentRoot,
            userId: props.userId,
            username: props.username,
            projects: [],
        };
    }

    componentDidMount() {
        //get projects
        fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.state.userId)
            .then(response => response.json())
            .then(data => this.setState({projects: data}));
    }

    render() {
        const projects = this.state.projects;

        return (
            <div id="bcontainer">
                <span id="mobilespan"></span>
                <div className="Wrapper">
                    <div className="row tog-effect">
                        <SideBar projects={projects} documentRoot={this.state.documentRoot}
                                 username={this.state.username}/>
                        <MapPanel projects={projects} documentRoot={this.state.documentRoot}
                                  userId={this.state.userId}/>
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
            projects: [],
            documentRoot: props.documentRoot,
            imagery: [],
        };
    }

    componentDidMount() {
        //get projects
        fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.props.userId)
            .then(response => response.json())
            .then(data => this.setState({projects: data}));
        //get imagery
        fetch(this.state.documentRoot + "/get-all-imagery")
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }


    showProjectMap(projects, imagery, documentRoot) {
        if (imagery.length > 0) {
            const mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, imagery);
            mercator.setVisibleLayer(mapConfig, imagery[0].title);
            if (projects.length > 0) {
                mercator.addProjectMarkersAndZoom(mapConfig,
                    projects,
                    documentRoot,
                    40); // clusterDistance = 40, use null to disable clustering
            }
        }
    }

    render() {
        {
            this.showProjectMap(this.state.projects, this.state.imagery, this.state.documentRoot)
        }
        ;
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
                        <div id="home-map-pane" style={{width: '100%', height: '100%', position: 'fixed'}}></div>


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

            <CreateInstitutionButton username={props.username} documentRoot={props.documentRoot}/>
            <InstitutionList projects={props.projects} documentRoot={props.documentRoot}/>
            </ul>

        </div>
    );
}

function CreateInstitutionButton(props) {
        if(props.username != "") {
            return (
                    <a className="create-institution" href={props.documentRoot + "/institution/0"}>
                        <li className="bg-yellow text-center p-2"><i className="fa fa-file"></i> Create New Institution</li>
                    </a>
            );
        }
        else{
            return(<span></span>);
        }
}

class InstitutionList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutions: [],
            documentRoot: props.documentRoot,
        };
    }

    componentDidMount() {
        //get institutions
        fetch(this.state.documentRoot + "/get-all-institutions")
            .then(response => response.json())
            .then(data => this.setState({institutions: data}));
    }

    render() {
        const projects = this.props.projects;

        return (

            this.state.institutions.map(
                institution => <Institution id={institution.id} name={institution.name} projects={projects}
                                            documentRoot={this.state.documentRoot}/>
            )

        );
    }
}

function Institution(props) {
    const institutionId = props.id;
    const projects = props.projects;
    const institutionName = props.name;

    return (
        <li key={institutionId}>
            <div className="btn bg-lightgreen btn-block m-0 p-2 rounded-0"
                 data-toggle="collapse"
                 href={"#collapse" + institutionId} role="button"
                 aria-expanded="false">
                <div className="row">
                    <div className="col-lg-10 my-auto">
                        <p className="tree_label text-white m-0"
                           htmlFor={"c" + institutionId}>
                            <input type="checkbox" className="d-none"
                                   id={"c" + institutionId}/>
                            <span className="">{institutionName}</span>
                        </p>
                    </div>
                    <div className="col-lg-1">
                        <a className="institution_info btn btn-sm btn-outline-lightgreen"
                           href={props.documentRoot + "/institution/" + institutionId}>
                            <i className="fa fa-info" style={{color: 'white'}}></i>
                        </a>
                    </div>
                </div>
            </div>
            <ProjectList id={institutionId} projects={projects} documentRoot={props.documentRoot}/>
        </li>
    );
}

function ProjectList(props) {
    const institutionId = props.id;
    return (
        <div className="collapse" id={"collapse" + institutionId}>
            {
                props.projects.map(
                    project => <Project id={project.id} institutionId={institutionId} editable={project.editable}
                                        name={project.name} documentRoot={props.documentRoot}
                                        institution={parseInt(project.institution)}/>
                )
            }
        </div>
    );
}

function Project(props) {
    if (props.institution == props.institutionId) {
        if (props.editable == true) {
            return (
                <div class="bg-lightgrey text-center p-1 row px-auto">
                    <div class="col-lg-8 pr-lg-1">
                        <a className="view-project btn btn-sm btn-outline-lightgreen btn-block"
                           href={props.documentRoot + "/collection/" + props.id}>
                            {props.name}
                        </a>
                    </div>
                    <div className="col-lg-4 pl-lg-0">
                        <a className="edit-project btn btn-sm btn-outline-yellow btn-block"
                           href={props.documentRoot+"/project/"+ props.id }><i className="fa fa-edit"></i> Review</a>
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
    else
        return (<span></span>);
}
//=========================================
// Render Root Component
//=========================================

function renderHome(documentRoot, userId, username) {
    ReactDOM.render(
        <Home documentRoot={documentRoot} userId={userId} username={username}/>,
        document.getElementById("home")
    );
}
