var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var mapConfigMercator = "";

var Home = function (_React$Component) {
    _inherits(Home, _React$Component);

    function Home(props) {
        _classCallCheck(this, Home);

        var _this = _possibleConstructorReturn(this, (Home.__proto__ || Object.getPrototypeOf(Home)).call(this, props));

        _this.state = {
            documentRoot: props.documentRoot,
            userId: props.userId,
            username: props.username,
            projects: []
        };
        return _this;
    }

    _createClass(Home, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            var _this2 = this;

            //get projects
            fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.state.userId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this2.setState({ projects: data });
            });
        }
    }, {
        key: "render",
        value: function render() {
            var projects = this.state.projects;

            return React.createElement(
                "div",
                { id: "bcontainer" },
                React.createElement("span", { id: "mobilespan" }),
                React.createElement(
                    "div",
                    { className: "Wrapper" },
                    React.createElement(
                        "div",
                        { className: "row tog-effect" },
                        React.createElement(SideBar, { projects: projects, documentRoot: this.state.documentRoot,
                            username: this.state.username }),
                        React.createElement(MapPanel, { projects: projects, documentRoot: this.state.documentRoot,
                            userId: this.state.userId })
                    )
                )
            );
        }
    }]);

    return Home;
}(React.Component);

var MapPanel = function (_React$Component2) {
    _inherits(MapPanel, _React$Component2);

    function MapPanel(props) {
        _classCallCheck(this, MapPanel);

        var _this3 = _possibleConstructorReturn(this, (MapPanel.__proto__ || Object.getPrototypeOf(MapPanel)).call(this, props));

        _this3.state = {
            projects: [],
            documentRoot: props.documentRoot,
            imagery: []
        };
        return _this3;
    }

    _createClass(MapPanel, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            var _this4 = this;

            //get projects
            fetch(this.state.documentRoot + "/get-all-projects?userId=" + this.props.userId).then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this4.setState({ projects: data });
            });
            //get imagery
            fetch(this.state.documentRoot + "/get-all-imagery").then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this4.setState({ imagery: data });
            });
            setTimeout(function () {
                _this4.showProjectMap(_this4.state.projects, _this4.state.imagery, _this4.state.documentRoot);
            }, 250);
        }
    }, {
        key: "showProjectMap",
        value: function showProjectMap(projects, imagery, documentRoot) {
            if (imagery.length > 0) {
                var mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, imagery);
                mapConfigMercator = mapConfig;
                mercator.setVisibleLayer(mapConfig, imagery[0].title);
                if (projects.length > 0) {
                    mercator.addProjectMarkersAndZoom(mapConfig, projects, documentRoot, 40); // clusterDistance = 40, use null to disable clustering
                }
            }
        }
    }, {
        key: "render",
        value: function render() {
            // {
            //     this.showProjectMap(this.state.projects, this.state.imagery, this.state.documentRoot)
            // }
            // ;
            return React.createElement(
                "div",
                { id: "mapPanel", className: "col-lg-9 col-md-12 pl-0 pr-0" },
                React.createElement(
                    "div",
                    { className: "row no-gutters ceo-map-toggle" },
                    React.createElement(
                        "div",
                        { id: "togbutton", className: "button col-xl-1 bg-lightgray d-none d-xl-block" },
                        React.createElement(
                            "div",
                            { className: "row h-100" },
                            React.createElement(
                                "div",
                                { className: "col-lg-12 my-auto no-gutters text-center" },
                                React.createElement(
                                    "span",
                                    { id: "tog-symb" },
                                    React.createElement("i", { className: "fa fa-caret-left" })
                                )
                            )
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "col-xl-11 mr-0 ml-0 bg-lightgray" },
                        React.createElement("div", { id: "home-map-pane", style: { width: '100%', height: '100%', position: 'fixed' } })
                    )
                )
            );
        }
    }]);

    return MapPanel;
}(React.Component);

function SideBar(props) {
    return React.createElement(
        "div",
        { id: "lPanel", className: "col-lg-3 pr-0 pl-0" },
        React.createElement(
            "div",
            { className: "bg-darkgreen" },
            React.createElement(
                "h1",
                { className: "tree_label", id: "panelTitle" },
                "Institutions"
            )
        ),
        React.createElement(
            "ul",
            { className: "tree" },
            React.createElement(CreateInstitutionButton, { username: props.username, documentRoot: props.documentRoot }),
            React.createElement(InstitutionList, { projects: props.projects, documentRoot: props.documentRoot })
        )
    );
}

