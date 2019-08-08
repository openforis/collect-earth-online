import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import InstitutionEditor from "./components/InstitutionEditor";
import { sortAlphabetically, capitalizeFirst, UnicodeIcon } from "./utils/textUtils";

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
        fetch(this.props.documentRoot + "/get-all-projects?institutionId=" + this.props.institutionId
        )
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ projectList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
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
                    ofUsersApiUrl={this.props.ofUsersApiUrl}
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
                            isLoggedIn={this.props.userId > 0}
                        />
                    </div>
                    <div className="col-lg-4 col-xs-12">
                        <h2 className="header">
                            Users
                            <span className="badge badge-pill badge-light ml-2">
                                {this.state.usersCount}
                            </span>
                        </h2>
                        {this.props.userId > 0 &&
                            <UserList
                                documentRoot={this.props.documentRoot}
                                institutionId={this.props.institutionId}
                                isAdmin={this.state.isAdmin}
                                setUsersCount={this.setUsersCount}
                                userId={this.props.userId}
                            />
                        }
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
        fetch(this.props.documentRoot + "/get-institution-details?institutionId=" + this.props.institutionId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
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
            })
            .catch(response => {
                this.setState({
                    institutionDetails: { id: "-1", name: "", logo: "", url: "", description: "", admins: [] },
                    newInstitutionDetails: { id: "-1", name: "", logo: "", url: "", description: "", base64Image: "" },
                });
                this.props.setIsAdmin(false);
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    updateInstitution = () => {
        fetch(this.props.documentRoot + "/update-institution?institutionId=" + this.props.institutionId,
              {
                  method: "POST",
                  body: JSON.stringify(this.state.newInstitutionDetails),
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
        if (confirm("This action will also delete all of the projects associated with this institution.\n\n"
                    + "This action is irreversible.\n\n"
                    + "Do you REALLY want to delete this institution?")) {
            fetch(this.props.documentRoot + "/archive-institution?institutionId=" + this.props.institutionId,
                  {
                      method: "POST",
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

    gotoInstitutionDashboard = () => {
        window.open(this.props.documentRoot + "/institution-dashboard?institutionId=" + this.props.institutionId);
    };

    renderEditButtonGroup = () => <div className="row">
        <div className="col-6">
            <button
                type="button"
                className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                onClick={this.updateInstitution}
            >
                <UnicodeIcon icon="save"/> Save Changes
            </button>
        </div>
        <div className="col-6">
            <button
                type="button"
                className="btn btn-sm btn-outline-danger btn-block mt-0"
                onClick={this.toggleEditMode}
            >
                <UnicodeIcon icon="noAction"/> Cancel Changes
            </button>
        </div>
    </div>;

    render() {
        const { documentRoot, ofUsersApiUrl, storage } = this.props;
        return this.state.editMode
        ?
            <InstitutionEditor
                title="Create New Institution"
                name={this.state.newInstitutionDetails.name}
                url={this.state.newInstitutionDetails.url}
                description={this.state.newInstitutionDetails.description}
                buttonGroup={this.renderEditButtonGroup}
                setInstitutionDetails={this.updateNewInstitutionDetails}
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
                                    : ofUsersApiUrl + "/group/logo/" + this.state.institutionDetails.id}
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
                        <div className="col-3">
                            <button
                                id="edit-institution"
                                type="button"
                                className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                onClick={this.toggleEditMode}
                            >
                                <UnicodeIcon icon="edit"/> Edit
                            </button>
                        </div>
                        <div className="col-3">
                            <button
                                id="delete-institution"
                                type="button"
                                className="btn btn-sm btn-outline-danger btn-block mt-0"
                                onClick={this.deleteInstitution}
                            >
                                <UnicodeIcon icon="trash"/> Delete
                            </button>
                        </div>
                        <div className="col-3">
                            <button
                                id="institution-dashboard"
                                type="button"
                                className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                onClick={this.gotoInstitutionDashboard}
                            >
                                Go to Dashboard
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

    //    Life Cycle Methods    //

    componentDidMount() {
        this.getImageryList();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.imageryList.length !== prevState.imageryList.length) {
            this.props.setImageryCount(this.state.imageryList.length);
        }
    }

    //    Remote Calls    //

    getImageryList = () => {
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.props.institutionId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .catch(response => {
                this.setState({ imageryList: [] });
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

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
                        alert("Error deleting imagery. See console for details.");
                    }
                });
        }
    };

    //    State Modifications    //

    toggleEditMode = () => this.setState({ editMode: !this.state.editMode });

    //    Helper Functions    //

    titleIsTaken = (newTitle) => this.state.imageryList.some(i => i.title === newTitle);

    render() {
        return this.state.imageryList.length === 0
            ? <h3>Loading imagery...</h3>
            : this.state.editMode
                ?
                    <NewImagery
                        documentRoot={this.props.documentRoot}
                        getImageryList={this.getImageryList}
                        institutionId={this.props.institutionId}
                        titleIsTaken={this.titleIsTaken}
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
                                    <UnicodeIcon icon="add" backgroundColor="#f1c00f"/>Add New Imagery
                                </button>

                            </div>
                        </div>
                        }
                        {this.state.imageryList.map((imageryItem, uid) =>
                            <Imagery
                                key={uid}
                                title={imageryItem.title}
                                isAdmin={this.props.isAdmin}
                                isInstitutionImage={this.props.institutionId === imageryItem.institution}
                                deleteImagery={() => this.deleteImagery(imageryItem.id)}
                            />
                        )}
                    </Fragment>;
    }
}

const imageryOptions = [
    // Default type is text, default parent is none, a referenced parent must be entered as a json string
    // Parameters can be defined one level deep. {paramParent: {paramChild: "", fields: "", fromJsonStr: ""}}
    {
        type: "GeoServer",
        params: [
            { key: "geoserverUrl", display: "GeoServer URL" },
            { key: "LAYERS", display: "GeoServer Layer Name", parent: "geoserverParams" },
            { key: "geoserverParams", display: "GeoServer Params (as JSON string)" },
        ],
        // FIXME, add url if help document is created.
    },
    {
        type: "BingMaps",
        params: [
            { key: "imageryId", display: "Imagery Id" },
            { key: "accessToken", display: "Access Token" },
        ],
        url: "https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key",
    },
    {
        type: "Planet",
        params: [
            { key: "year", display: "Year", type: "number" },
            { key: "month", display: "Month", type: "number" },
            { key: "accessToken", display: "Access Token" },
        ],
        url: "https://developers.planet.com/docs/quickstart/getting-started/",
    },
];

class NewImagery extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newImageryTitle: "",
            newImageryAttribution: "",
            selectedType: 0,
            newImageryParams: {},
        };
    }

    //    Lifecycle Methods    //

    componentDidUpdate(prevProps, prevState) {
        // Clear params different to each type.
        if (prevState.selectedType !== this.state.selectedType) {
            this.setState({ newImageryParams: {}});
        }
    }

    //    Remote Calls    //

    addCustomImagery = () => {
        const sourceConfig = this.stackParams();
        if (!this.checkAllParams()) {
            alert("You must fill out all fields.");
        } else if (this.props.titleIsTaken(this.state.newImageryTitle)) {
            alert("The title '" + this.state.newImageryTitle + "' is already taken.");
        } else if (Object.keys(sourceConfig).length === 0) {
            // stackParams() will fail if parent is not entered as a JSON string.
            alert("Invalid JSON in JSON field(s).");
        } else {
            fetch(this.props.documentRoot + "/add-institution-imagery",
                  {
                      method: "POST",
                      body: JSON.stringify({
                          institutionId: this.props.institutionId,
                          imageryTitle: this.state.newImageryTitle,
                          imageryAttribution: this.state.newImageryAttribution,
                          sourceConfig: sourceConfig,
                      }),
                  }
            ).then(response => {
                if (response.ok) {
                    this.props.getImageryList();
                    this.props.toggleEditMode();
                } else {
                    console.log(response);
                    alert("Error adding imagery. See console for details.");
                }
            });
        }
    };

    //    Helper Functions    //

    stackParams = () => {
        try {
            const imageryParams = imageryOptions[this.state.selectedType].params;
            return Object.keys(this.state.newImageryParams)
                .sort(a => imageryParams.find(p => p.key === a).parent ? 1 : -1) // Sort params that require a parent to the bottom
                .reduce((a, c) => {
                    const parentStr = imageryParams.find(p => p.key === c).parent;
                    if (parentStr) {
                        const parentObj = JSON.parse(a[parentStr]);
                        return { ...a, [parentStr]: { ...parentObj, [c]: this.state.newImageryParams[c] }};
                    } else {
                        return { ...a, [c]: this.state.newImageryParams[c] };
                    }
                }, { type: imageryOptions[this.state.selectedType].type });

        } catch (e) {
            return {};
        }
    };

    checkAllParams = () => this.state.newImageryTitle.length > 0
        && this.state.newImageryAttribution.length > 0
        && imageryOptions[this.state.selectedType].params
            .every(o => this.state.newImageryParams[o.key] && this.state.newImageryParams[o.key].length > 0);

    //    Render Functions    //

    formInput = (title, type, value, callback) => (
        <div className="mb-3" key={title}>
            <label>{title}</label>
            <input
                className="form-control"
                type={type}
                autoComplete="off"
                onChange={e => callback(e)}
                value={value || ""}
            />
        </div>
    );

    render() {
        return (
            <div className="mb-2 p-2 border rounded">
                {/* Selection for imagery type */}
                <div className="mb-3">
                    <label>Select Type</label>
                    <select
                        className="form-control"
                        onChange={e => this.setState({ selectedType: e.target.value })}
                        value={this.state.selectedType}
                    >
                        {imageryOptions.map((o, i) =>
                            <option value={i} key={i}>{o.type}</option>
                        )}
                    </select>
                </div>
                {/* Add fields. Include same for all and unique to selected type. */}
                {this.formInput("Title", "text", this.state.newImageryTitle, e => this.setState({ newImageryTitle: e.target.value }))}
                {this.formInput("Attribution", "text", this.state.newImageryAttribution, e => this.setState({ newImageryAttribution: e.target.value }))}
                {imageryOptions[this.state.selectedType].params.map(o =>
                    this.formInput(o.display,
                                   o.type || "text",
                                   this.state.newImageryParams[o.key],
                                   e => this.setState({ newImageryParams: { ...this.state.newImageryParams, [o.key]: e.target.value }}))
                )}
                {/* Show help URL if there is one. */}
                {imageryOptions[this.state.selectedType].url &&
                    <div className="mb-3" >
                        <a href={imageryOptions[this.state.selectedType].url} target="_blank" rel="noreferrer noopener">
                            Click here for help.
                        </a>
                    </div>
                }
                {/* Action buttons for save and quit */}
                <div className="btn-group-vertical btn-block">
                    <button
                        type="button"
                        id="add-imagery-button"
                        className="btn btn-sm btn-block btn-outline-yellow btn-group py-2 font-weight-bold"
                        onClick={this.addCustomImagery}
                    >
                        <UnicodeIcon icon="add" backgroundColor="#f1c00f"/>Add New Imagery
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-block btn-outline-danger btn-group py-2 font-weight-bold"
                        onClick={this.props.toggleEditMode}
                    >
                        <UnicodeIcon icon="noAction"/> Discard
                    </button>
                </div>
            </div>
        );
    }
}

