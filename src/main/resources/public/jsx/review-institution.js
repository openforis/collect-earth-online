import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import InstitutionEditor from "./components/InstitutionEditor";
import { sortAlphabetically, capitalizeFirst } from "./utils/textUtils.js";

class ReviewInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageryCount: 0,
            usersCount: 0,
            projectList: [],
            isAdmin: false,
        };
    }

    componentDidMount() {
        // Load the projectList
        this.getProjectList();
    }

    getProjectList = () => {
        //get projects
        fetch(this.props.documentRoot + "/get-all-projects?userId="
                + this.props.userId + "&institutionId=" + this.props.institutionId
        )
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                    return new Promise(resolve => resolve([]));
                }
            })
            .then(data => this.setState({ projectList: data }));
    }

    setImageryCount = (newCount) => this.setState({ imageryCount: newCount });

    setUsersCount = (newCount) => this.setState({ usersCount: newCount });

    setIsAdmin = (isAdmin) => this.setState({ isAdmin: isAdmin });

    render() {
        return (
            <div className="ReviewInstitution">
                <InstitutionDescription
                    documentRoot={this.props.documentRoot}
                    institutionId={this.props.institutionId}
                    isAdmin={this.state.isAdmin}
                    of_users_api_url={this.props.of_users_api_url}
                    storage={this.props.storage}
                    setIsAdmin={this.setIsAdmin}
                    userId={this.props.userId}
                />
                <div className="row">
                    <div className="col-lg-3 col-xs-12">
                        <h2 className="header">
                            Imagery
                            <span className="badge badge-pill badge-light ml-2">
                                {this.state.imageryCount}
                            </span>
                        </h2>
                        <ImageryList
                            documentRoot={this.props.documentRoot}
                            isAdmin={this.state.isAdmin}
                            institutionId={this.props.institutionId}
                            setImageryCount={this.setImageryCount}
                        />
                    </div>
                    <div className="col-lg-5 col-xs-12">
                        <h2 className="header">
                            Projects
                            <span className="badge badge-pill badge-light ml-2">
                                {this.state.projectList.length}
                            </span>
                        </h2>
                        <ProjectList
                            documentRoot={this.props.documentRoot}
                            isAdmin={this.state.isAdmin}
                            institutionId={this.props.institutionId}
                            projectList={this.state.projectList}
                        />
                    </div>
                    <div className="col-lg-4 col-xs-12">
                        <h2 className="header">
                            Users
                            <span className="badge badge-pill badge-light ml-2">
                                {this.state.usersCount}
                            </span>
                        </h2>
                        <UserList
                            documentRoot={this.props.documentRoot}
                            institutionId={this.props.institutionId}
                            isAdmin={this.state.isAdmin}
                            setUsersCount={this.setUsersCount}
                            userId={this.props.userId}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

class InstitutionDescription extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutionDetails: {
                id: "-1",
                name: "",
                logo: "",
                url: "",
                description: "",
                admins: [],
            },
            newInstitutionDetails: {
                id: "-1",
                name: "",
                logo: "",
                base64Image: "",
                url: "",
                description: "",
            },
            editMode: false,
        };
    }

    componentDidMount() {
        this.getInstitutionDetails();
    }

    getInstitutionDetails = () => {
        fetch(this.props.documentRoot + "/get-institution-details/" + this.props.institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the institution details. See console for details.");
                    return new Promise(resolve => resolve({
                        id: "-1",
                        name: "",
                        logo: "",
                        url: "",
                        description: "",
                        admins: [],
                    }));
                }
            })
            .then(data =>{
                this.setState({
                    institutionDetails: data,
                    newInstitutionDetails: {
                        id: data.id,
                        name: data.name,
                        url: data.url,
                        description: data.description,
                        logo: "",
                        base64Image: "",
                    },
                });
                this.props.setIsAdmin(this.props.userId > 0 && data.admins.includes(this.props.userId));
            });
    };

    updateInstitution = () => {
        fetch(this.props.documentRoot + "/update-institution/" + this.props.institutionId,
              {
                  method: "POST",
                  body: JSON.stringify({
                      name: this.state.newInstitutionDetails.name,
                      logo: this.state.newInstitutionDetails.logo,
                      base64Image: this.state.newInstitutionDetails.base64Image,
                      url: this.state.newInstitutionDetails.url,
                      description: this.state.newInstitutionDetails.description,
                  }),
              }
        )
            .then(response => {
                if (response.ok) {
                    this.getInstitutionDetails();
                    this.setState({ editMode: false });
                } else {
                    console.log(response);
                    alert("Error updating institution details. See console for details.");
                }
            });
    };

    toggleEditMode = () => this.setState({ editMode: !this.state.editMode });

    updateNewInstitutionDetails = (key, newValue) => this.setState({
        newInstitutionDetails: {
            ...this.state.newInstitutionDetails,
            [key]: newValue,
        },
    });

    deleteInstitution = () => {
        if (confirm("Do you REALLY want to delete this institution?")) {
            fetch(this.props.documentRoot + "/archive-institution/" + this.props.institutionId,
                  {
                      method: "POST",
                      headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json",
                      },
                  }
            )
                .then(response => {
                    if (response.ok) {
                        alert("Institution " + this.state.institutionDetails.name + " has been deleted.");
                        window.location = this.props.documentRoot + "/home";
                    } else {
                        console.log(response);
                        alert("Error deleting institution. See console for details.");
                    }
                });
        }
    };

    renderEditButtonGroup = () => <div className="row">
        <div className="col-6">
            <button
                type="button"
                className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                onClick={this.updateInstitution}
            >
                <i className="fa fa-save mr-1"/>Save Changes
            </button>
        </div>
        <div className="col-6">
            <button
                type="button"
                className="btn btn-sm btn-outline-danger btn-block mt-0"
                onClick={this.toggleEditMode}
            >
                <i className="fa fa-ban mr-1"/>Cancel Changes
            </button>
        </div>
    </div>;

    render() {
        const { documentRoot, of_users_api_url, storage } = this.props;
        return this.state.editMode
        ?
            <InstitutionEditor
                title="Create New Institution"
                name={this.state.newInstitutionDetails.name}
                url={this.state.newInstitutionDetails.url}
                description={this.state.newInstitutionDetails.description}
                buttonGroup={this.renderEditButtonGroup}
                setInstituionDetails={this.updateNewInstitutionDetails}
            />
        :
            <div id="institution-details" className="row justify-content-center">
                <div id="institution-view" className="col-xl-6 col-lg-8 ">
                    <div className="row mb-4">
                        <div className="col-md-3" id="institution-logo-container">
                            <a href={this.state.institutionDetails.url}>
                                <img
                                    className="img-fluid"
                                    src={storage !== null && storage === "local"
                                    ? documentRoot + "/" + this.state.institutionDetails.logo
                                    : of_users_api_url + "/group/logo/" + this.state.institutionDetails.id}
                                    alt="logo"
                                />
                            </a>
                        </div>
                        <div className="col-md-9">
                            <h1>
                                <a href={this.state.institutionDetails.url}>
                                    {this.state.institutionDetails.name}
                                </a>
                            </h1>
                            <hr />
                            <p className="pt-2" style={{ textIndent: "25px" }}>
                                {this.state.institutionDetails.description}
                            </p>
                        </div>
                    </div>
                    {this.props.isAdmin &&
                    <div className="row justify-content-center mb-2" id="institution-controls">
                        <div className="col-6">
                            <button
                                id="edit-institution"
                                type="button"
                                className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                onClick={this.toggleEditMode}
                            >
                                <i className="fa fa-edit mr-1"/>Edit
                            </button>
                        </div>
                        <div className="col-6">
                            <button
                                id="delete-institution"
                                type="button"
                                className="btn btn-sm btn-outline-danger btn-block mt-0"
                                onClick={this.deleteInstitution}
                            >
                                <i className="fa fa-trash-alt mr-1"/>Delete
                            </button>
                        </div>
                    </div>
                    }
                </div>
            </div>;
    }
}

