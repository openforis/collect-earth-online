class Institution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institution:[],
            imagery:[],
            projects:[],
            users:[],
            usersCompleteList:[],
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
        }
        };

    componentDidMount(){
        if (this.state.institutionId == "0") {
            this.state.pageMode = "edit";
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
    }
    render() {
        let isAdmin=false;
        let usersLength;
        const imagery=this.state.imagery;
        const projects=this.state.projects;
        const users=this.state.users;
        if (this.state.userId != "") {
            isAdmin = this.state.details.admins.includes(parseInt(this.state.userId));
            console.log(this.state.userId);
            console.log(this.state.details);
            console.log(isAdmin);
        }
        if(isAdmin==true){
            usersLength = users.length;
        }
        else{
           usersLength = this.state.nonPendingUsers.length;
        }

        return (
            <React.Fragment>
            <InstitutionDescription institution={this.state.institution} documentRoot={this.state.documentRoot} of_users_api_url={this.state.of_users_api_url} institutionId={this.state.institutionId} role={this.state.role} storage={this.state.storage} pageMode={this.state.pageMode} details={this.state.details}/>
            <div className = "row">
                <div id="imagery-list" className="col-lg-4 col-xs-12">
                    <h2>Imagery <span className="badge badge-pill bg-lightgreen">{imagery.length}</span>
                    </h2>
                <ImageryList documentRoot={this.state.documentRoot} institution={this.state.institution} isAdmin={isAdmin} institutionId={this.state.institutionId} details={this.state.details} imagery={this.state.imagery}/>
                </div>
                <div id="project-list" className="col-lg-4 col-xs-12">
                    <h2>Projects <span className="badge badge-pill bg-lightgreen">{projects.length}</span>
                    </h2>
                    <ProjectList documentRoot={this.state.documentRoot} institution={this.state.institution} projects={this.state.projects}/>
                </div>
                <div id="user-list" className="col-lg-4 col-xs-12">
                    <h2>Users <span className="badge badge-pill bg-lightgreen">{usersLength}</span></h2>
                    <UserList documentRoot={this.state.documentRoot} institution={this.state.institution} institutionId={this.state.institutionId} users={this.state.users} isAdmin={isAdmin} pageMode={this.state.pageMode}/>
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
            pageMode:props.pageMode,
            users:[],
            imagery:[],
            usersCompleteList:[],
        }
        this.togglePageMode = this.togglePageMode.bind(this);
        this.deleteInstitution = this.deleteInstitution.bind(this);

    }


    updateInstitution(){
        $.ajax({
            url: this.props.documentRoot  + "/update-institution/" + this.props.institutionId,
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
            if (this.props.institutionId == 0) {
                window.location = this.props.documentRoot + "/institution/" + data.id;
            } else {
                this.props.institutionId = data.id;
                this.props.details.id = data.id;
                this.props.isAdmin = true;
                if (data.logo != "") {
                    this.props.details.logo = data.logo;
                }
                fetch(this.state.documentRoot + "/get-all-users?institutionId=" + this.props.institutionId)
                    .then(response => response.json())
                    .then(data => this.setState({users: data}));
                fetch(this.state.documentRoot + "/get-all-users")
                    .then(response => response.json())
                    .then(data => this.setState({usersCompleteList: data}));
                fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.props.institutionId)
                    .then(response => response.json())
                    .then(data => this.setState({imagery: data}));
            }
        });
    }
    togglePageMode(){
        if (this.state.pageMode == "view") {
            this.setState({pageMode : "edit"});
        } else {
            {()=>this.updateInstitution};
            this.setState({pageMode : "view"});
        }
    }
    deleteInstitution(){
        if (confirm("Do you REALLY want to delete this institution?!")) {
            fetch(this.props.documentRoot + "/archive-institution/" + this.props.institutionId)
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
    renderComp(role, pageMode, institution,isAdmin, togglePageMode,deleteInstitution)
    {

        if (role != "") {
            if (institution.id > 0 && role=="admin" && pageMode == 'view') {
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
 renderButtons(institution,pageMode){
     if(pageMode == 'edit' && institution.id ==0){
         return(
             <button id="create-institution"
                     className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                     onClick={this.togglePageMode}>
                 <i className="fa fa-plus-square"></i> Create Institution
             </button>
         );
     }
     else if(pageMode == 'edit' && institution.id > 0){
         return(
             <React.Fragment>
                 <div className="row">
                     <div className="col-6">
                         <button className="btn btn-sm btn-outline-lightgreen btn-block mt-0"
                                 onClick={this.togglePageMode}>
                             <i className="fa fa-save"></i> Save Changes
                         </button>
                     </div>
                     <div className="col-6">
                         <button className="btn btn-sm btn-outline-danger btn-block mt-0"
                                 onClick={this.cancelChanges}>
                             <i className="fa fa-ban"></i> Cancel Changes
                         </button>
                     </div>
                 </div>

             </React.Fragment>

         );
     }
 }
    render() {

            const {institution, documentRoot, institutionId, role, of_users_api_url, storage,isAdmin,details} = this.props;
            let pageMode = this.state.pageMode;


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
                            {this.renderComp(role, pageMode, institution,isAdmin,this.togglePageMode,this.deleteInstitution)}</React.Fragment>
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
                                                 src={of_users_api_url + "/group/logo/" + institutionId}
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
                    {this.renderComp(role, pageMode, institution,isAdmin,this.togglePageMode,this.deleteInstitution)}</React.Fragment>
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
                                           type="text" defaultValue={institution.name}/>
                                </div>
                                <div className="form-group">
                                    <label id="institution-url" htmlFor="institution-details-url">URL</label>
                                    <input id="" type="text" className="form-control mb-1 mr-sm-2"
                                           defaultValue={institution.url}/>
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
                                              rows="4">{institution.description}</textarea>
                                </div>

                                {this.renderButtons(institution,pageMode)}


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
            imagery:[],
            institutionId:this.props.institutionId,
            documentRoot: this.props.documentRoot,
             imageryMode :"view",
             newImageryTitle:"",
             newImageryAttribution:"",
             newGeoServerURL:"",
             newLayerName:"",
             newGeoServerParams:"",
    }

        };
    componentDidMount(){
        //get imagery
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId)
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }

    addCustomImagery() {
        let newImageryTitle = this.state.newImageryTitle;
        let details = this.props.details;

        $.ajax({
            url: this.props.documentRoot + "/add-institution-imagery",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                institutionId: this.props.institutionId,
                imageryTitle: newImageryTitle,
                imageryAttribution: this.state.newImageryAttribution,
                geoserverURL: this.state.newGeoServerURL,
                layerName: this.state.newLayerName,
                geoserverParams: this.state.newGeoServerParams
            })
        }).fail(function () {
            alert("Error adding custom imagery to institution. See console for details.");

        }).done(function (data) {
                alert("Imagery " + newImageryTitle + " has been added to institution " + details.name + ".");


            }
        );

        this.setState({newImageryTitle: ""});
        this.setState({newImageryAttribution: ""});
        this.setState({newGeoServerURL: ""});
        this.setState({newLayerName: ""});
        this.setState({newGeoServerParams: ""});
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId)
            .then(response => response.json())
            .then(data => this.setState({imagery: data}));
    }

    toggleImageryMode(){
        const imageryMode=this.state.imageryMode;
        if (imageryMode == "view") {
            this.setState({imageryMode :"edit"});
        } else {
            this.addCustomImagery;
            this.setState({imageryMode :"view"});
        }
    }
    deleteImagery (imageryId){
        if (confirm("Do you REALLY want to delete this imagery?!")) {
            fetch(this.props.documentRoot + "/delete-institution-imagery", {
                institutionId: this.props.institutionId,
                imageryId: imageryId
            })
                .then(response => {
                    alert("Imagery " + imageryId + " has been deleted from institution " + this.props.details.name + ".");
                    fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId)
                        .then(response => response.json())
                        .then(data => this.setState({imagery: data}));
                });

        }
    }
    cancelAddCustomImagery(){
        this.setState({imageryMode: "view"});
    }
    render() {
        const institution=this.props.institution;
        const isAdmin=this.props.isAdmin;
        const imageryMode=this.state.imageryMode;

        if(imageryMode == 'view') {
                    return (
                        <div className="row mb-1">
                            <ImageryButton institution={institution} toggleImageryMode={()=>this.toggleImageryMode} isAdmin={isAdmin}/>
                            <div>
                                {
                                    this.state.imagery.map(
                                        imageryItem => <Imagery institution={institution} title={imageryItem.title}
                                                                id={imageryItem.id} isAdmin={isAdmin} />
                                    )
                                }
                            </div>
                        </div>
                    );
                }
           else if(isAdmin == true && imageryMode == 'edit'){
                return(
                    <div className="row" id="add-imagery">
                        <div className="col">
                            <form className="mb-2 p-2 border rounded">
                                <div className="form-group">
                                    <label htmlFor="newImageryTitle">Title</label>
                                    <input className="form-control" id="newImageryTitle" type="text"
                                           name="imagery-title" autoComplete="off"
                                           value={this.state.newImageryTitle}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newImageryAttribution">Attribution</label>
                                    <input className="form-control" id="newImageryAttribution" type="text"
                                           name="imagery-attribution" autoComplete="off"
                                          value={this.state.newImageryAttribution}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerURL">GeoServer URL</label>
                                    <input className="form-control" id="newGeoServerURL" type="text"
                                           name="imagery-geoserver-url" autoComplete="off"
                                           value={institution.newGeoServerURL}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newLayerName">GeoServer Layer Name</label>
                                    <input className="form-control" id="newLayerName" type="text"
                                           name="imagery-layer-name" autoComplete="off"
                                           value={this.state.newLayerName}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newGeoServerParams">GeoServer Params<br/>(as JSON string)</label>
                                    <input className="form-control" id="newGeoServerParams" type="text"
                                           name="imagery-geoserver-params" autoComplete="off"
                                           value={this.state.newGeoServerParams}/>
                                </div>
                                <div className="btn-group-vertical btn-block">
                                    <button id="add-imagery-button"
                                            className="btn btn-sm btn-block btn-outline-yellow btn-group"
                                            onClick={this.toggleImageryMode}>
                                        <i className="fa fa-plus-square"></i> Add New Imagery
                                    </button>
                                    <button className="btn btn-sm btn-block btn-outline-danger btn-group"
                                            onClick={this.cancelAddCustomImagery}>Cancel
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
    if(props.isAdmin == false) {
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

                <div className="col-10 pr-1 ">
                    <button className="btn btn-outline-lightgreen btn-sm btn-block">{props.title}</button>
                </div>


                <div className="col-2 pl-0">
                    <button className="btn btn-outline-danger btn-sm btn-block" id="delete-imagery" type="button"
                            onClick={this.deleteImagery(props.id)}>
                        <span className="d-none d-xl-block">Delete</span>
                        <span className="d-xl-none"><i className="fa fa-trash-alt"></i></span>
                    </button>
                </div>
            </div>

        );
    }


}
function ImageryButton(props) {
    if(props.isAdmin == true) {
        return (
            <div className="row">
                <div className="col-lg-12">

                    <button type="button" id="add-imagery-button"
                            className="btn btn-sm btn-block btn-outline-yellow"
                            onClick={()=>props.toggleImageryMode}>
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

                if(isAdmin == true){
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
        if(isAdmin == true){
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
            users: this.props.users,
            institutionId: this.props.institutionId,

        };
    }

    updateUserInstitutionRole(userId, email, role) {

        $.ajax({
            url: this.props.documentRoot + "/update-user-institution-role",
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
            if (userId == this.userId && role != "admin") {
                this.pageMode = "view";
                this.props.isAdmin = false;
            }
            this.getUserList(this.details.id);
        });
    }
        render()
        {

            return (
                <UserButton institution={this.props.institution} isAdmin={this.props.isAdmin}/>,
                    this.state.users.map(user => <User documentRoot={this.props.documentRoot} user={user}
                                                       institution={this.props.institution} isAdmin={this.props.isAdmin}
                                                       pageMode={this.props.pageMode}/>
                    )

            );
        }
    }


function User(props) {
    const user = props.user;
    const institution = props.institution;
    const documentRoot=props.documentRoot;

    if (props.isAdmin == false && user.institutionRole != 'pending') {
        return (

            <div className="col mb-1">
            <a className="btn btn-sm btn-outline-lightgreen btn-block"
               href={documentRoot+"/account/"+ user.id }>{user.email}</a>
        </div>
        );
    }
    if (props.isAdmin == true) {
        return (

            <div className="col-lg-9 mb-1 pr-1">
            <a className="btn btn-sm btn-outline-lightgreen btn-block"
               href={documentRoot + "/account/" + user.id}>{user.email}</a>
        </div>
        );
    }
    if (props.isAdmin == true) {
        return (

            <div className="col-lg-3 mb-1 pl-0">
            <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                    onChange={this.updateUserInstitutionRole(user.id, user.email, user.institutionRole)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="not-member">Remove</option>
            </select>
        </div>
        );
    }
    else if (props.isAdmin == true && user.institutionRole == 'pending') {
        return (

            <div className="col-lg-3 mb-1 pl-0">
            <select className="custom-select custom-select-sm" name="user-institution-role" size="1"
                    onChange={this.updateUserInstitutionRole(user.id, user.email, user.institutionRole)}>
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
class UserButton extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            newUserEmail: "",
            userList: [],
            userListComplete: [],
        };
    }

    addUser() {
        if (this.state.newUserEmail == "") {
            alert("Please enter an existing user's email address.");
        } else if (this.findUserByEmail(this.state.userList, this.state.newUserEmail)) {
            alert(this.state.newUserEmail + " is already a member of this institution.");
        } else {
            let newUser = this.findUserByEmail(this.state.userListComplete, this.state.newUserEmail);
            if (newUser) {
                this.updateUserInstitutionRole(newUser.id, newUser.email, "member");
                this.state.newUserEmail = "";
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
    render()
    {
        const institution = props.institution;
        if (props.isAdmin == true) {
            return (
                <div className="row">
                    <div className="col-lg-9 mb-1 pr-1">
                        <input className="form-control form-control-sm" type="email" name="new-institution-user"
                               autoComplete="off"
                               placeholder="Email"/>
                    </div>
                    <div className="col-lg-3 mb-1 pl-0">
                        <button className="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user"
                                onClick={this.addUser}>Add User
                        </button>
                    </div>
                </div>
            );
        }
        if (institution.userId != '' && institution.details.id > 0 && !institution.isInstitutionMember(institution.userId)) {
            return (
                <div>
                    <input type="button" className="button" id="request-membership-button"
                           name="request-membership-button"
                           value="Request Membership" onClick={this.requestMembership}/>
                </div>
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
