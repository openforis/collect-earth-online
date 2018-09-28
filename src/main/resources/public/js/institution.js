var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Institution = function (_React$Component) {
    _inherits(Institution, _React$Component);

    function Institution(props) {
        _classCallCheck(this, Institution);

        var _this = _possibleConstructorReturn(this, (Institution.__proto__ || Object.getPrototypeOf(Institution)).call(this, props));

        _this.state = {
            institution: [],
            imagery: [],
            projects: [],
            users: [],
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
            }
        };
        _this.togglePageMode = _this.togglePageMode.bind(_this);
        _this.updateInstitution = _this.updateInstitution.bind(_this);
        _this.getData = _this.getData.bind(_this);
        _this.handleChange = _this.handleChange.bind(_this);
        _this.deleteInstitution = _this.deleteInstitution.bind(_this);
        _this.getImagery = _this.getImagery.bind(_this);
        _this.getUsers = _this.getUsers.bind(_this);
        return _this;
    }

    _createClass(Institution, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            var _this2 = this;

            if (this.state.institutionId == "0") {
                this.setState({ pageMode: "edit" });
            } else {
                //get institutions
                fetch(this.state.documentRoot + "/get-institution-details/" + this.state.institutionId).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    return _this2.setState({ institution: data });
                });
                //get imagery
                fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    return _this2.setState({ imagery: data });
                });
                //get projects
                fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.state.userId + "&institutionId=" + this.props.institutionId).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    return _this2.setState({ projects: data });
                });
                //get users
                fetch(this.state.documentRoot + "/get-all-users?institutionId=" + this.state.institutionId).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    return _this2.setState({ users: data });
                });
                //get users complete list
                fetch(this.state.documentRoot + "/get-all-users").then(function (response) {
                    return response.json();
                }).then(function (data) {
                    return _this2.setState({ usersCompleteList: data });
                });
            }
            var count = this.state.users.filter(function (user) {
                return user.institutionRole != "pending";
            }).length;
            this.setState({ nonPendingUsers: count });
            var detailsNew = this.state.details;
            detailsNew.id = this.state.institutionId;
            this.setState({ details: detailsNew });
        }
    }, {
        key: "getUsers",
        value: function getUsers() {
            var _this3 = this;

            //get users
            fetch(this.state.documentRoot + "/get-all-users?institutionId=" + this.state.institutionId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this3.setState({ users: data });
            });
        }
    }, {
        key: "getImagery",
        value: function getImagery() {
            var _this4 = this;

            fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this4.setState({ imagery: data });
            });
        }
    }, {
        key: "updateInstitution",
        value: function updateInstitution() {
            var institutionId = this.state.institutionId;
            var isAdmin = this.state.isAdmin;
            var userId = this.state.userId;
            var documentRoot = this.state.documentRoot;
            var formData = new FormData();
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
                    var detailsNew = holdRef.state.details;
                    detailsNew.id = parsedData.id;
                    institutionId = parsedData.id;
                    isAdmin = true;
                    if (parsedData.logo != "") {
                        detailsNew.logo = parsedData.logo;
                    }
                    holdRef.setState({ details: detailsNew });
                    holdRef.getData(institutionId);
                    holdRef.setState({ isAdmin: isAdmin });
                    holdRef.setState({ institutionId: institutionId });
                }
            });
        }
    }, {
        key: "togglePageMode",
        value: function togglePageMode() {
            if (this.state.pageMode == "view") {
                this.setState({ pageMode: "edit" });
            } else {
                this.updateInstitution();
                this.setState({ pageMode: "view" });
            }
        }
    }, {
        key: "getData",
        value: function getData(institutionId) {
            var _this5 = this;

            fetch(this.state.documentRoot + "/get-institution-details/" + institutionId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this5.setState({ institution: data });
            });
            fetch(this.state.documentRoot + "/get-all-users?institutionId=" + institutionId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this5.setState({ users: data });
            });
            fetch(this.state.documentRoot + "/get-all-users").then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this5.setState({ usersCompleteList: data });
            });
            fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + institutionId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this5.setState({ imagery: data });
            });
        }
    }, {
        key: "handleChange",
        value: function handleChange(event) {
            var target = event.target;
            var value = target.value;
            var detailsNew = this.state.details;
            if (target.id == "institution-details-name") {
                detailsNew.name = value;
            }
            if (target.id == "institution-details-url") {
                detailsNew.url = value;
            }
            if (target.id == "institution-details-description") {
                detailsNew.description = value;
            }
            this.setState({ details: detailsNew });
        }
    }, {
        key: "deleteInstitution",
        value: function deleteInstitution() {
            var institutionId = this.state.institutionId;
            var name = this.state.institution.name;
            var documentRoot = this.state.documentRoot;
            if (confirm("Do you REALLY want to delete this institution?!")) {
                $.ajax({
                    url: documentRoot + "/archive-institution/" + institutionId,
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: false,
                    processData: false
                }).fail(function () {
                    alert("Error deleting institution. See console for details.");
                }).done(function () {
                    alert("Institution " + name + " has been deleted.");
                    window.location = documentRoot + "/home";
                });
            }
        }
    }, {
        key: "cancelChanges",
        value: function cancelChanges() {
            this.setState({ pageMode: "view" });
        }
    }, {
        key: "render",
        value: function render() {
            var isAdmin = false;
            var usersLength = void 0;
            var imagery = this.state.imagery;
            var projects = this.state.projects;
            var users = this.state.users;
            if (this.state.userId != "") {
                isAdmin = this.state.details.admins.includes(parseInt(this.state.userId));
            }
            if (this.state.role == "admin") {
                isAdmin = true;
            }
            if (isAdmin == true) {
                usersLength = users.length;
            } else {
                usersLength = this.state.users.filter(function (user) {
                    return user.institutionRole != "pending";
                }).length;
                ;
            }

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(InstitutionDescription, { userId: this.state.userId, institution: this.state.institution,
                    documentRoot: this.state.documentRoot,
                    of_users_api_url: this.state.of_users_api_url,
                    institutionId: this.state.institutionId, role: this.state.role,
                    storage: this.state.storage, pageMode: this.state.pageMode,
                    details: this.state.details, togglePageMode: this.togglePageMode,
                    handleChange: this.handleChange, cancelChanges: this.cancelChanges,
                    deleteInstitution: this.deleteInstitution }),
                React.createElement(
                    "div",
                    { className: "row" },
                    React.createElement(
                        "div",
                        { id: "imagery-list", className: "col-lg-4 col-xs-12" },
                        React.createElement(
                            "h2",
                            { className: "header" },
                            "Imagery ",
                            React.createElement(
                                "span",
                                {
                                    className: "badge badge-pill badge-light" },
                                imagery.length
                            )
                        ),
                        React.createElement(ImageryList, { userId: this.state.userId, documentRoot: this.state.documentRoot,
                            institution: this.state.institution, isAdmin: isAdmin,
                            institutionId: this.state.institutionId, details: this.state.details,
                            imagery: imagery, pageMode: this.state.pageMode, getImagery: this.getImagery })
                    ),
                    React.createElement(
                        "div",
                        { id: "project-list", className: "col-lg-4 col-xs-12" },
                        React.createElement(
                            "h2",
                            { className: "header" },
                            "Projects ",
                            React.createElement(
                                "span",
                                {
                                    className: "badge badge-pill  badge-light" },
                                projects.length
                            )
                        ),
                        React.createElement(ProjectList, { userId: this.state.userId, documentRoot: this.state.documentRoot,
                            institution: this.state.institution,
                            projects: this.state.projects, isAdmin: isAdmin,
                            institutionId: this.state.institutionId })
                    ),
                    React.createElement(
                        "div",
                        { id: "user-list", className: "col-lg-4 col-xs-12" },
                        React.createElement(
                            "h2",
                            { className: "header" },
                            "Users ",
                            React.createElement(
                                "span",
                                {
                                    className: "badge badge-pill  badge-light" },
                                usersLength
                            )
                        ),
                        React.createElement(UserList, { userId: this.state.userId, documentRoot: this.state.documentRoot,
                            institution: this.state.institution,
                            institutionId: this.state.institutionId, users: this.state.users, isAdmin: isAdmin,
                            usersCompleteList: this.state.usersCompleteList,
                            pageMode: this.state.pageMode, getUsers: this.getUsers })
                    )
                )
            );
        }
    }]);

    return Institution;
}(React.Component);