class ImageryList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editMode: false,
            imageryList:[],
        };
    }

    componentDidMount() {
        this.getImageryList();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.imageryList.length !== prevState.imageryList.length) {
            this.props.setImageryCount(this.state.imageryList.length);
        }
    }

    getImageryList = () => {
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.props.institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                    return new Promise(resolve => resolve([]));
                }
            })
            .then(data => this.setState({ imageryList: data }));
    }

    deleteImagery = (imageryId) => {
        if (confirm("Do you REALLY want to delete this imagery?")) {
            fetch(this.props.documentRoot + "/delete-institution-imagery",
                  {
                      method: "POST",
                      body: JSON.stringify({
                          institutionId: this.props.institutionId,
                          imageryId: imageryId,
                      }),
                  }
            )
                .then(response => {
                    if (response.ok) {
                        this.getImageryList();
                        alert("Imagery has been successfully deleted.");
                    } else {
                        console.log(response);
                        alert("Error updating institution details. See console for details.");
                    }
                });
        }
    }

    toggleEditMode = () => this.setState({ editMode: !this.state.editMode });

    updateState = (key, newValue) => this.setState({ [key]: newValue });

    render() {
        const isAdmin = this.props.isAdmin;
        return this.state.imageryList.length === 0
            ? <h3>Loading imagery...</h3>
            : this.state.editMode
                ?
                    <NewImagery
                        addCustomImagery={this.addCustomImagery}
                        getImageryList={this.getImageryList}
                        documentRoot={this.props.documentRoot}
                        institutionId={this.props.institutionId}
                        toggleEditMode={this.toggleEditMode}
                    />
                :
                    <Fragment>
                        {this.props.isAdmin &&
                        <div className="row">
                            <div className="col-lg-12 mb-1">
                                <button
                                    type="button"
                                    id="add-imagery-button"
                                    className="btn btn-sm btn-block btn-outline-yellow py-2 font-weight-bold"
                                    onClick={this.toggleEditMode}
                                >
                                    <i className="fa fa-plus-square mr-1"/>Add New Imagery
                                </button>

                            </div>
                        </div>
                        }
                        {this.state.imageryList.map((imageryItem, uid) =>
                            <Imagery
                                key={uid}
                                title={imageryItem.title}
                                isAdmin={isAdmin}
                                isInstitutionImage={this.props.institutionId === imageryItem.institution}
                                deleteImagery={() => this.deleteImagery(imageryItem.id)}
                            />
                        )}
                    </Fragment>;
    }
}

