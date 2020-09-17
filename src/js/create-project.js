import React, {Fragment} from "react";
import ReactDOM from "react-dom";

import {FormLayout, SectionBlock} from "./components/FormComponents";
import {NavigationBar} from "./components/PageComponents";
import {ProjectInfo, ProjectAOI, ProjectOptions, PlotReview, SampleReview} from "./components/ProjectComponents";
import {mercator, ceoMapStyles} from "./utils/mercator.js";
import {SurveyDesign} from "./components/SurveyDesign";
import {convertSampleValuesToSurveyQuestions} from "./utils/surveyUtils";
import {formatNumberWithCommas, isNumber, encodeFileAsBase64} from "./utils/generalUtils";

export const plotLimit = 5000;
export const perPlotLimit = 200;
export const sampleLimit = 50000;

const blankProject = {
    archived: false,
    availability: "nonexistent",
    imageryId: -1,
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
    projectOptions: {
        showGEEScript: false,
        showPlotInformation: false,
        autoLaunchGeoDash: true,
    },
};

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: blankProject,
            useTemplatePlots: false,
            useTemplateWidgets: false,
            imageryList: [],
            projectImageryList: [],
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
            plotSampleLimitVals: {
                plots: 0,
                perPlot: 0,
                plotLimitError: true,
                sampleLimitError: true,
            },
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
            && this.state.projectDetails.imageryId !== prevState.projectDetails.imageryId) {
            mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.imageryId);
        }

        if (this.state.mapConfig
            && (this.state.mapConfig !== prevState.mapConfig
                || this.state.projectDetails.id !== prevState.projectDetails.id
                || this.state.useTemplatePlots !== prevState.useTemplatePlots)) {

            if (this.state.projectDetails.id > 0 && this.state.useTemplatePlots) {
                this.showTemplateBounds();
            } else {
                mercator.removeLayerById(this.state.mapConfig, "projectPlots");
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
            const {plotDistribution, sampleDistribution} = this.state.projectDetails;
            this.setProjectDetail("sampleDistribution", ["random", "gridded"].includes(plotDistribution)
                                      && ["csv", "shp"].includes(sampleDistribution) ? "random"
                                        : plotDistribution === "shp"
                                              && ["random", "gridded"].includes(sampleDistribution) ? "shp"
                                            : sampleDistribution);
        }

        // calculation of the plots and samples number
        if (this.state.projectDetails.plotDistribution !== prevState.projectDetails.plotDistribution
            || this.state.projectDetails.sampleDistribution !== prevState.projectDetails.sampleDistribution
            || this.state.projectDetails.numPlots !== prevState.projectDetails.numPlots
            || this.state.projectDetails.plotSize !== prevState.projectDetails.plotSize
            || this.state.projectDetails.plotSpacing !== prevState.projectDetails.plotSpacing
            || this.state.projectDetails.samplesPerPlot !== prevState.projectDetails.samplesPerPlot
            || this.state.projectDetails.sampleResolution !== prevState.projectDetails.sampleResolution
            || this.state.coordinates.lonMin !== prevState.coordinates.lonMin
            || this.state.coordinates.lonMax !== prevState.coordinates.lonMax
            || this.state.coordinates.latMin !== prevState.coordinates.latMin
            || this.state.coordinates.latMax !== prevState.coordinates.latMax
        ) {
            this.checkPlotSampleLimitError();
        }
    }

    createProject = () => {
        if (this.validateProject() && confirm("Do you REALLY want to create this project?")) {
            this.setState({showModal: true}, this.createProjectApi);
        }
    };

    createProjectApi = () =>
        fetch("/create-project",
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json; charset=utf-8",
                  },
                  body: JSON.stringify({
                      institutionId: this.props.institutionId,
                      imageryId: this.state.projectDetails.imageryId,
                      projectImageryList: this.state.projectImageryList,
                      lonMin: this.state.coordinates.lonMin,
                      lonMax: this.state.coordinates.lonMax,
                      latMin: this.state.coordinates.latMin,
                      latMax: this.state.coordinates.latMax,
                      description: this.state.projectDetails.description,
                      name: this.state.projectDetails.name,
                      projectOptions: this.state.projectDetails.projectOptions,
                      numPlots: this.state.projectDetails.numPlots,
                      plotDistribution: this.state.projectDetails.plotDistribution,
                      plotShape: this.state.projectDetails.plotShape,
                      plotSize: this.state.projectDetails.plotSize,
                      plotSpacing: this.state.projectDetails.plotSpacing,
                      privacyLevel: this.state.projectDetails.privacyLevel,
                      projectTemplate: this.state.projectDetails.id,
                      sampleDistribution: this.state.projectDetails.sampleDistribution,
                      samplesPerPlot: this.state.projectDetails.samplesPerPlot,
                      sampleResolution: this.state.projectDetails.sampleDistribution === "center"
                            ? 2 * this.state.projectDetails.plotSize
                            : this.state.projectDetails.sampleResolution,
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
                if (data[0] && Number.isInteger(data[1].projectId)) {
                    window.location = `/review-project?projectId=${data[1].projectId}`;
                    return Promise.resolve();
                } else {
                    return Promise.reject(data[1]);
                }
            })
            .catch(message => {
                alert("Error creating project:\n" + message);
                this.setState({showModal: false});
            });

    validateProject = () => {
        const {projectDetails, imageryList, projectImageryList} = this.state;

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

        } else if (["public", "users"].includes(projectDetails.privacyLevel)
            && [...projectImageryList, projectDetails.imageryId]
                .every(id => imageryList.some(il => il.id === id && il.visibility === "private"))) {
            alert(`Projects with privacy level of ${projectDetails.privacyLevel} require at least one public imagery.`);
            return false;

        } else if (!projectDetails.imageryId > 0) {
            alert("Select a valid Basemap.");
            return false;

        } else {
            return true;
        }
    };

    validatePlotData = () => {
        const {projectDetails, plotSampleLimitVals} = this.state;
        if (["random", "gridded"].includes(projectDetails.plotDistribution) && !this.isValidBounds()) {
            alert("Please select a valid boundary");
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

        } else if (projectDetails.sampleDistribution === "gridded"
                    && projectDetails.plotShape === "circle"
                    && projectDetails.sampleResolution >= projectDetails.plotSize / Math.sqrt(2)) {
            alert("The sample resolution must be less than plot diameter divided by the square root of 2.");
            return false;

        } else if (projectDetails.sampleDistribution === "gridded"
                    && projectDetails.plotShape === "square"
                    && parseInt(projectDetails.sampleResolution) >= projectDetails.plotSize) {
            alert("The sample resolution must be less than the plot width.");
            return false;

        } else if (plotSampleLimitVals.plotLimitError || plotSampleLimitVals.sampleLimitError) {
            alert("The plot or sample size limit exceeded. Check the Sample Design section for detailed info.");
            return false;

        } else {
            return true;
        }
    };

    isValidBounds = () => {
        const {latMin, latMax, lonMin, lonMax} = this.state.coordinates;
        return isNumber(latMin)
            && isNumber(latMax)
            && isNumber(lonMin)
            && isNumber(lonMax)
            && lonMax <= 180
            && lonMin >= -180
            && latMax <= 90
            && latMin >= -90
            && lonMax > lonMin
            && latMax > latMin;
    }

    getProjectImageryList = (projectId) => {
        fetch("/get-project-imagery?projectId=" + projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const institutionImageryIds = this.state.imageryList.map(imagery => imagery.id);
                this.setState({
                    projectImageryList: data
                        .map(imagery => imagery.id)
                        .filter(imageryId => institutionImageryIds.includes(imageryId)),
                });
            })
            .catch(response => {
                this.setProjectImageryList([]);
                console.log("Error retrieving the project imagery list: ", response);
            });
    };

    setProjectTemplate = (newTemplateId) => {
        if (parseInt(newTemplateId) === 0) {
            this.setState({
                projectDetails: {
                    ...blankProject,
                    imageryId: this.state.imageryList[0].id,
                },
                projectImageryList: [],
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
            mercator.removeLayerById(this.state.mapConfig, "dragBoxLayer");
        } else {
            const templateProject = this.state.projectList.find(p => p.id === newTemplateId);
            this.getProjectImageryList(templateProject.id);
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
            this.setState({useTemplatePlots: false});
        }
    };

    toggleTemplateWidgets = () => this.setState({useTemplateWidgets: !this.state.useTemplateWidgets});

    setProjectDetail = (key, newValue) =>
        this.setState({projectDetails: {...this.state.projectDetails, [key]: newValue}});

    setSurveyQuestions = (newSurveyQuestions) =>
        this.setState({projectDetails: {...this.state.projectDetails, surveyQuestions: newSurveyQuestions}});

    setSurveyRules = (newSurveyRules) =>
        this.setState({projectDetails: {...this.state.projectDetails, surveyRules: newSurveyRules}});

    getProjectList = () => {
        fetch("/get-all-projects")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({projectList: data}))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    getImageryList = () => {
        const {institutionId} = this.props;
        fetch(`/get-institution-imagery?institutionId=${institutionId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const sorted = [...data.filter(a => a.title.toLocaleLowerCase().includes("mapbox")),
                                ...data.filter(a => !a.title.toLocaleLowerCase().includes("mapbox"))];
                this.setState({
                    imageryList: sorted,
                    projectDetails: {
                        ...this.state.projectDetails,
                        imageryId: sorted[0].id,
                    },
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    initProjectMap = () => {
        const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList);
        mercator.setVisibleLayer(newMapConfig, this.state.imageryList[0].id);
        this.setState({mapConfig: newMapConfig});
    };

    getProjectPlots = () => {
        const maxPlots = 300;
        fetch(`/get-project-plots?projectId=${this.state.projectDetails.id}&max=${maxPlots}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({plotList: data}))
            .catch(response => {
                this.setState({plotList: []});
                console.log(response);
                alert("Error retrieving plot list. See console for details.");
            });
    };

    showDragBoxDraw = (clearBox) => {
        if (clearBox) mercator.removeLayerById(this.state.mapConfig, "currentAOI");
        const displayDragBoxBounds = (dragBox) => {
            const extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
            mercator.removeLayerById(this.state.mapConfig, "currentAOI");
            mercator.setLayerVisibilityByLayerId(this.state.mapConfig, "dragBoxLayer", true);
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

    showBounds = () => {
        const {latMin, latMax, lonMin, lonMax} = this.state.coordinates;
        const geoJsonBoundary = {
            type: "Polygon",
            coordinates: [[
                [lonMin, latMin],
                [lonMin, latMax],
                [lonMax, latMax],
                [lonMax, latMin],
                [lonMin, latMin],
            ]],
        };
        mercator.removeLayerById(this.state.mapConfig, "currentAOI");
        mercator.setLayerVisibilityByLayerId(this.state.mapConfig, "dragBoxLayer", false);
        // Display a bounding box with the project's AOI on the map and zoom to it
        if (this.isValidBounds()) {
            mercator.addVectorLayer(this.state.mapConfig,
                                    "currentAOI",
                                    mercator.geometryToVectorSource(mercator.parseGeoJson(geoJsonBoundary, true)),
                                    ceoMapStyles.yellowPolygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
        }
    }

    showTemplateBounds = () => {
        mercator.disableDragBoxDraw(this.state.mapConfig);
        const boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
        this.setState({
            coordinates: {
                lonMin: boundaryExtent[0],
                latMin: boundaryExtent[1],
                lonMax: boundaryExtent[2],
                latMax: boundaryExtent[3],
            },
        }, this.showBounds);
    };

    updateCoordinates = (name, value) => {
        this.setState({
            coordinates: {
                ...this.state.coordinates,
                [name]: value === "" ? "" : parseFloat(value),
            },
        }, this.showBounds);
    };

    showTemplatePlots = () => {
        mercator.addVectorLayer(this.state.mapConfig,
                                "projectPlots",
                                mercator.plotsToVectorSource(this.state.plotList),
                                this.state.projectDetails.plotShape === "circle"
                                    ? ceoMapStyles.yellowCircle
                                    : ceoMapStyles.yellowSquare);
    };

    setProjectImageryList = (newProjectImageryList) =>
        this.setState({projectImageryList: newProjectImageryList});

    getTotalPlots = () => {
        const {projectDetails, coordinates} = this.state;
        if (projectDetails.plotDistribution === "random"
            && projectDetails.numPlots) {
            return Number(projectDetails.numPlots);
        } else if (projectDetails.plotDistribution === "gridded"
            && projectDetails.plotSize
            && projectDetails.plotSpacing
            && coordinates.lonMin
            && coordinates.latMin
            && coordinates.lonMax
            && coordinates.latMax) {
            const lowerLeft = mercator.transformPoint(coordinates.lonMin,
                                                      coordinates.latMin,
                                                      "EPSG:4326",
                                                      "EPSG:3857").getCoordinates();
            const upperRight = mercator.transformPoint(coordinates.lonMax,
                                                       coordinates.latMax,
                                                       "EPSG:4326",
                                                       "EPSG:3857").getCoordinates();

            const buffer = Number(projectDetails.plotSize);
            const xRange = upperRight[0] - lowerLeft[0] - buffer;
            const yRange = upperRight[1] - lowerLeft[1] - buffer;

            const xSteps = Math.floor(xRange / projectDetails.plotSpacing) + 1;
            const ySteps = Math.floor(yRange / projectDetails.plotSpacing) + 1;
            return xSteps * ySteps;
        } else {
            return 0;
        }
    }

    getSamplesPerPlot = () => {
        const {projectDetails, coordinates} = this.state;
        if (projectDetails.sampleDistribution === "random"
            && projectDetails.samplesPerPlot) {
            return Number(projectDetails.samplesPerPlot);
        } else if (projectDetails.sampleDistribution === "gridded"
            && projectDetails.plotSize
            && projectDetails.sampleResolution
            && coordinates.lonMin
            && coordinates.latMin
            && coordinates.lonMax
            && coordinates.latMax) {
            const steps = Math.floor(Number(projectDetails.plotSize) / Number(projectDetails.sampleResolution)) + 1;
            return steps * steps;
        } else if (projectDetails.sampleDistribution === "center") {
            return 1;
        } else {
            return 0;
        }
    };

    checkPlotSampleLimitError = () => {
        const plots = this.getTotalPlots();
        const perPlot = this.getSamplesPerPlot();
        const plotLimitError = plots > plotLimit;
        const sampleLimitError = (perPlot > perPlotLimit) || (plots * perPlot > sampleLimit);
        this.setState({
            plotSampleLimitVals: {
                ...this.state.plotSampleLimitVals,
                plots: plots,
                perPlot: perPlot,
                plotLimitError: plotLimitError,
                sampleLimitError: sampleLimitError,
            },
        });
    };

    render() {
        return (
            <FormLayout id="project-design" title="Create Project">
                {this.state.showModal && <LoadingModal/>}
                {this.state.projectDetails &&
                    <Fragment>
                        <ProjectDesignForm
                            coordinates={this.state.coordinates}
                            updateCoordinates={this.updateCoordinates}
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
                            projectImageryList={this.state.projectImageryList}
                            setProjectImageryList={this.setProjectImageryList}
                            plotSampleLimitVals={this.state.plotSampleLimitVals}
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
                updateCoordinates={props.updateCoordinates}
                inDesignMode
                imageryId={props.projectDetails.imageryId}
                imageryList={props.imageryList}
                setProjectDetail={props.setProjectDetail}
                projectImageryList={props.projectImageryList}
                setProjectImageryList={props.setProjectImageryList}
            />
            <ProjectOptions
                projectOptions={props.projectDetails.projectOptions}
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
                    <SampleDesign
                        projectDetails={props.projectDetails}
                        setProjectDetail={props.setProjectDetail}
                        plotSampleLimitVals={props.plotSampleLimitVals}
                    />
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
                            onChange={e => this.setState({projectFilter: e.target.value})}
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
                                    style={{display: "none"}}
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
                                    style={{display: "none"}}
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
                            "Specify your own plot centers by uploading a CSV with these fields: LON,LAT,PLOTID."}
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
    plotSampleLimitVals,
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
                        id="sample-distribution-center"
                        name="sample-distribution"
                        defaultValue="center"
                        onChange={() => setProjectDetail("sampleDistribution", "center")}
                        checked={sampleDistribution === "center"}
                        disabled={plotDistribution === "shp"}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="sample-distribution-center"
                    >
                        Center
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
                        style={{opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0"}}
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
                            style={{display: "none"}}
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
                        style={{opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0"}}
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
                            style={{display: "none"}}
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
                    {sampleDistribution === "center" &&
                        "A Sample point will be placed on the center of the plot."}
                    {sampleDistribution === "csv" &&
                        "Specify your own sample points by uploading a CSV with these fields: LON,LAT,PLOTID,SAMPLEID."}
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
                <p
                    id="plots info-text"
                    className="font-italic ml-2 small"
                    style={{
                        marginTop: "10px",
                        color: plotSampleLimitVals.plotLimitError ? "#8B0000" : "#006400",
                        fontSize: "0.9rem",
                        whiteSpace: "pre-line",
                    }}
                >
                    {plotSampleLimitVals.plots
                        ? `This project will contain around ${formatNumberWithCommas(plotSampleLimitVals.plots)} plots.`
                        : ""
                    }
                    {
                        plotSampleLimitVals.plots && plotSampleLimitVals.plotLimitError
                            ? `\n * The maximum allowed number for the selected plot distribution is ${formatNumberWithCommas(plotLimit)}.`
                            : ""
                    }
                </p>
                <p
                    id="samples info-text"
                    className="font-italic ml-2 small"
                    style={{
                        marginBottom: "-5px",
                        color: plotSampleLimitVals.sampleLimitError ? "#8B0000" : "#006400",
                        fontSize: "0.9rem",
                        whiteSpace: "pre-line",
                    }}
                >
                    {
                        plotSampleLimitVals.perPlot
                            ? `Each plot will contain around ${formatNumberWithCommas(plotSampleLimitVals.perPlot)} samples.`
                            : ""
                    }
                    {
                        plotSampleLimitVals.plots && plotSampleLimitVals.perPlot
                            ? `\nThere will be around ${formatNumberWithCommas(plotSampleLimitVals.plots * plotSampleLimitVals.perPlot)} ` +
                              "total samples in the project."
                            : ""
                    }
                    {
                        plotSampleLimitVals.plots && plotSampleLimitVals.perPlot && plotSampleLimitVals.sampleLimitError
                            ? `\n * The maximum allowed for the selected sample distribution is ${formatNumberWithCommas(perPlotLimit)}`
                            + ` samples per plot.\n * The maximum allowed samples per project is ${formatNumberWithCommas(sampleLimit)}.`
                            : ""
                    }
                </p>
            </div>
        </SectionBlock>
    );
}

function ProjectManagement({createProject}) {
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
        <div
            style={{
                position: "fixed",
                zIndex: "100",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.4)",
            }}
        >
            <div
                style={{
                    width: "fit-content",
                    margin: "20% auto",
                    border: "1.5px solid",
                    borderRadius: "5px",
                    backgroundColor: "white",
                }}
            >
                <label className="m-4">Please wait while project is being created.</label>
            </div>
        </div>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Project
                institutionId={args.institutionId || "0"}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
