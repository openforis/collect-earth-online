import React from 'react';
import ReactDOM from 'react-dom';
import { utils } from "../js/utils.js";

class Institution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pageMode: "view",
            details: {
                id: "-1",
                name: "",
                logo: "",
                url: "",
                description: "",
                admins: []
            },
            isAdmin: false,
            projectList: [],
            userList: [],
            userListComplete: [],
            imageryList: [],
            newUserEmail: "",
            nonPendingUsers: 0,
            imageryMode: "view",
            newImageryTitle: "",
            newImageryAttribution: "",
            newGeoServerURL: "",
            newLayerName: "",
            newGeoServerParams: "",
            userId: props.userId,
            documentRoot: props.documentRoot,
            institutionId: props.institutionId,
            of_users_api_url: props.of_users_api_url,
            role: props.role,
            storage: props.storage,
            institution: [],
            imagery: [],
            projects: [],
            users: [],
        };
        this.isInstitutionMember=this.isInstitutionMember.bind(this);
        this.togglePageMode=this.togglePageMode.bind(this);
        this.handleChange=this.handleChange.bind(this);
        this.deleteInstitution=this.deleteInstitution.bind(this);
        this.toggleImageryMode=this.toggleImageryMode.bind(this);
        this.handleChangeImagery=this.handleChangeImagery.bind(this);
        this.handleChangeUser=this.handleChangeUser.bind(this);
        this.createProject=this.createProject.bind(this);
        this.addUser=this.addUser.bind(this);
        this.updateUserInstitutionRole=this.updateUserInstitutionRole.bind(this);
        this.deleteImagery=this.deleteImagery.bind(this);
        this.requestMembership=this.requestMembership.bind(this);
    };

    componentDidMount() {
        this.initialize(this.props.documentRoot, this.props.userId, this.props.institutionId);
    }

    getInstitutionDetails(institutionId) {
        var ref=this;
        //get institutions
        fetch(this.state.documentRoot + "/get-institution-details/" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the institution details. See console for details.");
                }
            })
            .then(data => {
                this.setState({details: data});
                if (ref.props.userId != "") {
                    ref.setState({isAdmin : this.state.details.admins.includes(parseInt(ref.props.userId))});
                }
            });
    }

    getProjectList(userId, institutionId) {
        //get projects
        fetch(this.state.documentRoot + "/get-all-projects?userId=" + userId + "&institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            }).then(data => this.setState({projects: data}));
    }

    getUserList(institutionId) {
        //get users
        fetch(this.state.documentRoot + "/get-all-users?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the user list. See console for details.");
                }
            })
            .then(data => {
                this.setState({users: data});
                let count = this.state.users.filter(
                    function (user) {
                        return user.institutionRole != "pending";
                    }
                ).length;
                this.setState({nonPendingUsers: count});
            });
    }

    getUserListComplete() {
        //get users complete list
        fetch(this.state.documentRoot + "/get-all-users")
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the complete user list. See console for details.");
                }
            })
            .then(data => this.setState({userListComplete: data}));
    }

    getImageryList(institutionId) {
        //get imagery
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => this.setState({imagery: data}));
    }

    initialize(documentRoot, userId, institutionId) {
        // Make the current documentRoot, userId, and institution id globally available
        let detailsNew = this.state.details;
        detailsNew.id = institutionId;
        this.setState({details: detailsNew});

        // If in Create Institution mode, show the institution editing view. Otherwise, load and show the institution details
        if (this.state.details.id == "0") {
            this.setState({pageMode: "edit"});
        } else {
            this.getInstitutionDetails(this.state.details.id);

            // Load the projectList
            this.getProjectList(this.state.userId, this.state.details.id);

            // Load the userList
            this.getUserList(this.state.details.id);

            // Load the complete userList
            this.getUserListComplete();

            // Load the imageryList
            this.getImageryList(this.state.details.id);
        }
    }

    updateInstitution() {
        var formData = new FormData();
        formData.append("userid", this.props.userId);
        formData.append("institution-name", this.state.details.name);
        formData.append("institution-logo", document.getElementById("institution-logo").files[0]);
        formData.append("institution-url", this.state.details.url);
        formData.append("institution-description", this.state.details.description);
        let documentRoot = this.state.documentRoot;
        let institutionId = this.props.institutionId;
        var holdRef = this;
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
            if (holdRef.state.details.id == 0) {
                window.location = documentRoot + "/institution/" + parsedData.id;
            } else {
                let detailsNew = holdRef.state.details;
                detailsNew.id = parsedData.id;
                if (parsedData.logo != "") {
                    detailsNew.logo = parsedData.logo;
                }
                holdRef.setState({details: detailsNew});
                holdRef.setState({isAdmin: true});
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

    cancelChanges() {
        this.setState({pageMode: "view"});
    }

    deleteInstitution() {
        let name = this.state.details.name;
        let documentRoot = this.props.documentRoot;
        let institutionId = this.state.details.id;

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

    createProject() {
        if (this.state.details.id == 0) {
            alert("Please finish creating the institution before adding projects to it.");
        } else if (this.state.details.id == -1) {
            alert("Projects cannot be created without first selecting an institution.");
        } else {
            window.location = this.props.documentRoot + "/project/0?institution=" + this.state.details.id;
        }
    }

    updateUserInstitutionRole(userId, email, role,e) {
        let documentRoot = this.props.documentRoot;
        let institutionId = this.props.institutionId;

        let ref = this;
        if (e != undefined) {
            role = e.target.value;
        }
        var jsonStr = {
            userId: userId,
            institutionId: this.state.details.id,
            role: role
        };
        $.ajax({
            url: documentRoot + "/update-user-institution-role",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify
            (jsonStr)
        }).fail(function () {
            alert("Error updating user institution role. See console for details.");
        }).done(function (data) {
            alert("User " + email + " has been given role '" + role + "'.");
            if (userId == ref.props.userId && role != "admin") {
                ref.setState({pageMode: "view"});
                ref.setState({isAdmin: false});
            }
             ref.getUserList(institutionId);
        });
    }

    findUserByEmail(userList, email) {
        return userList.find(
            function (user) {
                return user.email == email;
            }
        );
    }

    addUser() {
        if (this.state.newUserEmail == "") {
            alert("Please enter an existing user's email address.");
        } else if (this.findUserByEmail(this.state.users, this.state.newUserEmail)) {
            alert(this.state.newUserEmail + " is already a member of this institution.");
        } else {
            var newUser = this.findUserByEmail(this.state.userListComplete, this.state.newUserEmail);
            if (newUser) {
                this.updateUserInstitutionRole(newUser.id, newUser.email, "member");
                this.setState({newUserEmail: ""});
            } else {
                alert(this.state.newUserEmail + " is not an existing user's email address.");
            }
        }
    }

    isInstitutionMember(userId) {
        return userId == 1
            || this.state.users.some(
                function (user) {
                    return user.id == userId;
                }
            );
    }

    requestMembership() {
        var ref = this;
        $.ajax({
            url: ref.props.documentRoot + "/request-institution-membership",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify
            ({
                    institutionId: ref.state.details.id,
                    userId: parseInt(ref.props.userId)
                }
            )
        }).fail(function () {
            alert("Error requesting institution membership. See console for details.");
        }).done(function (data) {
            alert("Membership requested for user " + ref.props.userId + ".");
            utils.disable_element("request-membership-button");
        });
    }

    deleteImagery(imageryId) {
        if (confirm("Do you REALLY want to delete this imagery?!")) {
            var ref = this;
            const institutionId=this.props.institutionId;
            $.ajax({
                url: ref.props.documentRoot + "/delete-institution-imagery",
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
                alert("Imagery " + imageryId + " has been deleted from institution " + ref.state.details.name + ".");
               ref.getImageryList(institutionId);
            });
        }
    }

    addCustomImagery() {

        let newImageryTitle = this.state.newImageryTitle;
        const institutionId = this.props.institutionId;
        var ref = this;
        $.ajax({
            url: this.props.documentRoot + "/add-institution-imagery",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                institutionId: this.state.details.id,
                imageryTitle: this.state.newImageryTitle,
                imageryAttribution: this.state.newImageryAttribution,
                geoserverURL: this.state.newGeoServerURL,
                layerName: this.state.newLayerName,
                geoserverParams: this.state.newGeoServerParams
            })
        }).fail(function () {
            alert("Error adding custom imagery to institution. See console for details.");
        }).done(function (data) {
                alert("Imagery " + newImageryTitle + " has been added to institution " + ref.state.details.name + ".");
                ref.setState({newImageryTitle: ""});
                ref.setState({newImageryAttribution: ""});
                ref.setState({newGeoServerURL: ""});
                ref.setState({newLayerName: ""});
                ref.setState({newGeoServerParams: ""});
                ref.getImageryList(institutionId);

            }
        );
    }

    toggleImageryMode() {
        if (this.state.imageryMode == "view") {
            this.setState({imageryMode: "edit"});
        } else {
            this.addCustomImagery();
            this.setState({imageryMode: "view"});
        }
    }

    cancelAddCustomImagery() {
        this.setState({imageryMode: "view"});
    }

    handleChangeImagery(event) {
        const target = event.target;
        const value = target.value;
        const name = target.id;
        this.setState({
            [name]: value
        });
    }

    handleChangeUser(event) {
        const target = event.target;
        const value = target.value;
        this.setState({
            newUserEmail: value
        });
    }
    handleChange(event) {
        const target = event.target;
        const value = target.value;
        let detailsNew = this.state.details;
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

    render() {
        const imagery = this.state.imagery;
        const projects = this.state.projects;
        const users = this.state.users;
        const isAdmin = this.state.isAdmin;
        var usersLength=0;
        if(isAdmin){
            usersLength=users.length;
        }
        else usersLength=this.state.nonPendingUsers;
        return (
            <React.Fragment>
                <InstitutionDescription userId={this.props.userId} institution={this.state.institution}
                                        documentRoot={this.props.documentRoot}
                                        of_users_api_url={this.props.of_users_api_url}
                                        institutionId={this.props.institutionId} role={this.state.role}
                                        storage={this.state.storage} pageMode={this.state.pageMode}
                                        details={this.state.details} togglePageMode={this.togglePageMode}
                                        handleChange={this.handleChange} cancelChanges={this.cancelChanges}
                                        deleteInstitution={this.deleteInstitution}/>
                <div className="row">
                    <div id="imagery-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Imagery <span
                            className="badge badge-pill badge-light">{imagery.length}</span>
                        </h2>
                        <ImageryList newImageryTitle={this.state.newImageryTitle}
                                     newImageryAttribution={this.state.newImageryAttribution}
                                     newGeoServerURL={this.state.newGeoServerURL} newLayerName={this.state.newLayerName}
                                     newGeoServerParams={this.state.newGeoServerParams}
                                     cancelAddCustomImagery={this.cancelAddCustomImagery}
                                     handleChangeImagery={this.handleChangeImagery} deleteImagery={this.deleteImagery}
                                     userId={this.props.userId} documentRoot={this.props.documentRoot}
                                     institution={this.state.institution} isAdmin={isAdmin}
                                     institutionId={this.state.institutionId} details={this.state.details}
                                     imagery={imagery} pageMode={this.state.pageMode}
                                     getImageryList={this.getImageryList} imageryMode={this.state.imageryMode}
                                     toggleImageryMode={this.toggleImageryMode}/>
                    </div>
                    <div id="project-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Projects <span
                            className="badge badge-pill  badge-light">{projects.length}</span>
                        </h2>
                        <ProjectList userId={this.props.userId} documentRoot={this.props.documentRoot}
                                     details={this.state.details}
                                     projects={this.state.projects} isAdmin={isAdmin}
                                     institutionId={this.props.institutionId} createProject={this.createProject}/>
                    </div>
                    <div id="user-list" className="col-lg-4 col-xs-12">
                        <h2 className="header">Users <span
                            className="badge badge-pill  badge-light">{usersLength}</span></h2>
                        <UserList userId={this.props.userId} documentRoot={this.props.documentRoot}
                                  institution={this.state.institution}
                                  institutionId={this.props.institutionId} users={this.state.users} isAdmin={isAdmin}
                                  usersCompleteList={this.state.userListComplete}
                                  pageMode={this.state.pageMode} getUsers={this.getUserList} updateUserInstitutionRole={this.updateUserInstitutionRole} handleChangeUser={this.handleChangeUser} addUser={this.addUser} newUserEmail={this.state.newUserEmail}
                                  isInstitutionMember={this.isInstitutionMember} requestMembership={this.requestMembership}/>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

class InstitutionDescription extends React.Component {
    constructor(props) {
        super(props);
    }

    renderComp(role, pageMode, details, isAdmin, togglePageMode, deleteInstitution) {
        if (role != "") {
            if (details.id > 0 && role == "admin" && pageMode == 'view') {
                return (
                    <div className="row justify-content-center mb-2" id="institution-controls">
                        <div className="col-3">
                            <button id="edit-institution" type="button"
                                    className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
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

    renderButtons(institutionId, pageMode, togglePageMode, cancelChanges) {
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

    encodeImageFileAsURL(event) {
        var file = event.target.files[0];
        let reader = new FileReader();
        reader.onloadend = function () {
            let base64Data = reader.result;
            console.log('RESULT', base64Data);
        };
        reader.readAsDataURL(file);
    }

    render() {
        const {documentRoot, institutionId, role, of_users_api_url, storage, isAdmin, details} = this.props;
        let pageMode = this.props.pageMode;
        if (pageMode == "view") {
            if (storage != null && typeof(storage) == "string" && storage == "local") {
                return (<React.Fragment>
                        <div id="institution-details" className="row justify-content-center">
                            <div id="institution-view" className="col-xl-6 col-lg-8 ">
                                <div className="row">
                                    <div className="col-md-3" id="institution-logo-container">
                                        <a href={details.url}>
                                            <img className="img-fluid" src={documentRoot + "/" + details.logo}
                                                 alt="logo"/>
                                        </a>
                                    </div>
                                    <h1 className="col-md-9"><a href={details.url}>{details.name}</a>
                                    </h1>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <p>{details.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {this.renderComp(role, pageMode, details, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)}
                    </React.Fragment>
                );
            }
            else {
                return (<React.Fragment>
                        <div id="institution-details" className="row justify-content-center">
                            <div id="institution-view" className="col-xl-6 col-lg-8 ">
                                <div className="row">
                                    <div className="col-md-3" id="institution-logo-container">
                                        <a href={details.url}>
                                            <img className="img-fluid"
                                                 src={of_users_api_url + "/group/logo/" + details.id}
                                                 alt="logo"/>
                                        </a>
                                    </div>
                                    <h1 className="col-md-9"><a href={details.url}>{details.name}</a>
                                    </h1>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <p>{details.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {this.renderComp(role, pageMode, details, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)}
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
                                       type="text" defaultValue={details.name} onChange={this.props.handleChange}/>
                            </div>
                            <div className="form-group">
                                <label id="institution-url" htmlFor="institution-details-url">URL</label>
                                <input id="institution-details-url" type="text" className="form-control mb-1 mr-sm-2"
                                       defaultValue={details.url} onChange={this.props.handleChange}/>
                            </div>
                            <div className="form-group">
                                <label id="institution-logo-selector" htmlFor="institution-logo">Logo</label>
                                <input id="institution-logo" className="form-control mb-1 mr-sm-2" type="file"
                                       accept="image/*" onChange={this.encodeImageFileAsURL}/>
                            </div>
                            <div className="form-group">
                                <label id="institution-description"
                                       htmlFor="institution-details-description">Description</label>
                                <textarea id="institution-details-description" className="form-control" rows="4"
                                          defaultValue={details.description} onChange={this.props.handleChange}/>
                            </div>
                            {this.renderButtons(institutionId, pageMode, this.props.togglePageMode, this.props.cancelChanges)}
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
    };
    render() {
        const institution = this.props.institution;
        const isAdmin = this.props.isAdmin;
        const imageryMode = this.props.imageryMode;
        if (this.props.imagery.length > 0) {
            if (imageryMode == 'view') {
                return (
                    <React.Fragment>
                        <ImageryButton toggleImageryMode={this.props.toggleImageryMode} isAdmin={isAdmin}/>
                        {
                            this.props.imagery.map(
                                (imageryItem,uid) => <Imagery key={uid} title={imageryItem.title}
                                                              isAdmin={isAdmin}
                                                              deleteImagery={() => this.props.deleteImagery(imageryItem.id)}/>
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
                                           onChange={this.props.handleChangeImagery} defaultValue={this.props.newImageryTitle}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newImageryAttribution">Attribution</label>
                                    <input className="form-control" id="newImageryAttribution" type="text"
                                           name="imagery-attribution" autoComplete="off"
                                           onChange={this.props.handleChangeImagery}
                                           defaultValue={this.props.newImageryAttribution}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerURL">GeoServer URL</label>
                                    <input className="form-control" id="newGeoServerURL" type="text"
                                           name="imagery-geoserver-url" autoComplete="off"
                                           onChange={this.props.handleChangeImagery} defaultValue={this.props.newGeoServerURL}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newLayerName">GeoServer Layer Name</label>
                                    <input className="form-control" id="newLayerName" type="text"
                                           name="imagery-layer-name" autoComplete="off"
                                           onChange={this.props.handleChangeImagery} defaultValue={this.props.newLayerName}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerParams">GeoServer Params<br/>(as JSON string)</label>
                                    <input className="form-control" id="newGeoServerParams" type="text"
                                           name="imagery-geoserver-params" autoComplete="off"
                                           onChange={this.props.handleChangeImagery} defaultValue={this.props.newGeoServerParams}/>
                                </div>
                                <div className="btn-group-vertical btn-block">
                                    <button id="add-imagery-button"
                                            className="btn btn-sm btn-block btn-outline-yellow btn-group"
                                            onClick={() => this.props.toggleImageryMode(imageryMode)}>
                                        <i className="fa fa-plus-square"></i> Add New Imagery
                                    </button>
                                    <button className="btn btn-sm btn-block btn-outline-danger btn-group"
                                            onClick={() => this.props.cancelAddCustomImagery}>Cancel
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
    };

    render() {
        const details = this.props.details;
        if (this.props.isAdmin == true) {
            return (
                <React.Fragment>
                    <ProjectButton createProject={this.props.createProject}/>

                    {
                        this.props.projects.map((project,uid) => <Project key={uid} documentRoot={this.props.documentRoot}
                                                                          proj={project}
                                                                          details={details}
                                                                          isAdmin={this.props.isAdmin}/>)
                    }

                </React.Fragment>
            );
        }
        else {
            return (
                <React.Fragment>
                    {
                        this.props.projects.map((project,uid) => <Project key={uid} documentRoot={this.props.documentRoot}
                                                                          proj={project}
                                                                          details={details}
                                                                          isAdmin={this.props.isAdmin}/>)
                    }
                </React.Fragment>
            );
        }

    }
}

function Project(props) {
    const documentRoot = props.documentRoot;
    const project = props.proj;
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
    };
    render() {
        return (
            <React.Fragment>
                <UserButton userId={this.props.userId} documentRoot={this.props.documentRoot}
                            institutionId={this.props.institutionId} institution={this.props.institution}
                            isAdmin={this.props.isAdmin} users={this.props.users}
                            userListComplete={this.props.userListComplete}
                            updateUserInstitutionRole={this.props.updateUserInstitutionRole} handleChangeUser={this.props.handleChangeUser} newUserEmail={this.props.newUserEmail} addUser={this.props.addUser}
                            isInstitutionMember={this.props.isInstitutionMember} requestMembership={this.props.requestMembership}/>
                {
                    this.props.users.map((user,uid) => <User key={uid} documentRoot={this.props.documentRoot} user={user}
                                                             institution={this.props.institution} isAdmin={this.props.isAdmin} institutionRole={user.institutionRole}
                                                             pageMode={this.props.pageMode}
                                                             updateUserInstitutionRole={this.props.updateUserInstitutionRole}/>
                    )}
            </React.Fragment>
        );
    }
}

class User extends React.Component {
    constructor(props) {
        super(props);
    };
    render() {
        const user = this.props.user;
        const documentRoot = this.props.documentRoot;
        if (this.props.isAdmin == false && user.institutionRole != 'pending') {
            return (
                <div className="row">
                    <div className="col mb-1">
                        <a className="btn btn-sm btn-outline-lightgreen btn-block"
                           href={documentRoot + "/account/" + user.id}>{user.email}</a>
                    </div>
                </div>
            );
        }
        if (this.props.isAdmin == true) {
            if (user.institutionRole == 'pending') {
                return (
                    <React.Fragment>
                        <div className="row">
                            <div className="col-lg-9 mb-1 pr-1">
                                <a className="btn btn-sm btn-outline-lightgreen btn-block"
                                   href={documentRoot + "/account/" + user.id}>{user.email}</a>
                            </div>
                            <div className="col-lg-3 mb-1 pl-0">
                                <select value={user.institutionRole} className="custom-select custom-select-sm"
                                        name="user-institution-role" size="1"
                                        onChange={(e) => this.props.updateUserInstitutionRole(user.id, user.email, user.institutionRole, e)}>
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
                return (
                    <React.Fragment>
                        <div className="row">
                            <div className="col-lg-9 mb-1 pr-1">
                                <a className="btn btn-sm btn-outline-lightgreen btn-block"
                                   href={documentRoot + "/account/" + user.id}>{user.email}</a>
                            </div>
                            <div className="col-lg-3 mb-1 pl-0">
                                <select value={user.institutionRole} className="custom-select custom-select-sm"
                                        name="user-institution-role" size="1"
                                        onChange={(e) => this.props.updateUserInstitutionRole(user.id, user.email, user.institutionRole, e)}>
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="not-member">Remove</option>
                                </select>
                            </div>
                        </div>
                    </React.Fragment>
                );
            }
        }
        else {
            return (<span></span>);
        }
    }
}

class UserButton extends React.Component {
    constructor(props) {
        super(props);
    };
    render() {
        return (
            <React.Fragment>
                <AddUser isAdmin={this.props.isAdmin} handleChangeUser={this.props.handleChangeUser}
                         newUserEmail={this.props.newUserEmail} addUser={this.props.addUser}/>
                <RequestMembership requestMembership={this.props.requestMembership} documentRoot={this.props.documentRoot}
                                   userId={this.props.userId} institutionId={this.props.institutionId}
                                   isInstitutionMember={this.props.isInstitutionMember(this.props.userId)}/>
            </React.Fragment>
        );
    }
}

function AddUser(props){
    if (props.isAdmin == true) {
        return (
            <React.Fragment>
                <div className="row mb-1">
                    <div className="col-9 pr-1">
                        <input className="form-control form-control-sm" type="email" name="new-institution-user"
                               autoComplete="off"
                               placeholder="Email" onChange={props.handleChangeUser}
                               value={props.newUserEmail}/>
                    </div>
                    <div className="col-3 pl-0">
                        <button className="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user"
                                onClick={props.addUser}><span className="d-xl-none">
                            <i className="fa fa-plus-square"></i></span>
                            <span className="d-none d-xl-block"> Add User</span></button>
                    </div>
                </div>
            </React.Fragment>
        );
    }
    else return(<span></span>);
}

function RequestMembership(props) {
    if (props.userId != '' && props.institutionId > 0 && !props.isInstitutionMember) {
        return (
            <React.Fragment>
                <div>
                    <button className="btn btn-sm btn-outline-yellow btn-block mb-2"
                            id="request-membership-button"
                            name="request-membership-button"
                            onClick={() => props.requestMembership(props.userId, props.institutionId, props.documentRoot)}>
                        <i className="fa fa-plus-square"></i> Request membership
                    </button>
                </div>
            </React.Fragment>
        );
    }
    else {
        return (<span></span>);

    }
}

export function renderInstitutionPage(args) {
    ReactDOM.render(
        <Institution documentRoot={args.documentRoot} userId={args.userId} institutionId={args.institutionId}
                     of_users_api_url={args.of_users_api_url} role={args.role} storage={args.storage} nonPendingUsers={args.nonPendingUsers}
                     pageMode={args.pageMode}/>,
        document.getElementById("institution")
    );
}