var InstitutionDescription = function (_React$Component2) {
    _inherits(InstitutionDescription, _React$Component2);

    function InstitutionDescription(props) {
        _classCallCheck(this, InstitutionDescription);

        var _this6 = _possibleConstructorReturn(this, (InstitutionDescription.__proto__ || Object.getPrototypeOf(InstitutionDescription)).call(this, props));

        _this6.state = {
            pageMode: _this6.props.pageMode,
            users: [],
            imagery: [],
            usersCompleteList: [],
            isAdmin: _this6.props.isAdmin,
            logo: _this6.props.institution.logo,
            institutionId: _this6.props.institutionId,
            details: _this6.props.details
        };
        return _this6;
    }

    _createClass(InstitutionDescription, [{
        key: "renderComp",
        value: function renderComp(role, pageMode, institution, isAdmin, togglePageMode, deleteInstitution) {
            if (role != "") {
                if (institution.id > 0 && role == "admin" && pageMode == 'view') {
                    return React.createElement(
                        "div",
                        { className: "row justify-content-center mb-2", id: "institution-controls" },
                        React.createElement(
                            "div",
                            { className: "col-3" },
                            React.createElement(
                                "button",
                                { id: "edit-institution", type: "button",
                                    "class": "btn btn-sm btn-outline-lightgreen btn-block mt-0",
                                    onClick: togglePageMode },
                                React.createElement("i", { className: "fa fa-edit" }),
                                " Edit"
                            )
                        ),
                        React.createElement(
                            "div",
                            { className: "col-3" },
                            React.createElement(
                                "button",
                                { id: "delete-institution", type: "button",
                                    className: "btn btn-sm btn-outline-danger btn-block mt-0",
                                    onClick: deleteInstitution },
                                React.createElement("i", { className: "fa fa-trash-alt" }),
                                " Delete"
                            )
                        )
                    );
                }
            }
        }
    }, {
        key: "renderHeader",
        value: function renderHeader(institutionId) {
            if (institutionId > 0) {
                return React.createElement(
                    "h2",
                    { className: "header" },
                    React.createElement(
                        "span",
                        null,
                        "Edit  Institution"
                    )
                );
            } else if (institutionId == 0) {
                return React.createElement(
                    "h2",
                    { className: "header" },
                    React.createElement(
                        "span",
                        null,
                        "Create New Institution"
                    )
                );
            }
        }
    }, {
        key: "renderButtons",
        value: function renderButtons(institutionId, institution, pageMode, togglePageMode, cancelChanges) {
            if (pageMode == 'edit' && institutionId == 0) {
                return React.createElement(
                    "button",
                    { id: "create-institution",
                        className: "btn btn-sm btn-outline-lightgreen btn-block mt-0",
                        onClick: togglePageMode },
                    React.createElement("i", { className: "fa fa-plus-square" }),
                    " Create Institution"
                );
            } else if (pageMode == 'edit' && institutionId > 0) {
                return React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                        "div",
                        { className: "row" },
                        React.createElement(
                            "div",
                            { className: "col-6" },
                            React.createElement(
                                "button",
                                { className: "btn btn-sm btn-outline-lightgreen btn-block mt-0",
                                    onClick: togglePageMode },
                                React.createElement("i", { className: "fa fa-save" }),
                                " Save Changes"
                            )
                        ),
                        React.createElement(
                            "div",
                            { className: "col-6" },
                            React.createElement(
                                "button",
                                { className: "btn btn-sm btn-outline-danger btn-block mt-0",
                                    onClick: cancelChanges },
                                React.createElement("i", { className: "fa fa-ban" }),
                                " Cancel Changes"
                            )
                        )
                    )
                );
            }
        }
    }, {
        key: "render",
        value: function render() {
            var _props = this.props,
                institution = _props.institution,
                documentRoot = _props.documentRoot,
                institutionId = _props.institutionId,
                role = _props.role,
                of_users_api_url = _props.of_users_api_url,
                storage = _props.storage,
                isAdmin = _props.isAdmin,
                details = _props.details;

            var pageMode = this.props.pageMode;
            if (pageMode == "view") {
                if (storage != null && typeof storage == "string" && storage == "local") {
                    return React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                            "div",
                            { id: "institution-details", className: "row justify-content-center" },
                            React.createElement(
                                "div",
                                { id: "institution-view", className: "col-xl-6 col-lg-8 " },
                                React.createElement(
                                    "div",
                                    { className: "row" },
                                    React.createElement(
                                        "div",
                                        { className: "col-md-3", id: "institution-logo-container" },
                                        React.createElement(
                                            "a",
                                            { href: institution.url },
                                            React.createElement("img", { className: "img-fluid", src: documentRoot + "/" + institution.logo,
                                                alt: "logo" })
                                        )
                                    ),
                                    React.createElement(
                                        "h1",
                                        { className: "col-md-9" },
                                        React.createElement(
                                            "a",
                                            { href: institution.url },
                                            institution.name
                                        )
                                    )
                                ),
                                React.createElement(
                                    "div",
                                    { className: "row" },
                                    React.createElement(
                                        "div",
                                        { className: "col" },
                                        React.createElement(
                                            "p",
                                            null,
                                            institution.description
                                        )
                                    )
                                )
                            )
                        ),
                        this.renderComp(role, pageMode, institution, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)
                    );
                } else {
                    return React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                            "div",
                            { id: "institution-details", className: "row justify-content-center" },
                            React.createElement(
                                "div",
                                { id: "institution-view", className: "col-xl-6 col-lg-8 " },
                                React.createElement(
                                    "div",
                                    { className: "row" },
                                    React.createElement(
                                        "div",
                                        { className: "col-md-3", id: "institution-logo-container" },
                                        React.createElement(
                                            "a",
                                            { href: institution.url },
                                            React.createElement("img", { className: "img-fluid",
                                                src: of_users_api_url + "/group/logo/" + institution.id,
                                                alt: "logo" })
                                        )
                                    ),
                                    React.createElement(
                                        "h1",
                                        { className: "col-md-9" },
                                        React.createElement(
                                            "a",
                                            { href: institution.url },
                                            institution.name
                                        )
                                    )
                                ),
                                React.createElement(
                                    "div",
                                    { className: "row" },
                                    React.createElement(
                                        "div",
                                        { className: "col" },
                                        React.createElement(
                                            "p",
                                            null,
                                            institution.description
                                        )
                                    )
                                )
                            )
                        ),
                        this.renderComp(role, pageMode, institution, isAdmin, this.props.togglePageMode, this.props.deleteInstitution)
                    );
                }
            } else if (pageMode == 'edit') {
                return React.createElement(
                    "div",
                    { id: "institution-details", className: "row justify-content-center" },
                    React.createElement(
                        "div",
                        { id: "institution-edit", className: "col-xl-6 col-lg-6 border pb-3 mb-2" },
                        React.createElement(
                            "form",
                            null,
                            React.createElement(
                                React.Fragment,
                                null,
                                this.renderHeader(institutionId)
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group" },
                                React.createElement(
                                    "label",
                                    { id: "institution-name", htmlFor: "institution-details-name" },
                                    "Name"
                                ),
                                React.createElement("input", { id: "institution-details-name", className: "form-control mb-1 mr-sm-2",
                                    type: "text", defaultValue: institution.name, onChange: this.props.handleChange })
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group" },
                                React.createElement(
                                    "label",
                                    { id: "institution-url", htmlFor: "institution-details-url" },
                                    "URL"
                                ),
                                React.createElement("input", { id: "institution-details-url", type: "text", className: "form-control mb-1 mr-sm-2",
                                    defaultValue: institution.url, onChange: this.props.handleChange })
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group" },
                                React.createElement(
                                    "label",
                                    { id: "institution-logo-selector", htmlFor: "institution-logo" },
                                    "Logo"
                                ),
                                React.createElement("input", { id: "institution-logo", className: "form-control mb-1 mr-sm-2", type: "file",
                                    accept: "image/*" })
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group" },
                                React.createElement(
                                    "label",
                                    { id: "institution-description",
                                        htmlFor: "institution-details-description" },
                                    "Description"
                                ),
                                React.createElement(
                                    "textarea",
                                    { id: "institution-details-description", className: "form-control",
                                        rows: "4",
                                        onChange: this.props.handleChange },
                                    institution.description
                                )
                            ),
                            this.renderButtons(institutionId, institution, pageMode, this.props.togglePageMode, this.props.cancelChanges)
                        )
                    )
                );
            }
        }
    }]);

    return InstitutionDescription;
}(React.Component);

