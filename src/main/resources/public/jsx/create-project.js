import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock } from "./components/FormComponents";
import { ProjectInfo, ProjectAOI, PlotReview, SampleReview } from "./components/ProjectComponents";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { SurveyDesign } from "./components/SurveyDesign";
import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";
import { encodeFileAsBase64 } from "./utils/fileUtils";

const blankProject = {
    archived: false,
    availability: "nonexistent",
    baseMapSource: "",
    boundary: null,
    description: "",
    id: 0,
    name: "",
    numPlots: "",
    plotDistribution: "random",
    plotShape: "circle",
    plotSize: "",
    plotSpacing: "",
    privacyLevel: "institution",
    sampleDistribution: "random",
    sampleResolution: "",
    samplesPerPlot: "",
    surveyQuestions: [],
    surveyRules: [],
};

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: blankProject,
            useTemplatePlots: false,
            useTemplateWidgets: false,
            imageryList: [],
            mapConfig: null,
            plotList: [],
            coordinates: {
                lonMin: "",
                latMin: "",
                lonMax: "",
                latMax: "",
            },
            projectList: [],
            showModal: false,
        };
    }

    componentDidMount() {
        this.getImageryList();
        this.getProjectList();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.imageryList.length > 0 && prevState.imageryList.length === 0) {
            this.initProjectMap();
        }

        if (this.state.mapConfig && this.state.projectDetails.id > 0
            && this.state.projectDetails.id !== prevState.projectDetails.id) {
            this.getProjectPlots();
        }

        if (this.state.mapConfig
            && this.state.projectDetails.baseMapSource !== prevState.projectDetails.baseMapSource) {

            mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource);
        }

        if (this.state.mapConfig
            && (this.state.mapConfig !== prevState.mapConfig
                || this.state.projectDetails.id !== prevState.projectDetails.id
                || this.state.useTemplatePlots !== prevState.useTemplatePlots)) {

            if (this.state.projectDetails.id > 0 && this.state.useTemplatePlots) {
                this.showTemplateBounds();
            } else {
                mercator.removeLayerByTitle(this.state.mapConfig, "projectPlots");
                this.showDragBoxDraw(this.state.projectDetails.id === 0);
            }
        }

        // Wait to draw plots until the plot list is loaded.
        if (this.state.mapConfig && this.state.plotList.length > 0 && this.state.useTemplatePlots
            && (prevState.plotList.length === 0 || !prevState.useTemplatePlots)) {
            this.showTemplatePlots();
        }

        // Set sample distribution to a valid choice based on plot selection
        if (this.state.projectDetails.plotDistribution !== prevState.projectDetails.plotDistribution) {
            const { plotDistribution, sampleDistribution } = this.state.projectDetails;
            this.setProjectDetail("sampleDistribution", ["random", "gridded"].includes(plotDistribution)
                                      && ["csv", "shp"].includes(sampleDistribution) ? "random"
                                        : plotDistribution === "shp"
                                              && ["random", "gridded"].includes(sampleDistribution) ? "shp"
                                            : sampleDistribution);
        }
    }

    createProject = () => {
        if (this.validateProject() && confirm("Do you REALLY want to create this project?")) {
            this.setState({ showModal: true }, this.createProjectApi);
        }
    };

    createProjectApi = () =>
        fetch(this.props.documentRoot + "/create-project",
              {
                  method: "POST",
                  contentType: "application/json; charset=utf-8",
                  body: JSON.stringify({
                      institutionId: this.props.institutionId,
                      lonMin: this.state.coordinates.lonMin,
                      lonMax: this.state.coordinates.lonMax,
                      latMin: this.state.coordinates.latMin,
                      latMax: this.state.coordinates.latMax,
                      baseMapSource: this.state.projectDetails.baseMapSource,
                      description: this.state.projectDetails.description,
                      name: this.state.projectDetails.name,
                      numPlots: this.state.projectDetails.numPlots,
                      plotDistribution: this.state.projectDetails.plotDistribution,
                      plotShape: this.state.projectDetails.plotShape,
                      plotSize: this.state.projectDetails.plotSize,
                      plotSpacing: this.state.projectDetails.plotSpacing,
                      privacyLevel: this.state.projectDetails.privacyLevel,
                      projectTemplate: this.state.projectDetails.id,
                      sampleDistribution: this.state.projectDetails.sampleDistribution,
                      samplesPerPlot: this.state.projectDetails.samplesPerPlot,
                      sampleResolution: this.state.projectDetails.sampleResolution,
                      sampleValues: this.state.projectDetails.surveyQuestions,
                      surveyRules: this.state.projectDetails.surveyRules,
                      plotFileName: this.state.projectDetails.plotFileName,
                      plotFileBase64: this.state.projectDetails.plotFileBase64,
                      sampleFileName: this.state.projectDetails.sampleFileName,
                      sampleFileBase64: this.state.projectDetails.sampleFileBase64,
                      useTemplatePlots: this.state.useTemplatePlots,
                      useTemplateWidgets: this.state.useTemplateWidgets,
                  }),
              }
        )
            .then(response => Promise.all([response.ok, response.json()]))
            .then(data => {
                const isInteger = n => !isNaN(parseInt(n)) && isFinite(n) && !n.includes(".");
                if (data[0] && isInteger(data[1].projectId)) {
                    window.location = this.props.documentRoot + "/review-project?projectId=" + data[1].projectId;
                    return Promise.resolve();
                } else {
                    return Promise.reject(data[1].errorMessage);
                }
            })
            .catch(message => {
                alert("Error creating project.\n\n" + message);
                this.setState({ showModal: false });
            });

    validateProject = () => {
        const { projectDetails } = this.state;
        // FIXME Disable for now until we can add a type specifically meant to have 1 or 0 answers
        // const minAnswers = (componentType) => (componentType || "").toLowerCase() === "input" ? 1 : 2;

        if (projectDetails.name === "" || projectDetails.description === "") {
            alert("A project must contain a name and description.");
            return false;

        } else if (!this.state.useTemplatePlots && !this.validatePlotData()) {
            return false;

        } else if (projectDetails.surveyQuestions.length === 0) {
            alert("A survey must include at least one question.");
            return false;

        } else if (projectDetails.surveyQuestions.some(sq => sq.answers.length === 0)) {
            alert("All survey questions must contain at least one answer.");
            return false;

        } else {
            return true;
        }
    };

    validatePlotData = () => {
        const { projectDetails, coordinates } = this.state;
        if (["random", "gridded"].includes(projectDetails.plotDistribution) && coordinates.latMax === "") {
            alert("Please select a boundary");
            return false;

        } else if (projectDetails.plotDistribution === "random"
                    && (!projectDetails.numPlots || projectDetails.numPlots === 0)) {
            alert("A number of plots is required for random plot distribution.");
            return false;

        } else if (projectDetails.plotDistribution === "gridded"
                    && (!projectDetails.plotSpacing || projectDetails.plotSpacing === 0)) {
            alert("A plot spacing is required for gridded plot distribution.");
            return false;

        } else if (projectDetails.plotDistribution !== "shp"
                    && (!projectDetails.plotSize || projectDetails.plotSize === 0)) {
            alert("A plot size is required.");
            return false;

        } else if (projectDetails.plotDistribution === "csv"
                    && !(projectDetails.plotFileName && projectDetails.plotFileName.includes(".csv"))) {
            alert("A plot CSV (.csv) file is required.");
            return false;

        } else if (projectDetails.plotDistribution === "shp"
                    && !(projectDetails.plotFileName && projectDetails.plotFileName.includes(".zip"))) {
            alert("A plot SHP (.zip) file is required.");
            return false;

        } else if (projectDetails.sampleDistribution === "random"
                    && (!projectDetails.samplesPerPlot || projectDetails.samplesPerPlot === 0)) {
            alert("A number of samples per plot is required for random sample distribution.");
            return false;

        } else if (projectDetails.sampleDistribution === "gridded"
                    && (!projectDetails.sampleResolution || projectDetails.sampleResolution === 0)) {
            alert("A sample resolution is required for gridded sample distribution.");
            return false;

        } else if (projectDetails.sampleDistribution === "csv"
                    && !(projectDetails.sampleFileName && projectDetails.sampleFileName.includes(".csv"))) {
            alert("A sample CSV (.csv) file is required.");
            return false;

        } else if (projectDetails.sampleDistribution === "shp"
                    && !(projectDetails.sampleFileName && projectDetails.sampleFileName.includes(".zip"))) {
            alert("A sample SHP (.zip) file is required.");
            return false;

        } else {
            return true;
        }
    };

    setProjectTemplate = (newTemplateId) => {
        if (parseInt(newTemplateId) === 0) {
            this.setState({
                projectDetails: blankProject,
                plotList: [],
                coordinates: {
                    lonMin: "",
                    latMin: "",
                    lonMax: "",
                    latMax: "",
                },
                useTemplatePlots: false,
                useTemplateWidgets: false,
            });
        } else {
            const templateProject = this.state.projectList.find(p => p.id === newTemplateId);
            const newSurveyQuestions = convertSampleValuesToSurveyQuestions(templateProject.sampleValues);

            this.setState({
                projectDetails: {
                    ...templateProject,
                    surveyQuestions: newSurveyQuestions,
                    surveyRules: templateProject.surveyRules || [],
                    privacyLevel: "institution",
                },
                plotList: [],
                useTemplatePlots: true,
                useTemplateWidgets: true,
            });
        }
    };

    toggleTemplatePlots = () => {
        if (!this.state.useTemplatePlots) {
            const templateProject = this.state.projectList.find(p => p.id === this.state.projectDetails.id);
            this.setState({
                useTemplatePlots: true,
                // When user re-selects use template plots, revert project plot design values back to template but keep other data.
                projectDetails: {
                    ...this.state.projectDetails,
                    boundary: templateProject.boundary,
                    numPlots: templateProject.numPlots,
                    plotDistribution: templateProject.plotDistribution,
                    plotShape: templateProject.plotShape,
                    plotSize: templateProject.plotSize,
                    plotSpacing: templateProject.plotSpacing,
                    sampleDistribution: templateProject.sampleDistribution,
                    sampleResolution: templateProject.sampleResolution,
                    samplesPerPlot: templateProject.samplesPerPlot,
                },
            });
        } else {
            this.setState({ useTemplatePlots: false });
        }
    };

    toggleTemplateWidgets = () => this.setState({ useTemplateWidgets: !this.state.useTemplateWidgets });

    setProjectDetail = (key, newValue) =>
        this.setState({ projectDetails: { ...this.state.projectDetails, [key]: newValue }});

    setSurveyQuestions = (newSurveyQuestions) =>
        this.setState({ projectDetails: { ...this.state.projectDetails, surveyQuestions: newSurveyQuestions }});

    setSurveyRules = (newSurveyRules) =>
        this.setState({ projectDetails: { ...this.state.projectDetails, surveyRules: newSurveyRules }});

    getProjectList = () => {
        fetch(this.props.documentRoot + "/get-all-projects")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ projectList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    getImageryList = () => {
        const { institutionId } = this.props;
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setState({
                    imageryList: data,
                    projectDetails: {
                        ...this.state.projectDetails,
                        baseMapSource: data[0].title,
                    },
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    initProjectMap = () => {
        const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList, this.props.documentRoot);
        mercator.setVisibleLayer(newMapConfig, this.state.imageryList[0].title);
        this.setState({ mapConfig: newMapConfig });
    };

    getProjectPlots = () => {
        const maxPlots = 300;
        fetch(this.props.documentRoot + "/get-project-plots?projectId=" + this.state.projectDetails.id + "&max=" + maxPlots)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ plotList: data }))
            .catch(response => {
                this.setState({ plotList: [] });
                console.log(response);
                alert("Error retrieving plot list. See console for details.");
            });
    };

    showDragBoxDraw = (clearBox) => {
        if (clearBox) mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        const displayDragBoxBounds = (dragBox) => {
            const extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
            mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
            this.setState({
                coordinates: {
                    lonMin: extent[0],
                    latMin: extent[1],
                    lonMax: extent[2],
                    latMax: extent[3],
                },
            });
        };
        mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
    };

    showTemplateBounds = () => {
        mercator.disableDragBoxDraw(this.state.mapConfig);
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        // Extract bounding box coordinates from the project boundary and show on the map
        const boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
        this.setState({
            coordinates: {
                lonMin: boundaryExtent[0],
                latMin: boundaryExtent[1],
                lonMax: boundaryExtent[2],
                latMax: boundaryExtent[3],
            },
        });

        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.addVectorLayer(this.state.mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
    };

    showTemplatePlots = () => {
        mercator.addVectorLayer(this.state.mapConfig,
                                "projectPlots",
                                mercator.plotsToVectorSource(this.state.plotList),
                                this.state.projectDetails.plotShape === "circle"
                                    ? ceoMapStyles.yellowCircle
                                    : ceoMapStyles.yellowSquare);
    };

    render() {
        return (
            <FormLayout id="project-design" title="Create Project">
                {this.state.showModal && <LoadingModal/>}
                {this.state.projectDetails &&
                    <Fragment>
                        <ProjectDesignForm
                            coordinates={this.state.coordinates}
                            imageryList={this.state.imageryList}
                            projectDetails={this.state.projectDetails}
                            projectList={this.state.projectList}
                            setProjectDetail={this.setProjectDetail}
                            setProjectTemplate={this.setProjectTemplate}
                            setSurveyQuestions={this.setSurveyQuestions}
                            setSurveyRules={this.setSurveyRules}
                            toggleTemplatePlots={this.toggleTemplatePlots}
                            toggleTemplateWidgets={this.toggleTemplateWidgets}
                            useTemplatePlots={this.state.useTemplatePlots}
                            useTemplateWidgets={this.state.useTemplateWidgets}
                        />
                        <ProjectManagement createProject={this.createProject} />
                    </Fragment>
                }
            </FormLayout>
        );
    }
}

