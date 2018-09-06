class Institution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institution: [],
            imagery: [],
            projects: [],
            users: [],
            usersCompleteList: [],
            userId: props.userId,
            documentRoot: props.documentRoot,
            institutionId: props.institutionId,
            of_users_api_url: props.of_users_api_url,
            role: props.role,
            storage: props.storage,
            nonPendingUsers: props.nonPendingUsers,
            pageMode: props.pageMode,
            details: {
                id: "-1",
                name: "",
                logo: "",
                url: "",
                description: "",
                admins: []
            },
        };
        this.togglePageMode = this.togglePageMode.bind(this);
        this.updateInstitution = this.updateInstitution.bind(this);
        this.getData=this.getData.bind(this);
        this.handleChange=this.handleChange.bind(this);
        this.deleteInstitution = this.deleteInstitution.bind(this);
    };

    componentDidMount() {
        if (this.state.institutionId == "0") {
            this.setState({pageMode: "edit"});

        }
        else {
            //get institutions
            fetch(this.state.documentRoot + "/get-institution-details/" + this.state.institutionId)
                .then(response => response.json())
                .then(data => this.setState({institution: data}));
            //get imagery
            fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId)
                .then(response => response.json())
                .then(data => this.setState({imagery: data}));
            //get projects
            fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.state.userId + "&institutionId=" + this.props.institutionId)
                .then(response => response.json())
                .then(data => this.setState({projects: data}));
            //get users
            fetch(this.state.documentRoot + "/get-all-users?institutionId=" + this.state.institutionId)
                .then(response => response.json())
                .then(data => this.setState({users: data}));
            //get users complete list
            fetch(this.state.documentRoot + "/get-all-users")
                .then(response => response.json())
                .then(data => this.setState({usersCompleteList: data}));
        }
        let count=this.state.users.filter(
            function (user) {
                return user.institutionRole != "pending";
            }
        ).length;
        this.setState({nonPendingUsers : count});
        let detailsNew=this.state.details;
        detailsNew.id= this.state.institutionId;
        this.setState({details: detailsNew});

    }
    updateInstitution() {

        let institutionId = this.state.institutionId;
        let isAdmin = this.state.isAdmin;
        let userId = this.state.userId;
        let documentRoot = this.state.documentRoot;
        let formData = new FormData();
        var holdRef = this;
        formData.append("userid", userId);
        formData.append("institution-name", holdRef.state.details.name);
        formData.append("institution-logo", document.getElementById("institution-logo").files[0]);
        formData.append("institution-url", holdRef.state.details.url);
        formData.append("institution-description", holdRef.state.details.description);
        $.ajax({
            url: documentRoot + "/update-institution/" + institutionId,
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: false,
            processData: false,
            data: formData
        }).fail(function () {
            alert("Error updating institution details. See console for details.");

        }).done(function (data) {
            var parsedData = JSON.parse(data);
            if (institutionId == 0) {
                window.location = documentRoot + "/institution/" + parsedData.id;
            } else {
                let detailsNew = holdRef.state.details;
                detailsNew.id = parsedData.id;
                institutionId = parsedData.id;
                isAdmin = true;
                if (parsedData.logo != "") {
                    detailsNew.logo = parsedData.logo;
                }
                holdRef.setState({details: detailsNew});
                holdRef.getData(institutionId);
                holdRef.setState({isAdmin: isAdmin});
                holdRef.setState({institutionId: institutionId});
            }
        });

    }

    togglePageMode() {

        if (this.state.pageMode == "view") {
            this.setState({pageMode: "edit"});

        } else {
            this.updateInstitution();
            this.setState({pageMode: "view"});
        }

    }
    getData(institutionId){
        fetch(this.state.documentRoot + "/get-institution-details/" + institutionId)
            .then(response => response.json())
            .then(data => this.setState({institution: data}));
        fetch(this.state.documentRoot + "/get-all-users?institutionId=" + institutionId)
            .then(response => response.json())
            .then(data => this.setState({users: data}));
        fetch(this.state.documentRoot + "/get-all-users")
            .then(response => response.json())
            .then(data => this.setState({usersCompleteList: data}));
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }
    handleChange(event) {
        const target = event.target;
        const value = target.value;
        let detailsNew=this.state.details;
        if (target.id == "institution-details-name") {
            detailsNew.name = value;
        }

        if (target.id == "institution-details-url") {
            detailsNew.url = value;
        }
        if (target.id == "institution-details-description") {
            detailsNew.description = value;

        }
        this.setState({details: detailsNew});
    }
    deleteInstitution() {
        let institutionId=this.state.institutionId;
        let name=this.props.institution.name;
        let documentRoot=this.props.documentRoot;
        if (confirm("Do you REALLY want to delete this institution?!")) {
            $.ajax({
                url: documentRoot + "/archive-institution/" + institutionId,
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
            }).fail(function () {
                alert("Error deleting institution. See console for details.");

            }).done(function () {
                alert("Institution " + name + " has been deleted.");
                window.location = documentRoot + "/home";
            });
        }
    }
    cancelChanges() {
        this.setState({pageMode: "view"});
    }


    render() {
        let isAdmin = false;
        let usersLength;
        const imagery = this.state.imagery;
        const projects = this.state.projects;
        const users = this.state.users;
        if (this.state.userId != "") {
            isAdmin = this.state.details.admins.includes(parseInt(this.state.userId));
        }
        if(this.state.role=="admin"){
            isAdmin=true;
        }

        if (isAdmin == true) {
            usersLength = users.length;
        }
        else {
            usersLength = this.state.users.filter(
                function (user) {
                    return user.institutionRole != "pending";
                }
            ).length;;
        }


        return (
            <React.Fragment>
                <InstitutionDescription userId={this.state.userId} institution={this.state.institution}
                                        documentRoot={this.state.documentRoot}
                                        of_users_api_url={this.state.of_users_api_url}
                                        institutionId={this.state.institutionId} role={this.state.role}
                                        storage={this.state.storage} pageMode={this.state.pageMode}
                                        details={this.state.details} togglePageMode={this.togglePageMode} handleChange={this.handleChange} cancelChanges={this.cancelChanges} deleteInstitution={this.deleteInstitution}/>
                <div className="row">
                    <div id="imagery-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Imagery <span
                            className="badge badge-pill badge-light">{imagery.length}</span>
                        </h2>
                        <ImageryList userId={this.state.userId} documentRoot={this.state.documentRoot}
                                     institution={this.state.institution} isAdmin={isAdmin}
                                     institutionId={this.state.institutionId} details={this.state.details}
                                     imagery={imagery} pageMode={this.state.pageMode}/>
                    </div>
                    <div id="project-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Projects <span
                            className="badge badge-pill  badge-light">{projects.length}</span>
                        </h2>
                        <ProjectList userId={this.state.userId} documentRoot={this.state.documentRoot} institution={this.state.institution}
                                     projects={this.state.projects} isAdmin={isAdmin} institutionId={this.state.institutionId}/>
                    </div>
                    <div id="user-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Users <span
                            className="badge badge-pill  badge-light">{usersLength}</span></h2>
                        <UserList userId={this.state.userId} documentRoot={this.state.documentRoot} institution={this.state.institution}
                                  institutionId={this.state.institutionId} users={this.state.users} isAdmin={isAdmin}
                                  pageMode={this.state.pageMode}/>
                    </div>

                </div>
            </React.Fragment>

        );
    }
}