var ImageryList = function (_React$Component3) {
    _inherits(ImageryList, _React$Component3);

    function ImageryList(props) {
        _classCallCheck(this, ImageryList);

        var _this7 = _possibleConstructorReturn(this, (ImageryList.__proto__ || Object.getPrototypeOf(ImageryList)).call(this, props));

        _this7.state = {
            imagery: _this7.props.imagery,
            institutionId: _this7.props.institutionId,
            documentRoot: _this7.props.documentRoot,
            imageryMode: "view",
            newImageryTitle: "",
            newImageryAttribution: "",
            newGeoServerURL: "",
            newLayerName: "",
            newGeoServerParams: ""
        };
        _this7.toggleImageryMode = _this7.toggleImageryMode.bind(_this7);
        _this7.addCustomImagery = _this7.addCustomImagery.bind(_this7);
        _this7.handleChange = _this7.handleChange.bind(_this7);
        _this7.deleteImagery = _this7.deleteImagery.bind(_this7);
        return _this7;
    }

    _createClass(ImageryList, [{
        key: "addCustomImagery",
        value: function addCustomImagery() {
            var newImageryTitle = this.state.newImageryTitle;
            var institution = this.props.institution;
            var ref = this;
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
                ref.props.getImagery();
            });
            this.setState({ newImageryTitle: "" });
            this.setState({ newImageryAttribution: "" });
            this.setState({ newGeoServerURL: "" });
            this.setState({ newLayerName: "" });
            this.setState({ newGeoServerParams: "" });
        }
    }, {
        key: "toggleImageryMode",
        value: function toggleImageryMode(imageryMode) {
            if (imageryMode == "view") {
                this.setState({ imageryMode: "edit" });
            } else {
                this.addCustomImagery(this.props.getImagery);
                this.setState({ imageryMode: "view" });
            }
        }
    }, {
        key: "deleteImagery",
        value: function deleteImagery(documentRoot, imageryId, name, institutionId) {
            if (confirm("Do you REALLY want to delete this imagery?!")) {
                var ref = this;
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
                    ref.props.getImagery();
                });
            }
        }
    }, {
        key: "cancelAddCustomImagery",
        value: function cancelAddCustomImagery() {
            this.setState({ imageryMode: "view" });
        }
    }, {
        key: "handleChange",
        value: function handleChange(event) {
            var target = event.target;
            var value = target.value;
            var name = target.id;
            this.setState(_defineProperty({}, name, value));
        }
    }, {
        key: "render",
        value: function render() {
            var _this8 = this;

            var institution = this.props.institution;
            var isAdmin = this.props.isAdmin;
            var imageryMode = this.state.imageryMode;
            if (this.props.imagery.length > 0) {
                if (imageryMode == 'view') {
                    return React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(ImageryButton, { institution: institution,
                            toggleImageryMode: function toggleImageryMode() {
                                return _this8.toggleImageryMode(imageryMode);
                            },
                            isAdmin: isAdmin }),
                        this.props.imagery.map(function (imageryItem) {
                            return React.createElement(Imagery, { institution: institution, title: imageryItem.title,
                                imageryId: imageryItem.id, isAdmin: isAdmin,
                                deleteImagery: function deleteImagery() {
                                    return _this8.deleteImagery(_this8.props.documentRoot, imageryItem.id, _this8.props.institution.name, _this8.props.institutionId);
                                } });
                        })
                    );
                } else if (isAdmin == true && imageryMode == 'edit') {
                    return React.createElement(
                        "div",
                        { className: "row", id: "add-imagery" },
                        React.createElement(
                            "div",
                            { className: "col" },
                            React.createElement(
                                "form",
                                { className: "mb-2 p-2 border rounded" },
                                React.createElement(
                                    "div",
                                    { className: "form-group" },
                                    React.createElement(
                                        "label",
                                        { htmlFor: "newImageryTitle" },
                                        "Title"
                                    ),
                                    React.createElement("input", { className: "form-control", id: "newImageryTitle", type: "text",
                                        name: "imagery-title", autoComplete: "off",
                                        onChange: this.handleChange, defaultValue: this.state.newImageryTitle })
                                ),
                                React.createElement(
                                    "div",
                                    { className: "form-group" },
                                    React.createElement(
                                        "label",
                                        { htmlFor: "newImageryAttribution" },
                                        "Attribution"
                                    ),
                                    React.createElement("input", { className: "form-control", id: "newImageryAttribution", type: "text",
                                        name: "imagery-attribution", autoComplete: "off",
                                        onChange: this.handleChange,
                                        defaultValue: this.state.newImageryAttribution })
                                ),
                                React.createElement(
                                    "div",
                                    { className: "form-group" },
                                    React.createElement(
                                        "label",
                                        { htmlFor: "newGeoServerURL" },
                                        "GeoServer URL"
                                    ),
                                    React.createElement("input", { className: "form-control", id: "newGeoServerURL", type: "text",
                                        name: "imagery-geoserver-url", autoComplete: "off",
                                        onChange: this.handleChange, defaultValue: this.state.newGeoServerURL })
                                ),
                                React.createElement(
                                    "div",
                                    { className: "form-group" },
                                    React.createElement(
                                        "label",
                                        { htmlFor: "newLayerName" },
                                        "GeoServer Layer Name"
                                    ),
                                    React.createElement("input", { className: "form-control", id: "newLayerName", type: "text",
                                        name: "imagery-layer-name", autoComplete: "off",
                                        onChange: this.handleChange, defaultValue: this.state.newLayerName })
                                ),
                                React.createElement(
                                    "div",
                                    { className: "form-group" },
                                    React.createElement(
                                        "label",
                                        { htmlFor: "newGeoServerParams" },
                                        "GeoServer Params",
                                        React.createElement("br", null),
                                        "(as JSON string)"
                                    ),
                                    React.createElement("input", { className: "form-control", id: "newGeoServerParams", type: "text",
                                        name: "imagery-geoserver-params", autoComplete: "off",
                                        onChange: this.handleChange, defaultValue: this.state.newGeoServerParams })
                                ),
                                React.createElement(
                                    "div",
                                    { className: "btn-group-vertical btn-block" },
                                    React.createElement(
                                        "button",
                                        { id: "add-imagery-button",
                                            className: "btn btn-sm btn-block btn-outline-yellow btn-group",
                                            onClick: function onClick() {
                                                return _this8.toggleImageryMode(imageryMode);
                                            } },
                                        React.createElement("i", { className: "fa fa-plus-square" }),
                                        " Add New Imagery"
                                    ),
                                    React.createElement(
                                        "button",
                                        { className: "btn btn-sm btn-block btn-outline-danger btn-group",
                                            onClick: function onClick() {
                                                return _this8.cancelAddCustomImagery;
                                            } },
                                        "Cancel"
                                    )
                                )
                            )
                        )
                    );
                }
            } else {
                return React.createElement("span", null);
            }
        }
    }]);

    return ImageryList;
}(React.Component);

