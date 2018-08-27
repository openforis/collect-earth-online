// FIXME: replace testRoot and testUserId with this.state.documentRoot and this.state.userId
// FIXME: rename Main.js to home.js and delete old home.js
class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documentRoot: props.documentRoot,
            userId: props.userId,
            projects:[],
        };
    }

    componentDidMount() {
        //get projects
        fetch(testRoot + "/get-all-projects?userId=" + testUserId)
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
                        <SideBar projects={projects}/>
                        <MapPanel projects={projects}/>
                    </div>
                </div>
            </div>
        );
    }
}

class MapPanel extends React.Component {
    constructor(props) {
        super(props);
        // FIXME: Add projects and documentRoot to this.state
        this.state = {
            imagery: [],
        };
    }

    componentDidMount() {
        //get projects
        fetch(testRoot + "/get-all-imagery")
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }

    // FIXME: Call in componentDidMount or equivalent lifecycle function after /get-all-imagery returns
    showProjectMap() {
        if (this.state.imagery.length > 0) {
            const mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, this.state.imagery);
            mercator.setVisibleLayer(mapConfig, this.state.imagery[0].title);
            if (this.state.projects.length > 0) {
                mercator.addProjectMarkersAndZoom(mapConfig,
                                                  this.state.projects,
                                                  this.state.documentRoot,
                                                  40); // clusterDistance = 40, use null to disable clustering
            }
        }
    }

    render() {
        return (
            <div id="mapPanel" className="col-lg-9 col-md-12 pl-0 pr-0">
                <div className="row no-gutters full-height">
                    <div id="togbutton" className="button col-xl-1 bg-lightgray d-none d-xl-block">
                        <div className="row h-100">
                            <div className="col-lg-12 my-auto no-gutters text-center">
                                <span id="tog-symb"><i className="fa fa-caret-left"></i></span>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-11 mr-0 ml-0 bg-lightgray">
                        <div id="home-map-pane"></div>
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
            // FIXME: Add CreateInstitutionButton component
            <InstitutionList projects={props.projects}/>
        </div>
    );
}

class InstitutionList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutions: [],
        };
    }

    componentDidMount() {
        //get institutions
        fetch(testRoot + "/get-all-institutions")
            .then(response => response.json())
            .then(data => this.setState({institutions: data}));
    }

    render() {
        const projects = this.props.projects;

        return (
            <ul className="tree">
            {
                this.state.institutions.map(
                    institution => <Institution id={institution.id} name={institution.name} projects={projects}/>
                )
            }
            </ul>
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
                            htmlFor={institutionId}>
                            <input type="checkbox" className="d-none"
                                id={institutionId}/>
                            <span className="">{institutionName}</span>
                       </p>
                    </div>
                    <div className="col-lg-1">
                        <a className="institution_info btn btn-sm btn-outline-lightgreen"
                            href={testRoot + "/institution/" + institutionId}>
                            <i className="fa fa-info" style={{color: 'white'}}></i>
                        </a>
                    </div>
                </div>
            </div>
            <ProjectList id={institutionId} projects={projects}/>
        </li>
    );
}

// FIXME: Rewrite as a function component
class ProjectList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const institutionId=this.props.id;
        return (
            <div className="collapse" id={"collapse" + institutionId}>
            {
                this.props.projects.map(
                    project => <Project id={project.id} editable={project.editable} name={project.name}/>
                )
            }
            </div>
        );
    }
}

// FIXME: Rewrite as a function component
class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        if (this.props.editable == true) {
            return (
                <div class="bg-lightgrey text-center p-1 row px-auto">
                    <div class="col-lg-9 pr-lg-1">
                        <a className="view-project btn btn-sm btn-outline-lightgreen btn-block"
                            href={testRoot + "/collection/" + this.props.id}>
                            {this.props.name}
                        </a>
                    </div>
                    <div className="col-lg-3 pl-lg-0">
                        <a className="edit-project btn btn-outline-yellow btn-sm btn-block"
                            href={testRoot + "/project/" + this.props.id}>
                            <i className="fa fa-edit"> </i> Edit
                        </a>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="bg-lightgrey text-center p-1 row">
                    <div className="col mb-1 mx-0">
                        <a className="btn btn-sm btn-outline-lightgreen btn-block"
                            href={testRoot + "/collection/" + this.props.id}>
                            {this.props.name}
                        </a>
                    </div>
                </div>
            );
        }
    }
}

//=========================================
// Render Root Component
//=========================================

function renderHome(documentRoot, userId) {
    ReactDOM.render(
        <Home documentRoot={documentRoot} userId={userId} />,
        document.getElementById("home")
    );
}