class InstitutionDescription extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pageMode: this.props.pageMode,
            users: [],
            imagery: [],
            usersCompleteList: [],
            isAdmin: this.props.isAdmin,
            logo: this.props.institution.logo,
            institutionId: this.props.institutionId,
            details: this.props.details,
        }

    }

    renderComp(role, pageMode, institution, isAdmin, togglePageMode, deleteInstitution) {
        if (role != "") {
            if (institution.id > 0 && role == "admin" && pageMode == 'view') {
                return (
                    <div className="row justify-content-center mb-2" id="institution-controls">
                        <div className="col-3">
                            <button id="edit-institution" type="button"
                                    class="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                    onClick={togglePageMode}>
                                <i className="fa fa-edit"></i> Edit
                            </button>
                        </div>
                        <div className="col-3">
                            <button id="delete-institution" type="button"
                                    className="btn btn-sm btn-outline-danger btn-block mt-0"
                                    onClick={deleteInstitution}>
                                <i className="fa fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    </div>
                );
            }
        }
    }

    renderHeader(institutionId) {

        if (institutionId > 0) {
            return (
                <h2 className="header">
                    <span>Edit  Institution</span>
                </h2>

            );
        }
        else if (institutionId == 0) {
            return (
                <h2 className="header">
                    <span>Create New Institution</span>
                </h2>
            );
        }
    }

    renderButtons(institutionId, institution, pageMode, togglePageMode, cancelChanges) {
        if (pageMode == 'edit' && institutionId == 0) {
            return (
                <button id="create-institution"
                        className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                        onClick={togglePageMode}>
                    <i className="fa fa-plus-square"></i> Create Institution
                </button>
            );
        }
        else if (pageMode == 'edit' && institutionId > 0) {
            return (
                <React.Fragment>
                    <div className="row">
                        <div className="col-6">
                            <button className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                    onClick={togglePageMode}>
                                <i className="fa fa-save"></i> Save Changes
                            </button>
                        </div>
                        <div className="col-6">
                            <button className="btn btn-sm btn-outline-danger btn-block mt-0"
                                    onClick={cancelChanges}>
                                <i className="fa fa-ban"></i> Cancel Changes
                            </button>
                        </div>
                    </div>

                </React.Fragment>

            );
        }
    }

    render() {

        const {institution, documentRoot, institutionId, role, of_users_api_url, storage, isAdmin, details} = this.props;
        let pageMode = this.props.pageMode;
        if (pageMode == "view") {

            if (storage != null && typeof(storage) == "string" && storage == "local") {
                return (<React.Fragment>
                        <div id="institution-details" className="row justify-content-center">
                            <div id="institution-view" className="col-xl-6 col-lg-8 ">
                                <div className="row">
                                    <div className="col-md-3" id="institution-logo-container">
                                        <a href={institution.url}>
                                            <img className="img-fluid" src={documentRoot + "/" + institution.logo}
                                                 alt="logo"/>
                                        </a>
                                    </div>
                                    <h1 className="col-md-9"><a href={institution.url}>{institution.name}</a>
                                    </h1>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <p>{institution.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {this.renderComp(role, pageMode, institution, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)}
                    </React.Fragment>
                );
            }
            else {
                return (<React.Fragment>
                        <div id="institution-details" className="row justify-content-center">
                            <div id="institution-view" className="col-xl-6 col-lg-8 ">
                                <div className="row">
                                    <div className="col-md-3" id="institution-logo-container">
                                        <a href={institution.url}>
                                            <img className="img-fluid"
                                                 src={of_users_api_url + "/group/logo/" + institution.id}
                                                 alt="logo"/>
                                        </a>
                                    </div>
                                    <h1 className="col-md-9"><a href={institution.url}>{institution.name}</a>
                                    </h1>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <p>{institution.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {this.renderComp(role, pageMode, institution, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)}
                    </React.Fragment>
                );
            }

        }
        else if (pageMode == 'edit') {
            return (
                <div id="institution-details" className="row justify-content-center">
                    <div id="institution-edit" className="col-xl-6 col-lg-6 border pb-3 mb-2">
                        <form>
                            <React.Fragment>{this.renderHeader(institutionId)}</React.Fragment>
                            <div className="form-group">
                                <label id="institution-name" htmlFor="institution-details-name">Name</label>
                                <input id="institution-details-name" className="form-control mb-1 mr-sm-2"
                                       type="text" defaultValue={institution.name} onChange={this.props.handleChange}/>
                            </div>
                            <div className="form-group">
                                <label id="institution-url" htmlFor="institution-details-url">URL</label>
                                <input id="institution-details-url" type="text" className="form-control mb-1 mr-sm-2"
                                       defaultValue={institution.url} onChange={this.props.handleChange}/>
                            </div>
                            <div className="form-group">
                                <label id="institution-logo-selector" htmlFor="institution-logo">Logo</label>
                                <input id="institution-logo" className="form-control mb-1 mr-sm-2" type="file"
                                       accept="image/*"/>
                            </div>
                            <div className="form-group">
                                <label id="institution-description"
                                       htmlFor="institution-details-description">Description</label>
                                <textarea id="institution-details-description" className="form-control"
                                          rows="4"
                                          onChange={this.props.handleChange}>{institution.description}</textarea>
                            </div>

                            {this.renderButtons(institutionId, institution, pageMode, this.props.togglePageMode, this.props.cancelChanges)}


                        </form>
                    </div>
                </div>
            );
        }
    }
}

class ImageryList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imagery: this.props.imagery,
            institutionId: this.props.institutionId,
            documentRoot: this.props.documentRoot,
            imageryMode: "view",
            newImageryTitle: "",
            newImageryAttribution: "",
            newGeoServerURL: "",
            newLayerName: "",
            newGeoServerParams: "",
        }
        this.toggleImageryMode = this.toggleImageryMode.bind(this);
        this.addCustomImagery = this.addCustomImagery.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.deleteImagery = this.deleteImagery.bind(this);
        this.getUsers = this.getUsers.bind(this);
    };


    getUsers() {
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId)
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));

    }

    addCustomImagery(getUsers) {
        let newImageryTitle = this.state.newImageryTitle;
        let details = this.props.details;
        let institutionId = this.props.institutionId;
        let documentRoot = this.state.documentRoot;
        const institution = this.props.institution;
        $.ajax({
            url: this.props.documentRoot + "/add-institution-imagery",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                institutionId: this.props.institutionId,
                imageryTitle: this.state.newImageryTitle,
                imageryAttribution: this.state.newImageryAttribution,
                geoserverURL: this.state.newGeoServerURL,
                layerName: this.state.newLayerName,
                geoserverParams: this.state.newGeoServerParams
            })
        }).fail(function () {
            alert("Error adding custom imagery to institution. See console for details.");

        }).done(function (data) {
                alert("Imagery " + newImageryTitle + " has been added to institution " + institution.name + ".");
                getUsers();

            }
        );


        this.setState({newImageryTitle: ""});
        this.setState({newImageryAttribution: ""});
        this.setState({newGeoServerURL: ""});
        this.setState({newLayerName: ""});
        this.setState({newGeoServerParams: ""});
    }

    toggleImageryMode(imageryMode) {
        if (imageryMode == "view") {
            this.setState({imageryMode: "edit"});
        } else {
            this.addCustomImagery(this.getUsers);
            this.setState({imageryMode: "view"});
        }
    }

    deleteImagery(documentRoot, imageryId, name, institutionId, getUsers) {
        if (confirm("Do you REALLY want to delete this imagery?!")) {
            $.ajax({
                url: documentRoot + "/delete-institution-imagery",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
                data: JSON.stringify({
                    institutionId: institutionId,
                    imageryId: imageryId
                })
            }).fail(function () {
                alert("Error deleting imagery from institution. See console for details.");
            }).done(function (data) {
                alert("Imagery " + imageryId + " has been deleted from institution " + name + ".");
                getUsers();
            });
        }
    }

    cancelAddCustomImagery() {
        this.setState({imageryMode: "view"});
    }

    handleChange(event) {
        const target = event.target;
        const value = target.value;
        const name = target.id;
        this.setState({
            [name]: value
        });
    }

    render() {
        const institution = this.props.institution;
        const isAdmin = this.props.isAdmin;
        const imageryMode = this.state.imageryMode;
        if (this.props.imagery.length > 0) {
            if (imageryMode == 'view') {

                return (
                    <React.Fragment>

                        <ImageryButton institution={institution}
                                       toggleImageryMode={() => this.toggleImageryMode(imageryMode)}
                                       isAdmin={isAdmin}/>

                        {
                            this.props.imagery.map(
                                imageryItem => <Imagery institution={institution} title={imageryItem.title}
                                                        imageryId={imageryItem.id} isAdmin={isAdmin}
                                                        deleteImagery={() => this.deleteImagery(this.props.documentRoot, imageryItem.id, this.props.institution.name, this.props.institutionId, this.getUsers)}/>
                            )
                        }
                    </React.Fragment>

                );


            }
            else if (isAdmin == true && imageryMode == 'edit') {
                return (
                    <div className="row" id="add-imagery">
                        <div className="col">
                            <form className="mb-2 p-2 border rounded">
                                <div className="form-group">
                                    <label htmlFor="newImageryTitle">Title</label>
                                    <input className="form-control" id="newImageryTitle" type="text"
                                           name="imagery-title" autoComplete="off"
                                           onChange={this.handleChange} defaultValue={this.state.newImageryTitle}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newImageryAttribution">Attribution</label>
                                    <input className="form-control" id="newImageryAttribution" type="text"
                                           name="imagery-attribution" autoComplete="off"
                                           onChange={this.handleChange}
                                           defaultValue={this.state.newImageryAttribution}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerURL">GeoServer URL</label>
                                    <input className="form-control" id="newGeoServerURL" type="text"
                                           name="imagery-geoserver-url" autoComplete="off"
                                           onChange={this.handleChange} defaultValue={this.state.newGeoServerURL}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newLayerName">GeoServer Layer Name</label>
                                    <input className="form-control" id="newLayerName" type="text"
                                           name="imagery-layer-name" autoComplete="off"
                                           onChange={this.handleChange} defaultValue={this.state.newLayerName}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerParams">GeoServer Params<br/>(as JSON string)</label>
                                    <input className="form-control" id="newGeoServerParams" type="text"
                                           name="imagery-geoserver-params" autoComplete="off"
                                           onChange={this.handleChange} defaultValue={this.state.newGeoServerParams}/>
                                </div>
                                <div className="btn-group-vertical btn-block">
                                    <button id="add-imagery-button"
                                            className="btn btn-sm btn-block btn-outline-yellow btn-group"
                                            onClick={() => this.toggleImageryMode(imageryMode)}>
                                        <i className="fa fa-plus-square"></i> Add New Imagery
                                    </button>
                                    <button className="btn btn-sm btn-block btn-outline-danger btn-group"
                                            onClick={() => this.cancelAddCustomImagery}>Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            }

        }
        else {
            return (<span></span>);
        }
    }
}