function Imagery(props) {
    if (props.isAdmin == false) {
        return React.createElement(
            "div",
            { className: "row mb-1" },
            React.createElement(
                "div",
                { className: "col mb-1" },
                React.createElement(
                    "button",
                    { className: "btn btn-outline-lightgreen btn-sm btn-block" },
                    props.title
                )
            )
        );
    } else {
        return React.createElement(
            "div",
            { className: "row mb-1" },
            React.createElement(
                "div",
                { className: "col-10 pr-1" },
                React.createElement(
                    "button",
                    { className: "btn btn-outline-lightgreen btn-sm btn-block" },
                    props.title
                )
            ),
            React.createElement(
                "div",
                { className: "col-2 pl-0" },
                React.createElement(
                    "button",
                    { className: "btn btn-outline-danger btn-sm btn-block", id: "delete-imagery", type: "button",
                        onClick: props.deleteImagery },
                    React.createElement(
                        "span",
                        { className: "d-none d-xl-block" },
                        " Delete "
                    ),
                    React.createElement(
                        "span",
                        { className: "d-xl-none" },
                        React.createElement("i", { className: "fa fa-trash-alt" })
                    )
                )
            )
        );
    }
}

function ImageryButton(props) {
    if (props.isAdmin == true) {
        return React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col-lg-12 mb-1" },
                React.createElement(
                    "button",
                    { type: "button", id: "add-imagery-button",
                        className: "btn btn-sm btn-block btn-outline-yellow",
                        onClick: props.toggleImageryMode },
                    React.createElement("i", { className: "fa fa-plus-square" }),
                    "Add New Imagery"
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

var ProjectList = function (_React$Component4) {
    _inherits(ProjectList, _React$Component4);

    function ProjectList(props) {
        _classCallCheck(this, ProjectList);

        var _this9 = _possibleConstructorReturn(this, (ProjectList.__proto__ || Object.getPrototypeOf(ProjectList)).call(this, props));

        _this9.state = {
            projects: _this9.props.projects
        };
        _this9.createProject = _this9.createProject.bind(_this9);
        return _this9;
    }

    _createClass(ProjectList, [{
        key: "createProject",
        value: function createProject() {
            if (this.props.institutionId == 0) {
                alert("Please finish creating the institution before adding projects to it.");
            } else if (this.props.institutionId == -1) {
                alert("Projects cannot be created without first selecting an institution.");
            } else {
                window.location = this.props.documentRoot + "/project/0?institution=" + this.props.institutionId;
            }
        }
    }, {
        key: "render",
        value: function render() {
            var _this10 = this;

            var institution = this.props.institution;

            if (this.props.isAdmin == true) {
                return React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(ProjectButton, { createProject: this.createProject }),
                    this.props.projects.map(function (project) {
                        return React.createElement(Project, { documentRoot: _this10.props.documentRoot,
                            proj: project,
                            institution: institution,
                            isAdmin: _this10.props.isAdmin });
                    })
                );
            } else {
                return React.createElement(
                    React.Fragment,
                    null,
                    this.props.projects.map(function (project) {
                        return React.createElement(Project, { documentRoot: _this10.props.documentRoot,
                            proj: project,
                            institution: institution,
                            isAdmin: _this10.props.isAdmin });
                    })
                );
            }
        }
    }]);

    return ProjectList;
}(React.Component);

function Project(props) {
    var documentRoot = props.documentRoot;
    var project = props.proj;
    if (props.isAdmin == true) {
        return React.createElement(
            "div",
            { className: "row mb-1" },
            React.createElement(
                "div",
                { className: "col-9 pr-1" },
                React.createElement(
                    "a",
                    { className: "btn btn-sm btn-outline-lightgreen btn-block",
                        href: documentRoot + "/collection/" + project.id },
                    project.name
                )
            ),
            React.createElement(
                "div",
                { className: "col-3 pl-0" },
                React.createElement(
                    "a",
                    { className: "btn btn-sm btn-outline-lightgreen btn-block",
                        href: documentRoot + "/project/" + project.id },
                    React.createElement(
                        "span",
                        { className: "d-xl-none" },
                        React.createElement("i", { className: "fa fa-edit" })
                    ),
                    React.createElement(
                        "span",
                        {
                            className: "d-none d-xl-block" },
                        " Review"
                    )
                )
            )
        );
    } else {
        return React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col mb-1 pr-1" },
                React.createElement(
                    "a",
                    { className: "btn btn-sm btn-outline-lightgreen btn-block",
                        href: documentRoot + "/collection/" + project.id },
                    project.name
                )
            )
        );
    }
}