class NewImagery extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newImageryTitle: "",
            newImageryAttribution: "",
            newGeoServerURL: "",
            newLayerName: "",
            newGeoServerParams: "",
        };
    }

    addCustomImagery = () => {
        fetch(this.props.documentRoot + "/add-institution-imagery",
              {
                  method: "POST",
                  body: JSON.stringify({
                      institutionId: this.props.institutionId,
                      imageryTitle: this.state.newImageryTitle,
                      imageryAttribution: this.state.newImageryAttribution,
                      geoserverURL: this.state.newGeoServerURL,
                      layerName: this.state.newLayerName,
                      geoserverParams: this.state.newGeoServerParams,
                  }),
              })
            .then(response => {
                if (response.ok) {
                    this.props.getImageryList();
                    this.props.toggleEditMode();
                } else {
                    console.log(response);
                    alert("Error adding imagery. See console for details.");
                }
            });

    };

    render() {
        return <div className="row" id="add-imagery">
            <div className="col">
                <div className="mb-2 p-2 border rounded">
                    <div className="mb-3">
                        <label htmlFor="newImageryTitle">Title</label>
                        <input
                            className="form-control"
                            id="newImageryTitle"
                            type="text"
                            autoComplete="off"
                            onChange={e => this.setState({ newImageryTitle: e.target.value })}
                            value={this.state.newImageryTitle}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="newImageryAttribution">Attribution</label>
                        <input
                            className="form-control"
                            id="newImageryAttribution"
                            type="text"
                            autoComplete="off"
                            onChange={e => this.setState({ newImageryAttribution: e.target.value })}
                            value={this.state.newImageryAttribution}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="newGeoServerURL">GeoServer URL</label>
                        <input
                            className="form-control"
                            id="newGeoServerURL"
                            type="text"
                            autoComplete="off"
                            onChange={e => this.setState({ newGeoServerURL: e.target.value })}
                            value={this.state.newGeoServerURL}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="newLayerName">GeoServer Layer Name</label>
                        <input
                            className="form-control"
                            id="newLayerName"
                            type="text"
                            autoComplete="off"
                            onChange={e => this.setState({ newLayerName: e.target.value })}
                            value={this.state.newLayerName}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="newGeoServerParams">GeoServer Params<br/>(as JSON string)</label>
                        <input
                            className="form-control"
                            id="newGeoServerParams"
                            type="text"
                            autoComplete="off"
                            onChange={e => this.setState({ newGeoServerParams: e.target.value })}
                            value={this.state.newGeoServerParams}
                        />
                    </div>
                    <div className="btn-group-vertical btn-block">
                        <button
                            type="button"
                            id="add-imagery-button"
                            className="btn btn-sm btn-block btn-outline-yellow btn-group py-2 font-weight-bold"
                            onClick={this.addCustomImagery}
                        >
                            <i className="fa fa-plus-square mr-1 mt-1"/>Add New Imagery
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-block btn-outline-danger btn-group py-2 font-weight-bold"
                            onClick={this.props.toggleEditMode}
                        >
                            <i className="fa fa-ban mr-1 mt-1"/>Discard
                        </button>
                    </div>
                </div>
            </div>
        </div>;
    }
}