function ProjectDesignForm(props) {
    return (
        <div>
            {props.projectList &&
                <ProjectTemplateVisibility
                    projectId={props.projectDetails.id}
                    projectList={props.projectList}
                    setProjectTemplate={props.setProjectTemplate}
                    toggleTemplatePlots={props.toggleTemplatePlots}
                    toggleTemplateWidgets={props.toggleTemplateWidgets}
                    useTemplatePlots={props.useTemplatePlots}
                    useTemplateWidgets={props.useTemplateWidgets}
                />
            }
            <ProjectInfo
                name={props.projectDetails.name}
                description={props.projectDetails.description}
                setProjectDetail={props.setProjectDetail}
                privacyLevel={props.projectDetails.privacyLevel}
            />
            <ProjectAOI
                coordinates={props.coordinates}
                inDesignMode
                baseMapSource={props.projectDetails.baseMapSource}
                imageryList={props.imageryList}
                setProjectDetail={props.setProjectDetail}
            />
            {props.useTemplatePlots
            ?
                <Fragment>
                    <PlotReview projectDetails={props.projectDetails}/>
                    <SampleReview projectDetails={props.projectDetails}/>
                </Fragment>
            :
                <Fragment>
                    <PlotDesign projectDetails={props.projectDetails} setProjectDetail={props.setProjectDetail}/>
                    <SampleDesign projectDetails={props.projectDetails} setProjectDetail={props.setProjectDetail}/>
                </Fragment>
            }
            <SurveyDesign
                templateProject={props.projectDetails.id}
                surveyQuestions={props.projectDetails.surveyQuestions}
                surveyRules={props.projectDetails.surveyRules}
                setSurveyQuestions={props.setSurveyQuestions}
                setSurveyRules={props.setSurveyRules}
            />
        </div>
    );
}