function Imagery(props) {
    if (props.isAdmin == false) {
        return (
            <div className="row mb-1">
                <div className="col mb-1">
                    <button className="btn btn-outline-lightgreen btn-sm btn-block">{props.title}</button>
                </div>
            </div>
        );
    }
    else {
        return (
            <div className="row mb-1">
                <div className="col-10 pr-1">
                    <button className="btn btn-outline-lightgreen btn-sm btn-block">{props.title}</button>
                </div>


                <div className="col-2 pl-0">
                    <button className="btn btn-outline-danger btn-sm btn-block" id="delete-imagery" type="button"
                            onClick={props.deleteImagery}>
                        <span className="d-none d-xl-block"> Delete </span>
                        <span className="d-xl-none"><i className="fa fa-trash-alt"></i></span>
                    </button>
                </div>
            </div>

        );
    }
}

function ImageryButton(props) {
    if (props.isAdmin == true) {
        return (
            <div className="row">
                <div className="col-lg-12 mb-1">

                    <button type="button" id="add-imagery-button"
                            className="btn btn-sm btn-block btn-outline-yellow"
                            onClick={props.toggleImageryMode}>
                        <i className="fa fa-plus-square"></i>Add New Imagery
                    </button>

                </div>
            </div>
        );
    }
    else {
        return (
            <span></span>
        );
    }
}