function Imagery({ isAdmin, title, deleteImagery, isInstitutionImage }) {
    return <div className="row mb-1">
        <div className="col overflow-hidden">
            <button
                type="button"
                className="btn btn-outline-lightgreen btn-sm btn-block text-truncate"
            >
                {title}
            </button>
        </div>
        {(isAdmin && isInstitutionImage) &&
        <div className="pr-3">
            <button
                className="btn btn-outline-danger btn-sm btn-block px-3"
                id="delete-imagery"
                type="button"
                onClick={deleteImagery}
            >
                <i className="fa fa-trash-alt mr-1"/>
            </button>
        </div>
        }
    </div>;
}

function ProjectList ({ isAdmin, institutionId, projectList, documentRoot }) {
    return <Fragment>
        {isAdmin === true &&
            <div className="row mb-1">
                <div className="col">
                    <button
                        id="create-project"
                        type="button"
                        className="btn btn-sm btn-block btn-outline-yellow py-2 font-weight-bold"
                        onClick={() => window.location = documentRoot + "/create-project?institution=" + institutionId}
                    >
                        <i className="fa fa-plus-square mr-1"/>Create New Project
                    </button>
                </div>
            </div>
        }
        {projectList.map((project, uid) =>
            <Project
                key={uid}
                documentRoot={documentRoot}
                project={project}
                isAdmin={isAdmin}
            />)
        }
    </Fragment>;
}

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            boxShadow: "",
        };
    }

    componentDidMount() {
        this.projectHightlight();
    }

    projectHightlight = () => {
        fetch(this.props.documentRoot + "/get-project-stats/" + this.props.project.id)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    return new Promise(resolve => resolve(""));
                }
            })
            .then(data => this.setState({
                boxShadow: data.unanalyzedPlots === 0
                    ? "0px 0px 8px 1px green inset"
                    : (data.flaggedPlots + data.analyzedPlots) > 0
                        ? "0px 0px 8px 1px yellow inset"
                        : "0px 0px 8px 1px red inset",
            }));
    };

    render() {
        const { documentRoot, project, isAdmin } = this.props;
        return <div className="row mb-1 d-flex">
            <div className="col-2 pr-0">
                <div className="btn btn-sm btn-outline-lightgreen btn-block">
                    {capitalizeFirst(project.privacyLevel)}
                </div>
            </div>
            <div className="col overflow-hidden">
                <a
                    className="btn btn-sm btn-outline-lightgreen btn-block text-truncate"
                    href={documentRoot + "/collection/" + project.id}
                    style={{
                        boxShadow: this.state.boxShadow,
                    }}
                >
                    {project.name}
                </a>
            </div>
            {isAdmin === true &&
            <div className="mr-3">
                <a
                    className="edit-project btn btn-sm btn-outline-yellow btn-block px-3"
                    href={documentRoot + "/review-project/" + project.id}
                >
                    <i className="fa fa-edit"></i>
                </a>
            </div>
            }
        </div>;
    }
}

