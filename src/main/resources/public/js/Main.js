class Institution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institution:[],
            imagery:[],
            projects:[],
            users:[],
            userId:props.userId,
            documentRoot:props.documentRoot,
            institutionId:props.institutionId,
            of_users_api_url:props.of_users_api_url,
            role:props.role,
            storage:props.storage,
            nonPendingUsers:props.nonPendingUsers,
            pageMode:props.pageMode,
            details : {
            id: "-1",
            name: "",
            logo: "",
            url: "",
            description: "",
            admins: []
        },
        isAdmin:false,
        }
        };

    componentDidMount(){
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
    }
    render() {
        let usersLength;
        const institution=this.state.institution;
        const imagery=this.state.imagery;
        const projects=this.state.projects;
        const users=this.state.users;
        if (this.state.userId != "") {
            this.state.isAdmin = this.state.details.admins.includes(parseInt(this.state.userId));
            console.log("hfjhf"+this.state.isAdmin);
        }
        if(this.state.isAdmin==true){
            usersLength = users.length;
        }
        else{
           usersLength = this.state.nonPendingUsers.length;
        }

        return (
            <div>
            <InstitutionDescription institution={this.state.institution} documentRoot={this.state.documentRoot} of_users_api_url={this.state.of_users_api_url} institutionId={this.state.institutionId} role={this.state.role} storage={this.state.storage} pageMode={this.state.pageMode} isAdmin={this.state.isAdmin} details={this.state.details}/>
            <div className = "row">
                <div id="imagery-list" className="col-lg-4 col-xs-12">
                    <h2>Imagery <span className="badge badge-pill bg-lightgreen">{imagery.length}</span>
                    </h2>
                <ImageryList documentRoot={this.state.documentRoot} institution={this.state.institution} institutionId={this.state.institutionId} imagery={this.state.imagery}/>
                </div>
                <div id="project-list" className="col-lg-4 col-xs-12">
                    <h2>Projects <span className="badge badge-pill bg-lightgreen">{projects.length}</span>
                    </h2>
                    <ProjectList documentRoot={this.state.documentRoot} institution={this.state.institution} projects={this.state.projects}/>
                </div>
                <div id="user-list" className="col-lg-4 col-xs-12">
                    <h2>Users <span className="badge badge-pill bg-lightgreen">{usersLength}</span></h2>
                    <UserList documentRoot={this.state.documentRoot} institution={this.state.institution} institutionId={this.state.institutionId} users={this.state.users}/>
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
            users:[],
            imagery:[],
            usersCompleteList:[],
        }
    }
    togglePageMode(){
        if (pageMode == "view") {
            pageMode = "edit";
        } else {
            this.updateInstitution();
            pageMode = "view";
        }
    }
    updateInstitution(){
        $.ajax({
            url: this.props.documentRoot  + "/update-institution/" + this.props.details.id,
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                userId:this.props.userId,
                institutionName:this.props.details.name,
                institutionLogo:document.getElementById("institution-logo").files[0],
                institutionUrl:this.props.details.url,
                institutionDescription:this.props.details.description
            })
        }).fail(function () {
            alert("Error updating institution details. See console for details.");

        }).done(function (data) {
            if (this.props.details.id == 0) {
                window.location = this.props.documentRoot + "/institution/" + data.id;
            } else {
                this.props.details.id = data.id;
                this.props.isAdmin = true;
                if (data.logo != "") {
                    this.props.details.logo = data.logo;
                }
                fetch(this.state.documentRoot + "/get-all-users?institutionId=" + this.props.details.id)
                    .then(response => response.json())
                    .then(data => this.setState({users: data}));
                fetch(this.state.documentRoot + "/get-all-users")
                    .then(response => response.json())
                    .then(data => this.setState({usersCompleteList: data}));
                fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.props.details.id)
                    .then(response => response.json())
                    .then(data => this.setState({imagery: data}));
            }
        });
    }
    deleteInstitution(){
        if (confirm("Do you REALLY want to delete this institution?!")) {
            fetch(this.props.documentRoot + "/archive-institution/" + this.props.details.id)
                .then(response => {
                    if(response.ok) {
                        alert("Institution " + this.props.details.name + " has been deleted.");
                        window.location = this.props.documentRoot+ "/home";
                    } else {
                        alert("Error deleting institution. See console for details.");
                    }
                });
        }
    }
    renderComp(role, pageMode, institution,isAdmin, deleteInstitution)
    {

        if (role != "") {
            if (pageMode == 'edit' && institution.id == 0) {
                return (
                    <div className="row justify-content-center mb-2" id="institution-controls">
                        <div className="col-2">
                            <div className="btn-group btn-block">
                                <button id="create-institution" type="button"
                                        className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                        onClick={this.togglePageMode}>
                                    Create Institution
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }
            else if (institution.id > 0 && role=="admin") {

                let opt = "";
                if (pageMode == "view")
                    opt = "Edit";
                else opt = "Save";

                return (
                    <div className="row justify-content-center mb-2" id="institution-controls">
                        <div className="col-2">
                            <div className="btn-group btn-block">
                                <button id="edit-institution" type="button"
                                        className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                        onClick={this.togglePageMode}>
                                    {opt}
                                </button>
                                <button id="delete-institution" type="button"
                                        className="btn btn-sm btn-outline-danger btn-block mt-0"
                                        onClick={() => deleteInstitution()}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }
        }
    }

    render() {

            const {institution, documentRoot, institutionId, role, of_users_api_url, storage,isAdmin} = this.props;
            let pageMode = this.props.pageMode;

            if (institution.id == "0") {
                pageMode = "edit";
            }

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
                                    <p>{institution.description}</p>
                                </div>
                            </div>
                            {this.renderComp(role, pageMode, institution,isAdmin,this.deleteInstitution)}</React.Fragment>
                    );
                }
                else {
                    return (
                        <div id="institution-details" className="row justify-content-center">
                            <div id="institution-view" className="col-xl-6 col-lg-8 ">
                                <div className="row">
                                    <div className="col-md-3" id="institution-logo-container">
                                        <a href={institution.url}>
                                            <img className="img-fluid"
                                                 src={of_users_api_url + "/group/logo/" + institutionId}
                                                 alt="logo"/>
                                        </a>
                                    </div>
                                    <h1 className="col-md-9"><a href={institution.url}>{institution.name}</a>
                                    </h1>
                                </div>
                                <p>{institution.description}</p>
                            </div>
                        </div>
                    );
                }

            }
            else if (pageMode == 'edit') {
                return (
                    <div id="institution-details" className="row justify-content-center">
                        <div id="institution-edit" className="col-xl-6 col-lg-8">
                            <form className="mb-2 p-4 border rounded">
                                <div className="form-group form-row">
                                    <label id="institution-name" htmlFor="institution-details-name">Name</label>
                                    <input id="institution-details-name" className="form-control mb-1 mr-sm-2"
                                           type="text"/>
                                </div>
                                <div className="form-group form-row">
                                    <label id="institution-url" htmlFor="institution-details-url">URL</label>
                                    <input id="" type="text" className="form-control mb-1 mr-sm-2"/>
                                </div>
                                <div className="form-group form-row">
                                    <label id="institution-logo-selector" htmlFor="institution-logo">Logo</label>
                                    <input id="institution-logo" className="form-control mb-1 mr-sm-2" type="file"
                                           accept="image/*"/>
                                </div>
                                <div className="form-group form-row">
                                    <label id="institution-description"
                                           htmlFor="institution-details-description">Description</label>
                                    <textarea id="institution-details-description" className="form-control"
                                              rows="4"></textarea>
                                </div>
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
            imagery:this.props.imagery,
            institutionId:this.props.institutionId,
            documentRoot: this.props.documentRoot,
        }
        };


    render() {
        const institution=this.props.institution;
        const imagery=this.state.institution;


                if(institution.imageryMode == 'view') {
                    return (
                        <div>
                            <ImageryButton institution={institution}/>

                            {
                                imagery.map(
                                    imageryItem => <Imagery institution={institution} title={imageryItem.title}/>
                                )
                            }
                        </div>
                    );
                }
           else if(institution.isAdmin == true && institution.imageryMode == 'edit'){
                return(
                <div className="row" id="add-imagery">
                    <div className="col">
                        <form className="mb-2 p-2 border rounded">
                            <div className="form-group">
                                <label htmlFor="newImageryTitle">Title</label>
                                <input className="form-control" id="newImageryTitle" type="text" name="imagery-title"
                                       autoComplete="off"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="newImageryAttribution">Attribution</label>
                                <input className="form-control" id="newImageryAttribution" type="text"
                                       name="imagery-attribution" autoComplete="off"
                                       />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newGeoServerURL">GeoServer URL</label>
                                <input className="form-control" id="newGeoServerURL" type="text"
                                       name="imagery-geoserver-url" autoComplete="off"
                                     />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newLayerName">GeoServer Layer Name</label>
                                <input className="form-control" id="newLayerName" type="text" name="imagery-layer-name"
                                       autoComplete="off"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="newGeoServerParams">GeoServer Params<br/>(as JSON string)</label>
                                <input className="form-control" id="newGeoServerParams" type="text"
                                       name="imagery-geoserver-params" autoComplete="off"
                                      />
                            </div>
                            <div className="btn-group-vertical btn-block">
                                <button id="add-imagery-button" ng-if="institution.isAdmin == true"
                                        className="btn btn-sm btn-block btn-outline-yellow btn-group"
                                        onClick="institution.toggleImageryMode()">
                                    Add New Imagery
                                </button>
                                <button className="btn btn-sm btn-block btn-outline-danger btn-group"
                                        onClick="institution.cancelAddCustomImagery()">Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }
        else
                {
                    return(<span></span>);
                }
    }
}
function Imagery(props){

    if(props.institution.isAdmin == false) {
        return (
            <div className="row">

                <div className="col mb-1">
                    <button className="btn btn-outline-lightgreen btn-sm btn-block">{props.title}</button>
                </div>
            </div>

        );
    }
    else {
        return (
            <div className="row">

                <div className="col-lg-10 col-sm-12 pr-lg-1 ">
                    <button className="btn btn-outline-lightgreen btn-sm btn-block">{props.title}</button>
                </div>


                <div className="col-lg-2 col-sm-12 pl-lg-0 mb-1">
                    <button className="btn btn-outline-danger btn-sm btn-block" id="delete-imagery" type="button"
                            onClick="institution.deleteImagery(imagery.id)">
                        <span className="d-none d-xl-block">Delete</span>
                        <span className="d-xl-none"><i className="fa fa-times-circle"></i></span>
                    </button>
                </div>
            </div>

        );
    }


}
function ImageryButton(props) {
    if(props.institution.isAdmin == true) {
        return (
            <div className="row">
                <div className="col-lg-12">

                    <button type="button" id="add-imagery-button"
                            className="btn btn-sm btn-block btn-outline-yellow"
                            onClick="institution.toggleImageryMode()">
                        Add New Imagery
                    </button>

                </div>
            </div>
        );
    }
    else{
        return(
            <span></span>
        );
    }
}