class ProjectList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: this.props.projects,
        };
        this.createProject = this.createProject.bind(this);
    }

    createProject() {
        if (this.props.institutionId == 0) {
            alert("Please finish creating the institution before adding projects to it.");
        } else if (this.props.institutionId == -1) {
            alert("Projects cannot be created without first selecting an institution.");
        } else {
            window.location = this.props.documentRoot + "/project/0?institution=" + this.props.institutionId;
        }
    };

    render() {
        const institution = this.props.institution;

        if (this.props.projects.length > 0) {
            if (this.props.isAdmin == true) {
                return (
                    <React.Fragment>
                        <ProjectButton createProject={this.createProject}/>

                        {
                            this.props.projects.map(project => <Project documentRoot={this.props.documentRoot}
                                                                        proj={project}
                                                                        institution={institution}
                                                                        isAdmin={this.props.isAdmin}/>)
                        }

                    </React.Fragment>
                );
            }
            else {
                return (
                    <React.Fragment>
                        {
                            this.props.projects.map(project => <Project documentRoot={this.props.documentRoot}
                                                                        proj={project}
                                                                        institution={institution}
                                                                        isAdmin={this.props.isAdmin}/>)
                        }
                    </React.Fragment>
                );
            }
        }
        else return (<span></span>);
    }
}