class UserList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutionUserList: [],
            activeUserList: [],
        };
    }

    componentDidMount() {
        this.getActiveUserList();
        this.getInstitutionUserList();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.institutionUserList.length !== prevState.institutionUserList.length) {
            this.props.setUsersCount(
                this.props.isAdmin
                    ? this.state.institutionUserList.length
                    : this.state.institutionUserList.filter(user => user.institutionRole !== "pending").length
            );
        }
    }

    getInstitutionUserList = () => {
        //get users
        fetch(this.props.documentRoot + "/get-institution-users/" + this.props.institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the user list. See console for details.");
                    return new Promise(resolve => resolve([]));
                }
            })
            .then(data => {
                this.setState({
                    institutionUserList: data,
                });
            });
    }

    getActiveUserList = () => {
        fetch(this.props.documentRoot + "/get-all-users")
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the complete user list. See console for details.");
                    return new Promise(resolve => resolve([]));
                }
            })
            .then(data => this.setState({ activeUserList: data }));
    }

    updateUserInstitutionRole = (newUserId, email, role) => {
        fetch(this.props.documentRoot + "/update-user-institution-role",
              {
                  method: "POST",
                  body: JSON.stringify({
                      userId: newUserId,
                      institutionId: this.props.institutionId,
                      role: role,
                  }),
              })
            .then(response => {
                if (response.ok) {
                    alert("User " + email + " has been given role '" + role + "'.");
                    this.getInstitutionUserList();
                } else {
                    console.log(response);
                    alert("Error updating institution details. See console for details.");
                }
            });

    }

    requestMembership = () => {
        fetch(this.props.documentRoot + "/request-institution-membership",
              {
                  method: "POST",
                  body: JSON.stringify({
                      institutionId: this.props.institutionId,
                      userId: this.props.userId,
                  }),
              })
            .then(response => {
                if (response.ok) {
                    alert("Membership requested for user " + this.props.userId + ".");
                    this.getInstitutionUserList();
                } else {
                    console.log(response);
                    alert("Error requesting institution membership. See console for details.");
                }
            });
    }

    currentIsInstitutionMember = () =>
        this.props.userId === 1 || this.state.institutionUserList.some(iu => iu.id === this.props.userId);

    isInstitutionMember = (userEmail) =>
        this.props.userId === 1 || this.state.institutionUserList.some(iu => iu.email === userEmail);

    isActiveUser = (userEmail) => this.state.activeUserList.some(au => au.email === userEmail);

    findUserByEmail = (userEmail) => this.state.activeUserList.find(au => au.email === userEmail);

    render() {
        return (
            <Fragment>
                <NewUserButtons
                    currentIsInstitutionMember={this.currentIsInstitutionMember()}
                    requestMembership={this.requestMembership}
                    isAdmin={this.props.isAdmin}
                    isActiveUser={this.isActiveUser}
                    isInstitutionMember={this.isInstitutionMember}
                    findUserByEmail={this.findUserByEmail}
                    updateUserInstitutionRole={this.updateUserInstitutionRole}
                    userId={this.props.userId}
                />
                {this.props.userId > 0 &&
                    this.state.institutionUserList
                        .filter(iu => this.props.isAdmin || iu.institutionRole !== "pending")
                        .sort((a, b) => sortAlphabetically(a.email, b.email))
                        .sort((a, b) => sortAlphabetically(a.institutionRole, b.institutionRole))
                        .map((iu, uid) =>
                            <User
                                key={uid}
                                documentRoot={this.props.documentRoot}
                                user={iu}
                                isAdmin={this.props.isAdmin}
                                updateUserInstitutionRole={this.updateUserInstitutionRole}
                            />
                        )
                }
            </Fragment>
        );
    }
}