class ProjectList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects:this.props.projects,
        };
    }

    render() {
        const institution = this.props.institution;

                if(institution.isAdmin == true){
                    return (
                        <ProjectButton/>,
                    this.state.projects.map(project=> <Project documentRoot={this.props.documentRoot} proj={project} institution={institution}/>)

                );
                }
                else{
                    return (

                        this.state.projects.map(project=> <Project documentRoot={this.props.documentRoot} proj={project} institution={institution}/>));
                }

    }
}

function Project(props){

        const documentRoot=props.documentRoot;
        const project=props.proj;
        const institution=props.institution;
        if(institution.isAdmin == true){
            return(
                <div className="row">
                    <div className="col-lg-10 mb-1 pr-1">
                        <a className="btn btn-sm btn-outline-lightgreen btn-block"
                           href={documentRoot + "/collection/" + project.id}>
                            {project.name}
                        </a>
                    </div>
                    <div className="col-lg-2 pl-0">
                        <a className="btn btn-sm btn-outline-lightgreen btn-block" className="edit-project"
                           href={documentRoot + "/project/" + project.id}>Edit</a>
                    </div>
                </div>
            );
        }else{
            return(


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
function ProjectButton(){
    return(
        <div className="row mb-1">
            <div className="col">
                <button id="create-project" type="button" className="btn btn-sm btn-block btn-outline-yellow"
                        onClick="institution.createProject()">
                    Create New Project
                </button>
            </div>
        </div>
    );
}

class UserList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            users:this.props.users,
            institutionId:this.props.institutionId,

        };
    }

    render() {

        return (
            <UserButton institution={this.props.institution}/>,
        this.state.users.map(user=> <User documentRoot={this.props.documentRoot} user={user} institution={this.props.institution}/>
            )

        );
    }
}