function Project(props) {

    const documentRoot = props.documentRoot;
    const project = props.proj;
    const institution = props.institution;
    if (props.isAdmin == true) {
        return (
            <div className="row mb-1">
                <div className="col-9 pr-1">
                    <a className="btn btn-sm btn-outline-lightgreen btn-block"
                       href={documentRoot + "/collection/" + project.id}>
                        {project.name}
                    </a>
                </div>
                <div className="col-3 pl-0">
                    <a className="btn btn-sm btn-outline-lightgreen btn-block"
                       href={documentRoot+"/project/"+ project.id }>
                        <span className="d-xl-none"><i className="fa fa-edit"></i></span><span
                        className="d-none d-xl-block"> Review</span></a>
                </div>
            </div>
        );
    } else {
        return (
            <div className="row">
                <div className="col mb-1 pr-1">
                    <a className="btn btn-sm btn-outline-lightgreen btn-block"
                       href={documentRoot + "/collection/" + project.id}>
                        {project.name}
                    </a>
                </div>
            </div>

        );
    }
}

function ProjectButton(props){
    return(
        <div className="row mb-1">
            <div className="col">
                <button id="create-project" type="button" className="btn btn-sm btn-block btn-outline-yellow"
                        onClick={props.createProject}>
                    <i className="fa fa-plus-square"></i> Create New Project
                </button>
            </div>
        </div>
    );
}