function ProjectButton(props) {
    return React.createElement(
        "div",
        { className: "row mb-1" },
        React.createElement(
            "div",
            { className: "col" },
            React.createElement(
                "button",
                { id: "create-project", type: "button", className: "btn btn-sm btn-block btn-outline-yellow",
                    onClick: props.createProject },
                React.createElement("i", { className: "fa fa-plus-square" }),
                " Create New Project"
            )
        )
    );
}

var UserList = function (_React$Component5) {
    _inherits(UserList, _React$Component5);

    function UserList(props) {
        _classCallCheck(this, UserList);

        var _this11 = _possibleConstructorReturn(this, (UserList.__proto__ || Object.getPrototypeOf(UserList)).call(this, props));

        _this11.state = {
            users: _this11.props.users,
            institutionId: _this11.props.institutionId,
            isAdmin: _this11.props.isAdmin,
            pageMode: _this11.props.pageMode,
            institutionRole: ""
        };
        _this11.updateUserInstitutionRole = _this11.updateUserInstitutionRole.bind(_this11);
        return _this11;
    }

    _createClass(UserList, [{
        key: "updateUserInstitutionRole",
        value: function updateUserInstitutionRole(userId, email, role, e) {
            var userOldId = this.props.userId;
            var isAdmin = this.props.isAdmin;
            var documentRoot = this.props.documentRoot;
            var institutionId = this.props.institutionId;
            var ref = this;
            if (e != undefined) {
                role = e.target.value;
            }
            var jsonStr = {
                userId: userId,
                institutionId: institutionId,
                role: role
            };
            //ref.setState({institutionRole:rolee });
            var usersNew = ref.props.users;
            var userLst = usersNew.map(function (user) {
                if (user.id == userId) {
                    ;user.institutionRole = role;
                }
                return user;
            });
            ref.setState({ users: userLst });

            $.ajax({
                url: documentRoot + "/update-user-institution-role",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
                data: JSON.stringify(jsonStr)
            }).fail(function () {
                alert("Error updating user institution role. See console for details.");
            }).done(function (data) {
                alert("User " + email + " has been given role '" + role + "'.");
                if (userId == userOldId && role != "admin") {
                    ref.setState({ pageMode: pageMode });
                    ref.setState({ isAdmin: isAdmin });
                }
                ref.props.getUsers();
            });
        }
    }, {
        key: "render",
        value: function render() {
            var _this12 = this;

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(UserButton, { userId: this.props.userId, documentRoot: this.props.documentRoot,
                    institutionId: this.props.institutionId, institution: this.props.institution,
                    isAdmin: this.props.isAdmin, users: this.props.users,
                    usersCompleteList: this.props.usersCompleteList,
                    updateUserInstitutionRole: this.updateUserInstitutionRole }),
                this.props.users.map(function (user) {
                    return React.createElement(User, { documentRoot: _this12.props.documentRoot, user: user,
                        institution: _this12.props.institution, isAdmin: _this12.state.isAdmin, institutionRole: _this12.state.institutionRole,
                        pageMode: _this12.state.pageMode,
                        updateUserInstitutionRole: _this12.updateUserInstitutionRole });
                })
            );
        }
    }]);

    return UserList;
}(React.Component);

