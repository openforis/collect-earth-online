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
            userId: props.userId,
            documentRoot: props.documentRoot,
            institutionId: props.institutionId,
            of_users_api_url: props.of_users_api_url,
            role: props.role,
            storage: props.storage,
        };
        this.togglePageMode=this.togglePageMode.bind(this);
        this.handleChange=this.handleChange.bind(this);
        this.deleteInstitution=this.deleteInstitution.bind(this);
    };

    componentDidMount() {
        this.initialize(this.props.documentRoot, this.props.userId, this.props.institutionId);
    }

    initialize(documentRoot, userId, institutionId) {
        // Make the current documentRoot, userId, and institution id globally available
        let detailsNew = this.state.details;
        detailsNew.id = institutionId;
        this.setState({details: detailsNew});
        // If in Create Institution mode, show the institution editing view. Otherwise, load and show the institution details
        if (this.state.details.id == "0") {
            this.setState({pageMode: "edit"});
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
            console.log(parsedData);
            if (holdRef.state.details.id == 0) {
                window.location = documentRoot + "/review-institution/" + parsedData.id;
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

export function renderCreateInstitutionPage(args) {
    ReactDOM.render(
        <Institution documentRoot={args.documentRoot} userId={args.userId} institutionId={args.institutionId}
                     of_users_api_url={args.of_users_api_url} role={args.role} storage={args.storage} nonPendingUsers={args.nonPendingUsers}
                     pageMode={args.pageMode}/>,
        document.getElementById("institution")
    );
}