class UserList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            users: this.props.users,
            institutionId: this.props.institutionId,
            isAdmin: this.props.isAdmin,
            pageMode: this.props.pageMode,
        };
        this.updateUserInstitutionRole = this.updateUserInstitutionRole.bind(this);
    };


    updateUserInstitutionRole(userId, email, role) {

        let userOldId = this.props.userId;
        let isAdmin = this.props.isAdmin;
        let documentRoot = this.props.documentRoot;
        $.ajax({
            url: documentRoot + "/update-user-institution-role",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify
            ({
                    userId: userId,
                    institutionId: this.props.institutionId,
                    role: role
                }
            )
        }).fail(function () {
            alert("Error updating user institution role. See console for details.");

        }).done(function (data) {
            alert("User " + email + " has been given role '" + role + "'.");
            if (userId == userOldId && role != "admin") {
                pageMode = "view";
                isAdmin = false;
            }


        });
        //get users
        fetch(documentRoot + "/get-all-users?institutionId=" + this.props.institutionId)
            .then(response => response.json())
            .then(data => this.setState({users: data}));
        this.setState({pageMode: pageMode});
        this.setState({isAdmin: isAdmin});
    }

    render() {
        return (
            <React.Fragment>
                <UserButton userId={this.props.userId} documentRoot={this.props.documentRoot}
                            institutionId={this.props.institutionId} institution={this.props.institution}
                            isAdmin={this.props.isAdmin} users={this.props.users}
                            updateUserInstitutionRole={() => this.updateUserInstitutionRole}/>

                {
                    this.props.users.map(user => <User documentRoot={this.props.documentRoot} user={user}
                                                       institution={this.props.institution} isAdmin={this.state.isAdmin}
                                                       pageMode={this.state.pageMode}
                                                       updateUserInstitutionRole={() => this.updateUserInstitutionRole(user.id, user.email, document.getElementsByName("user-institution-role")[0].options[document.getElementsByName("user-institution-role")[0].selectedIndex].value)}/>
                    )}
            </React.Fragment>
        );
    }
}


function User(props) {
    const user = props.user;
    const documentRoot = props.documentRoot;

    if (props.isAdmin == false && user.institutionRole != 'pending') {
        return (
            <div className="row">

            <div className="col mb-1">
                <a className="btn btn-sm btn-outline-lightgreen btn-block"
                   href={documentRoot + "/account/" + user.id}>{user.email}</a>
            </div>
            </div>
        );
    }
    if (props.isAdmin == true) {
        return (
            <React.Fragment>
                <div className="row">

                    <div className="col-lg-9 mb-1 pr-1">
                        <a className="btn btn-sm btn-outline-lightgreen btn-block"
                           href={documentRoot + "/account/" + user.id}>{user.email}</a>
                    </div>
                    <div className="col-lg-3 mb-1 pl-0">
                        <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                                onChange={props.updateUserInstitutionRole}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="not-member">Remove</option>
                        </select>
                    </div>
                </div>
            </React.Fragment>
        );
    }
    else if (props.isAdmin == true && user.institutionRole == 'pending') {
        return (
            <React.Fragment>
                <div className="row">

                <div className="col-lg-9 mb-1 pr-1">
                    <a className="btn btn-sm btn-outline-lightgreen btn-block"
                       href={documentRoot + "/account/" + user.id}>{user.email}</a>
                </div>
                <div className="col-lg-3 mb-1 pl-0">
                    <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                            onChange={props.updateUserInstitutionRole}>
                        <option value="pending">Pending</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="not-member">Remove</option>
                    </select>
                </div>
                </div>
            </React.Fragment>
        );
    }
    else {
        return (<span></span>);
    }
}

class UserButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newUserEmail: "",
            userList: this.props.users,
            userListComplete: [],
        };
        this.addUser = this.addUser.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.isInstitutionMember = this.isInstitutionMember.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        const target = event.target;
        const value = target.value;
        this.setState({
            newUserEmail: value
        });
    }

    componentDidMount() {
        fetch(this.props.documentRoot + "/get-all-users")
            .then(response => response.json())
            .then(data => this.setState({userListComplete: data}));
    }

    addUser() {

        if (this.state.newUserEmail == "") {
            alert("Please enter an existing user's email address.");
        } else if (this.findUserByEmail(this.props.users, this.state.newUserEmail)) {
            alert(this.state.newUserEmail + " is already a member of this institution.");
        } else {
            let newUser = this.findUserByEmail(this.state.userListComplete, this.state.newUserEmail);
            if (newUser) {
                this.props.updateUserInstitutionRole(newUser.id, newUser.email, "member");
                this.setState({newUserEmail: ""});
            } else {
                alert(this.state.newUserEmail + " is not an existing user's email address.");
            }
        }
    }

    findUserByEmail(userList, email) {
        return userList.find(
            function (user) {
                return user.email == email;
            }
        );
    }

    isInstitutionMember(userId) {
        return userId == 1
            || this.props.users.some(
                function (user) {
                    return user.id == userId;
                }
            );
    }

    requestMembership(userId, institutionId, documentRoot) {
        $.ajax({
            url: documentRoot + "/request-institution-membership",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify
            ({
                    institutionId: institutionId,
                    userId: parseInt(userId)
                }
            )
        }).fail(function () {
            alert("Error requesting institution membership. See console for details.");
        }).done(function (data) {
            alert("Membership requested for user " + userId + ".");
            utils.disable_element("request-membership-button");

        });
    }

    render() {
        const institution = this.props.institution;
            if (this.props.isAdmin == true && this.props.users.length>0) {
                return (
                    <React.Fragment>
                        <div className="row mb-1">
                            <div className="col-9 pr-1">
                                <input className="form-control form-control-sm" type="email" name="new-institution-user"
                                       autoComplete="off"
                                       placeholder="Email" onChange={this.handleChange}
                                       defaultValue={this.state.newUserEmail}/>
                            </div>
                            <div className="col-3 pl-0">
                                <button className="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user"
                                        onClick={this.addUser}><span className="d-xl-none">
                            <i className="fa fa-plus-square"></i></span>
                                    <span className="d-none d-xl-block"> Add User</span></button>

                            </div>
                        </div>
                    </React.Fragment>
                );
            }
            else return (<span></span>);
            if (this.props.userId != '' && this.props.institutionId > 0 && !this.isInstitutionMember(this.props.userId)) {
                return (

                    <React.Fragment>
                        <div>
                            <button className="btn btn-sm btn-outline-yellow btn-block mb-2"
                                    id="request-membership-button"
                                    name="request-membership-button"
                                    onClick={this.requestMembership(this.props.userId, this.props.institutionId, this.props.documentRoot)}>
                                <i className="fa fa-plus-square"></i> Request membership
                            </button>

                        </div>
                    </React.Fragment>
                );
            }

    }
}

function renderInstitution(documentRoot, userId, institutionId,of_users_api_url,role,storage,nonPendingUsers,pageMode) {
    ReactDOM.render(
        <Institution documentRoot={documentRoot} userId={userId} institutionId={institutionId} of_users_api_url={of_users_api_url} role={role} storage={storage} nonPendingUsers={nonPendingUsers} pageMode={pageMode}/>,
        document.getElementById("institution")
    );
}