var User = function (_React$Component6) {
    _inherits(User, _React$Component6);

    function User(props) {
        _classCallCheck(this, User);

        var _this13 = _possibleConstructorReturn(this, (User.__proto__ || Object.getPrototypeOf(User)).call(this, props));

        _this13.state = {
            institutionRole: _this13.props.institutionRole
        };
        return _this13;
    }

    _createClass(User, [{
        key: "render",
        value: function render() {
            var _this14 = this;

            var user = this.props.user;
            var documentRoot = this.props.documentRoot;
            if (this.props.isAdmin == false && user.institutionRole != 'pending') {
                return React.createElement(
                    "div",
                    { className: "row" },
                    React.createElement(
                        "div",
                        { className: "col mb-1" },
                        React.createElement(
                            "a",
                            { className: "btn btn-sm btn-outline-lightgreen btn-block",
                                href: documentRoot + "/account/" + user.id },
                            user.email
                        )
                    )
                );
            }
            if (this.props.isAdmin == true) {
                if (user.institutionRole == 'pending') {
                    return React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                            "div",
                            { className: "row" },
                            React.createElement(
                                "div",
                                { className: "col-lg-9 mb-1 pr-1" },
                                React.createElement(
                                    "a",
                                    { className: "btn btn-sm btn-outline-lightgreen btn-block",
                                        href: documentRoot + "/account/" + user.id },
                                    user.email
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "col-lg-3 mb-1 pl-0" },
                                React.createElement(
                                    "select",
                                    { value: user.institutionRole, className: "custom-select custom-select-sm",
                                        name: "user-institution-role", size: "1",
                                        onChange: function onChange(e) {
                                            return _this14.props.updateUserInstitutionRole(user.id, user.email, user.institutionRole, e);
                                        } },
                                    React.createElement(
                                        "option",
                                        { value: "pending" },
                                        "Pending"
                                    ),
                                    React.createElement(
                                        "option",
                                        { value: "member" },
                                        "Member"
                                    ),
                                    React.createElement(
                                        "option",
                                        { value: "admin" },
                                        "Admin"
                                    ),
                                    React.createElement(
                                        "option",
                                        { value: "not-member" },
                                        "Remove"
                                    )
                                )
                            )
                        )
                    );
                } else {
                    return React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                            "div",
                            { className: "row" },
                            React.createElement(
                                "div",
                                { className: "col-lg-9 mb-1 pr-1" },
                                React.createElement(
                                    "a",
                                    { className: "btn btn-sm btn-outline-lightgreen btn-block",
                                        href: documentRoot + "/account/" + user.id },
                                    user.email
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "col-lg-3 mb-1 pl-0" },
                                React.createElement(
                                    "select",
                                    { value: user.institutionRole, className: "custom-select custom-select-sm",
                                        name: "user-institution-role", size: "1",
                                        onChange: function onChange(e) {
                                            return _this14.props.updateUserInstitutionRole(user.id, user.email, user.institutionRole, e);
                                        } },
                                    React.createElement(
                                        "option",
                                        { value: "member" },
                                        "Member"
                                    ),
                                    React.createElement(
                                        "option",
                                        { value: "admin" },
                                        "Admin"
                                    ),
                                    React.createElement(
                                        "option",
                                        { value: "not-member" },
                                        "Remove"
                                    )
                                )
                            )
                        )
                    );
                }
            } else {
                return React.createElement("span", null);
            }
        }
    }]);

    return User;
}(React.Component);