function CreateInstitutionButton(props) {
    if (props.username != "") {
        return React.createElement(
            "a",
            { className: "create-institution", href: props.documentRoot + "/institution/0" },
            React.createElement(
                "li",
                { className: "bg-yellow text-center p-2" },
                React.createElement("i", { className: "fa fa-file" }),
                " Create New Institution"
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

var InstitutionList = function (_React$Component3) {
    _inherits(InstitutionList, _React$Component3);

    function InstitutionList(props) {
        _classCallCheck(this, InstitutionList);

        var _this5 = _possibleConstructorReturn(this, (InstitutionList.__proto__ || Object.getPrototypeOf(InstitutionList)).call(this, props));

        _this5.state = {
            institutions: [],
            documentRoot: props.documentRoot
        };
        return _this5;
    }

    _createClass(InstitutionList, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            var _this6 = this;

            //get institutions
            fetch(this.state.documentRoot + "/get-all-institutions").then(function (response) {
                return response.json();
            }).then(function (data) {
                return _this6.setState({ institutions: data });
            });
        }
    }, {
        key: "render",
        value: function render() {
            var _this7 = this;

            var projects = this.props.projects;

            return this.state.institutions.map(function (institution) {
                return React.createElement(Institution, { id: institution.id, name: institution.name, projects: projects,
                    documentRoot: _this7.state.documentRoot });
            });
        }
    }]);

    return InstitutionList;
}(React.Component);

function Institution(props) {
    var institutionId = props.id;
    var projects = props.projects;
    var institutionName = props.name;

    return React.createElement(
        "li",
        { key: institutionId },
        React.createElement(
            "div",
            { className: "btn bg-lightgreen btn-block m-0 p-2 rounded-0",
                "data-toggle": "collapse",
                href: "#collapse" + institutionId, role: "button",
                "aria-expanded": "false" },
            React.createElement(
                "div",
                { className: "row" },
                React.createElement(
                    "div",
                    { className: "col-lg-10 my-auto" },
                    React.createElement(
                        "p",
                        { className: "tree_label text-white m-0",
                            htmlFor: "c" + institutionId },
                        React.createElement("input", { type: "checkbox", className: "d-none",
                            id: "c" + institutionId }),
                        React.createElement(
                            "span",
                            { className: "" },
                            institutionName
                        )
                    )
                ),
                React.createElement(
                    "div",
                    { className: "col-lg-1" },
                    React.createElement(
                        "a",
                        { className: "institution_info btn btn-sm btn-outline-lightgreen",
                            href: props.documentRoot + "/institution/" + institutionId },
                        React.createElement("i", { className: "fa fa-info", style: { color: 'white' } })
                    )
                )
            )
        ),
        React.createElement(ProjectList, { id: institutionId, projects: projects, documentRoot: props.documentRoot })
    );
}

function ProjectList(props) {
    var institutionId = props.id;
    return React.createElement(
        "div",
        { className: "collapse", id: "collapse" + institutionId },
        props.projects.map(function (project) {
            return React.createElement(Project, { id: project.id, institutionId: institutionId, editable: project.editable,
                name: project.name, documentRoot: props.documentRoot,
                institution: parseInt(project.institution) });
        })
    );
}

function Project(props) {
    if (props.institution == props.institutionId) {
        if (props.editable == true) {
            return React.createElement(
                "div",
                { "class": "bg-lightgrey text-center p-1 row px-auto" },
                React.createElement(
                    "div",
                    { "class": "col-lg-8 pr-lg-1" },
                    React.createElement(
                        "a",
                        { className: "view-project btn btn-sm btn-outline-lightgreen btn-block",
                            href: props.documentRoot + "/collection/" + props.id },
                        props.name
                    )
                ),
                React.createElement(
                    "div",
                    { className: "col-lg-4 pl-lg-0" },
                    React.createElement(
                        "a",
                        { className: "edit-project btn btn-sm btn-outline-yellow btn-block",
                            href: props.documentRoot + "/project/" + props.id },
                        React.createElement("i", { className: "fa fa-edit" }),
                        " Review"
                    )
                )
            );
        } else {
            return React.createElement(
                "div",
                { className: "bg-lightgrey text-center p-1 row" },
                React.createElement(
                    "div",
                    { className: "col mb-1 mx-0" },
                    React.createElement(
                        "a",
                        { className: "btn btn-sm btn-outline-lightgreen btn-block",
                            href: props.documentRoot + "/collection/" + props.id },
                        props.name
                    )
                )
            );
        }
    } else return React.createElement("span", null);
}
//=========================================
// Render Root Component
//=========================================