function User(props) {
    const user = props.user;
    const institution = props.institution;
    const documentRoot=props.documentRoot;

    if (institution.isAdmin == false && user.institutionRole != 'pending') {
        return (

            <div className="col mb-1">
            <a className="btn btn-sm btn-outline-lightgreen btn-block"
               href={documentRoot+"/account/"+ user.id }>{user.email}</a>
        </div>
        );
    }
    if (institution.isAdmin == true) {
        return (

            <div className="col-lg-9 mb-1 pr-1">
            <a className="btn btn-sm btn-outline-lightgreen btn-block"
               href={documentRoot + "/account/" + user.id}>{user.email}</a>
        </div>
        );
    }
    if (institution.isAdmin == true) {
        return (

            <div className="col-lg-3 mb-1 pl-0">
            <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                    onChange="institution.updateUserInstitutionRole(user.id, user.email, user.institutionRole)">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="not-member">Remove</option>
            </select>
        </div>
        );
    }
    else if (institution.isAdmin == true && user.institutionRole == 'pending') {
        return (

            <div className="col-lg-3 mb-1 pl-0">
            <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                    onChange="institution.updateUserInstitutionRole(user.id, user.email, user.institutionRole)">
                <option value="pending">Pending</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="not-member">Remove</option>
            </select>
        </div>
        );
    }
    else{
        return(<span></span>);
    }
}
function UserButton(props) {
    const institution = props.institution;
    if (institution.isAdmin == true) {
        return (
            <div className="row">
                <div className="col-lg-9 mb-1 pr-1">
                    <input className="form-control form-control-sm" type="email" name="new-institution-user"
                           autoComplete="off"
                           placeholder="Email"/>
                </div>
                <div className="col-lg-3 mb-1 pl-0">
                    <button className="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user"
                            onClick="institution.addUser()">Add User
                    </button>
                </div>
            </div>
        );
    }
    if (institution.userId != '' && institution.details.id > 0 && !institution.isInstitutionMember(institution.userId)) {
        return (
            <div>
                <input type="button" className="button" id="request-membership-button" name="request-membership-button"
                       value="Request Membership" ng-click="institution.requestMembership()"/>
            </div>
        );
    }
}

function renderInstitution(documentRoot, userId, institutionId,of_users_api_url,role,storage,nonPendingUsers,pageMode) {
    ReactDOM.render(
        <Institution documentRoot={documentRoot} userId={userId} institutionId={institutionId} of_users_api_url={of_users_api_url} role={role} storage={storage} nonPendingUsers={nonPendingUsers} pageMode={pageMode}/>,
        document.getElementById("institution")
    );
}