var UserButton = function (_React$Component7) {
    _inherits(UserButton, _React$Component7);

    function UserButton(props) {
        _classCallCheck(this, UserButton);

        var _this15 = _possibleConstructorReturn(this, (UserButton.__proto__ || Object.getPrototypeOf(UserButton)).call(this, props));

        _this15.state = {
            newUserEmail: "",
            userList: _this15.props.users
        };
        _this15.addUser = _this15.addUser.bind(_this15);
        _this15.handleChange = _this15.handleChange.bind(_this15);
        _this15.isInstitutionMember = _this15.isInstitutionMember.bind(_this15);
        _this15.handleChange = _this15.handleChange.bind(_this15);
        return _this15;
    }

    _createClass(UserButton, [{
        key: "handleChange",
        value: function handleChange(event) {
            var target = event.target;
            var value = target.value;
            this.setState({
                newUserEmail: value
            });
        }
    }, {
        key: "addUser",
        value: function addUser() {
            if (this.state.newUserEmail == "") {
                alert("Please enter an existing user's email address.");
            } else if (this.findUserByEmail(this.props.users, this.state.newUserEmail)) {
                alert(this.state.newUserEmail + " is already a member of this institution.");
            } else {
                var newUser = this.findUserByEmail(this.props.usersCompleteList, this.state.newUserEmail);
                if (newUser) {
                    this.props.updateUserInstitutionRole(newUser.id, newUser.email, "member");
                    this.setState({ newUserEmail: "" });
                } else {
                    alert(this.state.newUserEmail + " is not an existing user's email address.");
                }
            }
        }
    }, {
        key: "findUserByEmail",
        value: function findUserByEmail(userList, email) {
            return userList.find(function (user) {
                return user.email == email;
            });
        }
    }, {
        key: "isInstitutionMember",
        value: function isInstitutionMember(userId) {
            console.log("is inst mem");
            return userId == 1 || this.props.users.some(function (user) {
                return user.id == userId;
            });
        }
    }, {
        key: "requestMembership",
        value: function requestMembership(userId, institutionId, documentRoot) {
            $.ajax({
                url: documentRoot + "/request-institution-membership",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: "application/json",
                data: JSON.stringify({
                    institutionId: institutionId,
                    userId: parseInt(userId)
                })
            }).fail(function () {
                alert("Error requesting institution membership. See console for details.");
            }).done(function (data) {
                alert("Membership requested for user " + userId + ".");
                utils.disable_element("request-membership-button");
            });
        }
    }, {
        key: "render",
        value: function render() {
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(AddUser, { isAdmin: this.props.isAdmin, handleChange: this.handleChange,
                    newUserEmail: this.state.newUserEmail, addUser: this.addUser }),
                React.createElement(RequestMembership, { requestMembership: this.requestMembership, documentRoot: this.props.documentRoot,
                    userId: this.props.userId, institutionId: this.props.institutionId,
                    isInstitutionMember: this.isInstitutionMember(this.props.userId) })
            );
        }
    }]);

    return UserButton;
}(React.Component);