function Imagery({ isAdmin, title, deleteImagery, isInstitutionImage }) {
    return (
        <div className="row mb-1">
            <div className="col overflow-hidden">
                <button
                    type="button"
                    title={title}
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
                    <UnicodeIcon icon="trash"/>
                </button>
            </div>
            }
        </div>
    );
}

function ProjectList({ isAdmin, isLoggedIn, institutionId, projectList, documentRoot }) {
    return <Fragment>
        {isAdmin &&
            <div className="row mb-1">
                <div className="col">
                    <button
                        id="create-project"
                        type="button"
                        className="btn btn-sm btn-block btn-outline-yellow py-2 font-weight-bold"
                        onClick={() => window.location = documentRoot + "/create-project?institutionId=" + institutionId}
                    >
                        <UnicodeIcon icon="add" backgroundColor="#f1c00f"/>Create New Project
                    </button>
                </div>
            </div>
        }
        {projectList.map((project, uid) =>
            <Project
                isAdmin={isAdmin}
                isLoggedIn={isLoggedIn}
                key={uid}
                documentRoot={documentRoot}
                project={project}
            />
        )}
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
        if (this.props.isLoggedIn) {
            this.projectHighlight();
        }
    }

    projectHighlight = () => {
        fetch(this.props.documentRoot + "/get-project-stats?projectId=" + this.props.project.id)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({
                boxShadow: data.unanalyzedPlots === 0
                    ? "0px 0px 6px 2px #3bb9d6 inset"
                    : (data.flaggedPlots + data.analyzedPlots) > 0
                        ? "0px 0px 6px 1px yellow inset"
                        : "0px 0px 6px 1px red inset",
            }))
            .catch(response => console.log(response));
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
                <button
                    type="button"
                    className="btn btn-sm btn-outline-lightgreen btn-block text-truncate"
                    title={project.name}
                    onClick={() => window.location = documentRoot + "/collection?projectId=" + project.id}
                    style={{
                        boxShadow: this.state.boxShadow,
                    }}
                >
                    {project.name}
                </button>
            </div>
            {isAdmin &&
            <div className="mr-3">
                <a
                    className="edit-project btn btn-sm btn-outline-yellow btn-block px-3"
                    href={documentRoot + "/review-project/" + project.id}
                >
                    <UnicodeIcon icon="edit"/>
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
        fetch(this.props.documentRoot + "/get-institution-users?institutionId=" + this.props.institutionId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ institutionUserList: data }))
            .catch(response => {
                this.setState({ institutionUserList: [] });
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    getActiveUserList = () => {
        fetch(this.props.documentRoot + "/get-all-users")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ activeUserList: data }))
            .catch(response => {
                this.setState({ activeUserList: [] });
                console.log(response);
                alert("Error retrieving the complete user list. See console for details.");
            });
    };

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

    };

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
    };

    currentIsInstitutionMember = () =>
        this.props.userId === 1 || this.state.institutionUserList.some(iu => iu.id === this.props.userId);

    isInstitutionMember = (userEmail) => this.state.institutionUserList.some(iu => iu.email === userEmail);

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

function User({ user, documentRoot, isAdmin, updateUserInstitutionRole }) {
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
                <button
                    type="button"
                    className="btn btn-sm btn-outline-lightgreen btn-block text-truncate"
                    title={user.email}
                    onClick={() => window.location = documentRoot + "/account?userId=" + user.id}
                >
                    {user.email}
                </button>
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
            newUserEmail: "",
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
    };

    addUser = () => {
        this.props.updateUserInstitutionRole(
            this.props.findUserByEmail(this.state.newUserEmail).id,
            this.state.newUserEmail,
            "member"
        );
    };

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
                            <UnicodeIcon icon="add" backgroundColor="#f1c00f"/>Add User
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
                    <UnicodeIcon icon="add" backgroundColor="#f1c00f"/>Request membership
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
            ofUsersApiUrl={args.of_users_api_url}
            storage={args.storage}
        />,
        document.getElementById("institution")
    );
}
