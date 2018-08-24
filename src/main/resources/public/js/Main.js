class Home extends  React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }
    render() {

        return (
            <div id="bcontainer">
                <span id="mobilespan"></span>
                <div className="Wrapper">
                    <div className="row tog-effect">
                        <SideBar/>
                        <MapPanel/>
                    </div>
                </div>
            </div>
        );
    }
}
class MapPanel extends  React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
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

class SideBar extends  React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }
    render() {

        return (
            <Institution/>
        );
    }
}

class Institution extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            institutions:[],
        };
    }

    componentDidMount() {
        //get institutions
        fetch(testRoot + "/get-all-institutions")
            .then(response => response.json())
            .then(data => this.setState({ institutions: data }));
    }
    render() {
        return (

            <div id="lPanel" className="col-lg-3 pr-0 pl-0">
                <div className="bg-darkgreen">
                    <h1 className="tree_label" id="panelTitle">
                        Institutions
                    </h1>
                </div>
                <ul class="tree">
                    {this.state.institutions.map(institution =>
                        <li key={institution.id}>

                            <div className="btn bg-lightgreen btn-block m-0 p-2 rounded-0"
                                 data-toggle="collapse"
                                 href={"#collapse" + institution.id} role="button"
                                 aria-expanded="false">
                                <div className="row">
                                    <div className="col-lg-10 my-auto">
                                        <p className="tree_label text-white m-0"
                                           htmlFor={institution.id}>
                                            <input type="checkbox" className="d-none"
                                                   id={institution.id}/>
                                            <span className="">{institution.name}</span>
                                        </p>
                                    </div>
                                    <div className="col-lg-1">
                                        <a className="institution_info btn btn-sm btn-outline-lightgreen"
                                           href={testRoot + institution.id}>
                                            <i className="fa fa-info" style={{color: 'white'}}></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <Project id={institution.id}/>
                        </li>
                    )}
                </ul>

            </div>


        );
    }
}
class Project extends React.Component {
    constructor() {
        super();
        this.state = {
            projects: [],
        };
    }


    componentDidMount() {
        //get projects
        fetch(testRoot + "/get-all-projects?userId=" + testUserId)
            .then(response => response.json())
            .then(data => this.setState({projects: data}));    }


    render() {
        return (
            <div  className="collapse" id={"collapse" + this.props.id}>
                {this.state.projects.map(project => {
                        if(project.editable == true) {
                            return(
                                <div>
                                    <div
                                        className="bg-lightgrey text-center p-1 row px-auto">

                                        <a className="view-project btn btn-sm btn-outline-lightgreen btn-block"
                                           href={testRoot + "/collection/" + project.id}>{project.name}</a>
                                    </div>

                                    <div className="col-lg-3 pl-lg-0">
                                        <a className="edit-project btn btn-outline-yellow btn-sm btn-block"
                                           href={testRoot + "/project/" + project.id}>
                                            < i
                                                className="fa fa-edit"> </i> Edit</a>
                                    </div>

                                </div>
                            );
                        }
                        if(project.editable==false) {
                            return(
                                <div className="bg-lightgrey text-center p-1 row">

                                    <div className="col mb-1 mx-0">
                                        <a className="btn btn-sm btn-outline-lightgreen btn-block"
                                           href={testRoot + "/collection/" + project.id}>{project.name}</a>
                                    </div>
                                </div>
                            );
                        }
                    }

                )}
            </div>
        );
    }
}


//=========================================
// Render Root Component
//=========================================

ReactDOM.render(
    <Home/>,
    document.getElementById('home')
);