function AddUser(props) {
    if (props.isAdmin == true) {
        return React.createElement(
            React.Fragment,
            null,
            React.createElement(
                "div",
                { className: "row mb-1" },
                React.createElement(
                    "div",
                    { className: "col-9 pr-1" },
                    React.createElement("input", { className: "form-control form-control-sm", type: "email", name: "new-institution-user",
                        autoComplete: "off",
                        placeholder: "Email", onChange: props.handleChange,
                        value: props.newUserEmail })
                ),
                React.createElement(
                    "div",
                    { className: "col-3 pl-0" },
                    React.createElement(
                        "button",
                        { className: "btn btn-sm btn-outline-yellow btn-block", name: "add-institution-user",
                            onClick: props.addUser },
                        React.createElement(
                            "span",
                            { className: "d-xl-none" },
                            React.createElement("i", { className: "fa fa-plus-square" })
                        ),
                        React.createElement(
                            "span",
                            { className: "d-none d-xl-block" },
                            " Add User"
                        )
                    )
                )
            )
        );
    } else return React.createElement("span", null);
}

function RequestMembership(props) {
    if (props.userId != '' && props.institutionId > 0 && !props.isInstitutionMember) {
        console.log("in ifffff");
        return React.createElement(
            React.Fragment,
            null,
            React.createElement(
                "div",
                null,
                React.createElement(
                    "button",
                    { className: "btn btn-sm btn-outline-yellow btn-block mb-2",
                        id: "request-membership-button",
                        name: "request-membership-button",
                        onClick: function onClick() {
                            return props.requestMembership(props.userId, props.institutionId, props.documentRoot);
                        } },
                    React.createElement("i", { className: "fa fa-plus-square" }),
                    " Request membership"
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}