function User ({ user, documentRoot, isAdmin, updateUserInstitutionRole }) {
    return (
        <div className="row">
            {!isAdmin &&
                <div className="col-2 mb-1 pr-0">
                    <div className="btn btn-sm btn-outline-lightgreen btn-block">
                        {capitalizeFirst(user.institutionRole)}
                    </div>
                </div>
            }
            <div className="col mb-1 overflow-hidden">
                <a
                    className="btn btn-sm btn-outline-lightgreen btn-block text-truncate"
                    href={documentRoot + "/account/" + user.id}
                >{user.email}</a>
            </div>
            {isAdmin &&
                <div className="col-lg-3 mb-1 pl-0">
                    <select
                        value={user.institutionRole}
                        className="custom-select custom-select-sm"
                        size="1"
                        onChange={e => updateUserInstitutionRole(user.id, user.email, e.target.value)}
                    >
                        {user.institutionRole === "pending" && <option value="pending">Pending</option>}
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="not-member">Remove</option>
                    </select>
                </div>
            }
        </div>
    );
}

class NewUserButtons extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newUserEmail:"",
        };
    }

    checkUserEmail = () => {
        if (this.state.newUserEmail === "") {
            alert("Please enter an existing user's email address.");
            return false;
        } else if (this.props.isInstitutionMember(this.state.newUserEmail)) {
            alert(this.state.newUserEmail + " is already a member of this institution.");
            return false;
        } else if (!this.props.isActiveUser(this.state.newUserEmail)) {
            alert(this.state.newUserEmail + " is not an existing user's email address.");
            return false;
        } else {
            return true;
        }
    }

    addUser = () => {
        this.props.updateUserInstitutionRole(
            this.props.findUserByEmail(this.state.newUserEmail).id,
            this.state.newUserEmail,
            "member"
        );
    }

    render() {
        return <Fragment>
            {this.props.isAdmin &&
                <div className="row mb-1">
                    <div className="col-9 pr-3">
                        <input
                            className="form-control form-control-sm py-2"
                            type="email"
                            autoComplete="off"
                            placeholder="Email"
                            onChange={e => this.setState({ newUserEmail: e.target.value })}
                            value={this.state.newUserEmail}
                        />
                    </div>
                    <div className="col-3 pl-0">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-yellow btn-block py-2 font-weight-bold"
                            onClick={() => this.checkUserEmail() && this.addUser()}
                        >
                            <i className="fa fa-plus-square mr-1"/>Add User
                        </button>
                    </div>
                </div>
            }
            {(this.props.userId > 0 && !this.props.currentIsInstitutionMember) &&
            <div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-yellow btn-block mb-2"
                    id="request-membership-button"
                    onClick={this.props.requestMembership}
                >
                    <i className="fa fa-plus- mr-1"/>Request membership
                </button>
            </div>
            }
        </Fragment>;
    }
}

export function renderReviewInstitutionPage(args) {
    ReactDOM.render(
        <ReviewInstitution
            documentRoot={args.documentRoot}
            userId={args.userId === "" ? -1 : parseInt(args.userId)}
            institutionId={args.institutionId === "" ? -1 : parseInt(args.institutionId)}
            of_users_api_url={args.of_users_api_url}
            storage={args.storage}
        />,
        document.getElementById("institution")
    );
}