class ProjectTemplateVisibility extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectFilter: "",
        };
    }

    render() {
        const {
            projectId,
            projectList,
            setProjectTemplate,
            toggleTemplatePlots,
            toggleTemplateWidgets,
            useTemplatePlots,
            useTemplateWidgets,
        } = this.props;
        return (
            <SectionBlock title = "Use Project Template (Optional)">
                <div id="project-template-selector">
                    <div className="form-group">
                        <h3 htmlFor="project-filter">Template Filter (Name or ID)</h3>
                        <input
                            className="form-control form-control-sm"
                            id="project-filter"
                            type="text"
                            value={this.state.projectFilter}
                            onChange={e => this.setState({ projectFilter: e.target.value })}
                        />
                        <h3 className="mt-2" htmlFor="project-template">Select Project</h3>
                        <select
                            className="form-control form-control-sm"
                            id="project-template"
                            name="project-template"
                            size="1"
                            value={projectId}
                            onChange={e => setProjectTemplate(parseInt(e.target.value))}
                        >
                            <option key={0} value={0}>None</option>
                            {
                                projectList
                                    .filter(proj => proj
                                                    && proj.id > 0
                                                    && proj.availability !== "archived"
                                                    && (proj.id + proj.name.toLocaleLowerCase())
                                                        .includes(this.state.projectFilter.toLocaleLowerCase()))
                                    .map((proj, uid) => <option key={uid} value={proj.id}>{proj.id} - {proj.name}</option>)
                            }
                        </select>
                        {projectId > 0 &&
                            <Fragment>
                                <h3 className="mt-2" htmlFor="project-template">Copy Options</h3>
                                <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="use-template-plots"
                                        defaultValue={useTemplatePlots}
                                        onChange={toggleTemplatePlots}
                                        checked={useTemplatePlots}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="use-template-plots"
                                    >
                                        Copy Template Plots and Samples
                                    </label>
                                </div>
                                <br/>
                                <div className="form-check form-check-inline mt-1">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="use-template-widgets"
                                        defaultValue={useTemplateWidgets}
                                        onChange={toggleTemplateWidgets}
                                        checked={useTemplateWidgets}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="use-template-widgets"
                                    >
                                        Copy Template Widgets
                                    </label>
                                </div>
                            </Fragment>
                        }
                    </div>
                </div>
            </SectionBlock>
        );
    }
}

function PlotDesign ({
    projectDetails: {
        plotDistribution,
        plotShape,
        numPlots,
        plotSpacing,
        plotSize,
        plotFileName,
    },
    setProjectDetail,
}) {

    return (
        <SectionBlock title="Plot Design">
            <div id="plot-design">
                <div className="row">
                    <div id="plot-design-col1" className="col">
                        <h3 className="mb-3">Spatial Distribution</h3>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-distribution-random"
                                name="plot-distribution"
                                defaultValue="random"
                                onChange={() => setProjectDetail("plotDistribution", "random")}
                                checked={plotDistribution === "random"}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="plot-distribution-random"
                            >
                                Random
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-distribution-gridded"
                                name="plot-distribution"
                                defaultValue="gridded"
                                onChange={() => setProjectDetail("plotDistribution", "gridded")}
                                checked={plotDistribution === "gridded"}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="plot-distribution-gridded"
                            >
                                Gridded
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-distribution-csv"
                                name="plot-distribution"
                                defaultValue="csv"
                                onChange={() => setProjectDetail("plotDistribution", "csv")}
                                checked={plotDistribution === "csv"}
                            />
                            <label
                                className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                id="custom-csv-upload"
                                htmlFor="plot-distribution-csv-file"
                            >
                                Upload CSV
                                <input
                                    type="file"
                                    accept="text/csv"
                                    id="plot-distribution-csv-file"
                                    defaultValue=""
                                    name="plot-distribution-csv-file"
                                    onChange={e => {
                                        setProjectDetail("plotFileName", e.target.files[0].name);
                                        encodeFileAsBase64(e.target.files[0], base64 => setProjectDetail("plotFileBase64", base64));
                                    }}
                                    style={{ display: "none" }}
                                    disabled={plotDistribution !== "csv"}
                                />
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-distribution-shp"
                                name="plot-distribution"
                                defaultValue="shp"
                                onChange={() => setProjectDetail("plotDistribution", "shp")}
                                checked={plotDistribution === "shp"}
                            />
                            <label
                                className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                                id="custom-shp-upload"
                                htmlFor="plot-distribution-shp-file"
                            >
                                Upload SHP
                                <input
                                    type="file"
                                    accept="application/zip"
                                    id="plot-distribution-shp-file"
                                    defaultValue=""
                                    name="plot-distribution-shp-file"
                                    onChange={e => {
                                        setProjectDetail("plotFileName", e.target.files[0].name);
                                        encodeFileAsBase64(e.target.files[0], base64 => setProjectDetail("plotFileBase64", base64));
                                    }}
                                    style={{ display: "none" }}
                                    disabled={plotDistribution !== "shp"}
                                />
                            </label>
                        </div>
                        {["csv", "shp"].includes(plotDistribution) &&
                        <div className="PlotDesign__file-display ml-3 d-inline">
                            File: {!plotFileName ? <span className="font-italic">None</span> : plotFileName}
                        </div>
                        }
                        <p id="plot-design-text" className="font-italic ml-2 small">-
                            {plotDistribution === "random" &&
                            "Plot centers will be randomly distributed within the AOI."}
                            {plotDistribution === "gridded" &&
                            "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below."}
                            {plotDistribution === "csv" &&
                            "Specify your own plot centers by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID."}
                            {plotDistribution === "shp" &&
                            "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID field."}
                        </p>

                        <div className="form-group mb-3">
                            <label htmlFor="num-plots">Number of plots</label>
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                id="num-plots"
                                name="num-plots"
                                autoComplete="off"
                                min="0"
                                step="1"
                                value={numPlots || ""}
                                disabled={plotDistribution !== "random"}
                                onChange={e => setProjectDetail("numPlots", e.target.value)}
                            />
                        </div>
                        <div className="form-group mb-1">
                            <label htmlFor="plot-spacing">Plot spacing (m)</label>
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                id="plot-spacing"
                                name="plot-spacing"
                                autoComplete="off"
                                min="0.0"
                                step="any"
                                value={plotSpacing || ""}
                                disabled={plotDistribution !== "gridded"}
                                onChange={e => setProjectDetail("plotSpacing", e.target.value)}
                            />
                        </div>
                        <hr />
                        <h3>Plot Shape</h3>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-shape-circle"
                                name="plot-shape"
                                defaultValue="circle"
                                onChange={() => setProjectDetail("plotShape", "circle")}
                                checked={plotShape === "circle"}
                                disabled={plotDistribution === "shp"}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="plot-shape-circle"
                            >
                                Circle
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="plot-shape-square"
                                name="plot-shape"
                                defaultValue="square"
                                onChange={() => setProjectDetail("plotShape", "square")}
                                checked={plotShape === "square"}
                                disabled={plotDistribution === "shp"}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="plot-shape-square"
                            >
                                Square
                            </label>
                        </div>
                        <br/>
                        <label htmlFor="plot-size" className="mt-3">
                            {plotShape === "circle" ? "Diameter (m)" : "Width (m)"}
                        </label>
                        <input
                            className="form-control form-control-sm"
                            type="number"
                            id="plot-size"
                            name="plot-size"
                            autoComplete="off"
                            min="0.0"
                            step="any"
                            value={plotSize}
                            disabled={plotDistribution === "shp"}
                            onChange={e => setProjectDetail("plotSize", e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}


function SampleDesign ({
    setProjectDetail,
    projectDetails: {
        plotDistribution,
        sampleDistribution,
        samplesPerPlot,
        sampleResolution,
        sampleFileName,
    },
}) {
    return (
        <SectionBlock title="Sample Design">
            <div id="sample-design">
                <h3>Spatial Distribution</h3>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="sample-distribution-random"
                        name="sample-distribution"
                        defaultValue="random"
                        onChange={() => setProjectDetail("sampleDistribution", "random")}
                        checked={sampleDistribution === "random"}
                        disabled={plotDistribution === "shp"}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="sample-distribution-random"
                    >
                        Random
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="sample-distribution-gridded"
                        name="sample-distribution"
                        defaultValue="gridded"
                        onChange={() => setProjectDetail("sampleDistribution", "gridded")}
                        checked={sampleDistribution === "gridded"}
                        disabled={plotDistribution === "shp"}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="sample-distribution-gridded"
                    >
                        Gridded
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="sample-distribution-csv"
                        name="sample-distribution"
                        defaultValue="csv"
                        onChange={() => setProjectDetail("sampleDistribution", "csv")}
                        checked={sampleDistribution === "csv"}
                        disabled={plotDistribution === "random" || plotDistribution === "gridded"}
                    />
                    <label
                        className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                        style={{ opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0" }}
                        id="sample-custom-csv-upload"
                        htmlFor="sample-distribution-csv-file"
                    >
                        Upload CSV
                        <input
                            type="file"
                            accept="text/csv"
                            id="sample-distribution-csv-file"
                            name="sample-distribution-csv-file"
                            defaultValue=""
                            onChange={e => {
                                setProjectDetail("sampleFileName", e.target.files[0].name);
                                encodeFileAsBase64(e.target.files[0], base64 => setProjectDetail("sampleFileBase64", base64));
                            }}
                            style={{ display: "none" }}
                            disabled={sampleDistribution !== "csv"}
                        />
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="sample-distribution-shp"
                        name="sample-distribution"
                        defaultValue="shp"
                        onChange={() => setProjectDetail("sampleDistribution", "shp")}
                        checked={sampleDistribution === "shp"}
                        disabled={plotDistribution === "random" || plotDistribution === "gridded"}
                    />
                    <label
                        className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                        style={{ opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0" }}
                        id="sample-custom-shp-upload"
                        htmlFor="sample-distribution-shp-file"
                    >
                        Upload SHP
                        <input
                            type="file"
                            accept="application/zip"
                            id="sample-distribution-shp-file"
                            name="sample-distribution-shp-file"
                            defaultValue=""
                            onChange={e => {
                                setProjectDetail("sampleFileName", e.target.files[0].name);
                                encodeFileAsBase64(e.target.files[0], base64 => setProjectDetail("sampleFileBase64", base64));
                            }}
                            style={{ display: "none" }}
                            disabled={sampleDistribution !== "shp"}
                        />
                    </label>
                </div>
                {["csv", "shp"].includes(sampleDistribution) &&
                    <div className="SampleDesign__file-display ml-3 d-inline">
                        File: {!sampleFileName ? <span className="font-italic">None</span> : sampleFileName}
                    </div>
                }
                <p id="sample-design-text" className="font-italic ml-2 small">-
                    {sampleDistribution === "random" &&
                        "Sample points will be randomly distributed within the plot boundary."}
                    {sampleDistribution === "gridded" &&
                        "Sample points will be arranged on a grid within the plot boundary using the sample resolution selected below."}
                    {sampleDistribution === "csv" &&
                        "Specify your own sample points by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID,SAMPLEID."}
                    {sampleDistribution === "shp" &&
                        "Specify your own sample shapes by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have PLOTID and SAMPLEID fields."}
                </p>
                <div className="form-group mb-3">
                    <label htmlFor="samples-per-plot">Samples per plot</label>
                    <input
                        className="form-control form-control-sm"
                        type="number"
                        id="samples-per-plot"
                        name="samples-per-plot"
                        autoComplete="off"
                        min="0"
                        step="1"
                        value={samplesPerPlot || ""}
                        disabled={sampleDistribution !== "random"}
                        onChange={e => setProjectDetail("samplesPerPlot", e.target.value)}
                    />
                </div>
                <div className="form-group mb-1">
                    <label htmlFor="sample-resolution">Sample resolution (m)</label>
                    <input
                        className="form-control form-control-sm"
                        type="number"
                        id="sample-resolution"
                        name="sample-resolution"
                        autoComplete="off"
                        min="0.0"
                        step="any"
                        value={sampleResolution || ""}
                        disabled={sampleDistribution !== "gridded"}
                        onChange={e => setProjectDetail("sampleResolution", e.target.value)}
                    />
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectManagement({ createProject }) {
    return (
        <SectionBlock title="Project Management">
            <div id="project-management">
                <div className="row">
                    <input
                        type="button"
                        id="create-project"
                        className="btn btn-outline-danger btn-sm btn-block"
                        name="create-project"
                        value="Create Project"
                        onClick={createProject}
                    />
                    <div id="spinner"></div>
                </div>
            </div>
        </SectionBlock>
    );
}

function LoadingModal() {
    return (
        <div style={{ position: "fixed", zIndex: "100", left: "0", top: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div style={{ width: "fit-content", margin: "20% auto", border: "1.5px solid", borderRadius: "5px", backgroundColor: "white" }}>
                <label className="m-4">Please wait while project is being created.</label>
            </div>
        </div>
    );
}

export function renderCreateProjectPage(args) {
    ReactDOM.render(
        <Project
            documentRoot={args.documentRoot}
            userId={args.userId}
            institutionId={args.institutionId}
        />,
        document.getElementById("project")
    );
}
