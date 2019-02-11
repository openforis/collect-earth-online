import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock } from "./components/FormComponents"
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { SurveyDesign } from "./components/SurveyDesign"
import { convertSampleValuesToSurveyQuestions } from "./utils/SurveyUtils"
import { utils } from "../js/utils.js";

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: {
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
                privacyLevel: "public",
                sampleDistribution: "random",
                sampleResolution: "",
                samplesPerPlot: "",
                surveyQuestions: []
            },
            useTemplatePlots: false,
            imageryList: [],
            mapConfig: null,
            plotList: [],
            coordinates: {
                lonMin: "",
                latMin: "",
                lonMax: "",
                latMax: "" },
            projectList: [],
        };
    };

    componentDidMount() {
        this.getImageryList();
        this.getProjectList();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.imageryList.length > 0 && prevState.imageryList.length === 0) {
            this.initProjectMap();
        }

        if (this.state.mapConfig
                && (this.state.mapConfig !== prevState.mapConfig 
                || this.state.projectDetails.id !== prevState.projectDetails.id))  {
            this.updateProjectBoundary();
        }

        if (this.state.mapConfig && this.state.projectDetails.id > 0
            && this.state.projectDetails.id !== prevState.projectDetails.id)  {
            this.getProjectPlots();
        }

        if (this.state.mapConfig 
            && this.state.projectDetails.baseMapSource !== prevState.projectDetails.baseMapSource) {

            mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource);
        }

        if (this.state.mapConfig 
            && (!this.state.useTemplatePlots || this.state.plotList.length === 0)
            && (prevState.useTemplatePlots || prevState.plotList.length > 0)) {
                
            mercator.removeLayerByTitle(this.state.mapConfig, "projectPlots");
        }

        if (this.state.mapConfig && this.state.plotList.length > 0 && this.state.useTemplatePlots
            && (prevState.plotList.length === 0 || !prevState.useTemplatePlots)) {

            mercator.addVectorLayer(this.state.mapConfig,
                                    "projectPlots",
                                    mercator.plotsToVectorSource(this.state.plotList),
                                    this.state.projectDetails.plotShape == "circle" 
                                        ? ceoMapStyles.yellowCircle 
                                        : ceoMapStyles.yellowSquare);
        }

        // Set sample distribution to a valid choice based on plot selection
        if (this.state.projectDetails.plotDistribution !== prevState.projectDetails.plotDistribution) {
            const { plotDistribution, sampleDistribution } = this.state.projectDetails;
            this.setProjectDetail("sampleDistribution", ["random", "gridded"].includes(plotDistribution) 
                                      && ["csv", "shp"].includes(sampleDistribution) ? "random"
                                            : plotDistribution === "shp" 
                                              && ["random", "gridded"].includes(sampleDistribution) ? "shp"
                                                : sampleDistribution)
        }
    }

    createProject = () => {
        if (this.validateProject() && confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            let formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.props.institutionId);
            formData.append("sample-values", JSON.stringify(this.state.projectDetails.surveyQuestions));
            $.ajax({
                url: this.props.documentRoot + "/create-project",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
                data: formData
            }).fail(() => {
                utils.hide_element("spinner");
                alert("Error creating project. See console for details.");
            }).done((data) => {
                utils.hide_element("spinner");
                if (parseInt(data)) {
                    window.location = this.props.documentRoot + "/review-project/" + data;
                } else {
                    alert(data);
                }
            });
        }
    }

    validateProject = () => {
        const { projectDetails, coordinates } = this.state;
        if (projectDetails.name === "" || projectDetails.description === "") {
            alert("A project must contain a name and description");
            return false;

        } else if (coordinates.latMax === "") {
            alert("Please select a boundary");
            return false;

        } else if (projectDetails.plotDistribution === "random" 
                    && (!projectDetails.numPlots || projectDetails.numPlots === 0)) {
            alert("A number of plots is required for random plot distribution");
            return false;

        } else if (projectDetails.plotDistribution === "gridded" 
                    && (!projectDetails.plotSpacing || projectDetails.plotSpacing === 0)) {
            alert("A plot spacing is required for gridded plot distribution");
            return false;

        } else if (projectDetails.plotDistribution !== "shp" 
                    && (!projectDetails.plotSize || projectDetails.plotSize === 0)) {
            alert("A plot size is required");
            return false;

        } else if (projectDetails.plotDistribution === "csv" 
                    && !(projectDetails.plotFileName && projectDetails.plotFileName.includes(".csv"))) {
            alert("A plot CSV file is required");
            return false;

        } else if (projectDetails.plotDistribution === "shp" 
                    && !(projectDetails.plotFileName && projectDetails.plotFileName.includes(".shp"))) {
            alert("A plot SHP file is required");
            return false;

        } else if (projectDetails.sampleDistribution === "random" 
                    && (!projectDetails.samplesPerPlot || projectDetails.samplesPerPlot === 0)) {
            alert("A number of samples per plot is required for random sample distribution");
            return false;

        } else if (projectDetails.sampleDistribution === "gridded" 
                && (!projectDetails.sampleResolution || projectDetails.sampleResolution === 0)) {
            alert("A sample resolution is required for gridded sample distribution");
            return false;

        } else if (projectDetails.sampleDistribution === "csv" 
                    && !(projectDetails.sampleFileName && projectDetails.sampleFileName.includes(".csv"))) {
            alert("A sample CSV file is required");
            return false;

            } else if (projectDetails.sampleDistribution === "shp" 
                    && !(projectDetails.sampleFileName && projectDetails.sampleFileName.includes(".shp"))) {
            alert("A sample SHP file is required");
            return false;

        } else if (projectDetails.surveyQuestions.length === 0) {
            alert("A survey must include at least one question");
            return false;

        } else if (projectDetails.surveyQuestions.some(sq => sq.answers.length === 0)) {
            alert("All survey questions must contain at least one answer")
            return false;

        } else {
            return true;
        }
    }

    setProjectTemplate = (newTemplateId) => {
        if (parseInt(newTemplateId) === 0) {
            this.setState({ projectDetails: { ...this.state.projectDetails, id: 0 },
                            plotList: [], 
                            useTemplatePlots: false });
        } else {
            const templateProject = this.state.projectList.find(p => p.id == newTemplateId);
            const newSurveyQuestions = convertSampleValuesToSurveyQuestions(templateProject.sampleValues);
    
            this.setState({ projectDetails: { ...templateProject, surveyQuestions: newSurveyQuestions },
                            plotList: [],
                            useTemplatePlots: true });
        }
    }

    toggleTemplatePlots = () => this.setState({useTemplatePlots: !this.state.useTemplatePlots});

    setProjectDetail = (key, newValue) => 
            this.setState({projectDetails: { ...this.state.projectDetails, [key]: newValue}});
  
                                                                                          
    setSurveyQuestions = (newSurveyQuestions) => 
            this.setState({ projectDetails: { ...this.state.projectDetails, surveyQuestions: newSurveyQuestions }})


    getProjectList = () => {
        const { userId } = this.props
        fetch(this.props.documentRoot + "/get-all-projects?userId=" + userId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project list. See console for details.");
                }
            })
            .then(data => {
                let projList = data;
                projList.unshift(JSON.parse(JSON.stringify(this.state.projectDetails)));
                this.setState({projectList: projList});
            });
    }

    getImageryList = () =>{
        const { institutionId } = this.props
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList: data});
            });
    }

    initProjectMap = () => {
        const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)
        mercator.setVisibleLayer(newMapConfig, this.state.imageryList[0].title);
        this.setState({mapConfig: newMapConfig});
    }

    getProjectPlots() {
        const maxPlots = 300;
        fetch(this.props.documentRoot + "/get-project-plots/" + this.state.projectDetails.id + "/" + maxPlots)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
            })
            .catch(e => this.setState({plotList: []}));
    }

    updateProjectBoundary() {
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");

        if (this.state.projectDetails.id === 0) {
            // Enable dragbox interaction if we are creating a new project
            let displayDragBoxBounds = (dragBox) => {
                let extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                this.setState({coordinates: { lonMin: extent[0],
                                                latMin: extent[1],
                                                lonMax: extent[2],
                                                latMax: extent[3] }
                                    });
            };
            
            mercator.disableDragBoxDraw(this.state.mapConfig);
            mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
        } else {
            // Extract bounding box coordinates from the project boundary and show on the map
            let boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
            // FIXME like above, these values are stored in the state but never used.
            this.setState({coordinates: { lonMin: boundaryExtent[0],
                                        latMin: boundaryExtent[1],
                                        lonMax: boundaryExtent[2],
                                        latMax: boundaryExtent[3] }
                            });

            // Display a bounding box with the project's AOI on the map and zoom to it
            mercator.addVectorLayer(this.state.mapConfig,
                "currentAOI",
                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
                ceoMapStyles.yellowPolygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
        }
    }

    render() {
        return (
            <FormLayout id="project-design" title="Create Project">
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
                            toggleTemplatePlots={this.toggleTemplatePlots}
                            useTemplatePlots={this.state.useTemplatePlots}
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
        <form id="project-design-form" className="px-2 pb-2" method="post"
              action={props.documentRoot + "/create-project"}
              encType="multipart/form-data">
                {props.projectList && 
                    <ProjectTemplateVisibility 
                        projectId={props.projectDetails.id} 
                        projectList={props.projectList}
                        setProjectTemplate={props.setProjectTemplate} 
                    />
                }
                <ProjectInfo 
                    name={props.projectDetails.name}
                    description={props.projectDetails.description}
                    setProjectDetail={props.setProjectDetail}
                />
                <ProjectVisibility 
                    privacyLevel={props.projectDetails.privacyLevel}
                    setProjectDetail={props.setProjectDetail}
                />
                <ProjectAOI coordinates={props.coordinates}/>
                {props.imageryList && 
                    <ProjectImagery
                        imageryList={props.imageryList}
                        baseMapSource={props.projectDetails.baseMapSource}
                        setProjectDetail={props.setProjectDetail}
                    />
                }
                <PlotDesign 
                    projectDetails={props.projectDetails}
                    useTemplatePlots={props.useTemplatePlots}
                    setProjectDetail={props.setProjectDetail}
                    toggleTemplatePlots={props.toggleTemplatePlots}
                />
                {!props.useTemplatePlots && 
                    <SampleDesign projectDetails={props.projectDetails} setProjectDetail={props.setProjectDetail}/>
                }
                <SurveyDesign 
                    surveyQuestions={props.projectDetails.surveyQuestions} 
                    setSurveyQuestions={props.setSurveyQuestions} 
                />

        </form>
    );
}

function ProjectTemplateVisibility({ projectId, projectList, setProjectTemplate }) {
    return (
        <SectionBlock title = "Use Project Template (Optional)">
            <div id="project-template-selector">
                <div className="form-group">
                    <h3 htmlFor="project-template">Select Project</h3>
                    <select 
                        className="form-control form-control-sm" id="project-template"
                        name="project-template"
                        size="1"
                        value={projectId} onChange={e => setProjectTemplate(e.target.value)}
                    >
                        <option key={0} value={0}>None</option>
                        {
                            projectList
                                .filter(proj => proj && proj.id > 0)
                                .map((proj,uid) =>
                                    <option key={uid} value={proj.id}>{proj.name}</option>
                                )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectInfo({ name, description, setProjectDetail }) {
    return (
        <SectionBlock title="Project Info">
            <div id="project-info">
                <div className="form-group">
                    <h3 htmlFor="project-name">Name</h3>
                    <input
                        className="form-control form-control-sm"
                        type="text"
                        id="project-name"
                        name="name"
                        autoComplete="off"
                        value={name}
                        onChange={e => setProjectDetail("name", e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <h3 htmlFor="project-description">Description</h3>
                    <textarea 
                        className="form-control form-control-sm" 
                        id="project-description"
                        name="description"
                        value={description} 
                        onChange={e => setProjectDetail("description", e.target.value)}
                    />
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectVisibility({ privacyLevel, setProjectDetail }) {
    return (
        <SectionBlock title= "Project Visibility">
            <h3>Privacy Level</h3>
            <div id="project-visibility" className="mb-3 small">
                <div className="form-check form-check-inline">
                    <input 
                        className="form-check-input"
                        type="radio" 
                        id="privacy-public" 
                        name="privacy-level"
                        value="public" 
                        checked={privacyLevel === "public"}
                        onChange={() => setProjectDetail("privacyLevel", "public")}
                    />
                    <label className="form-check-label" htmlFor="privacy-public">
                        Public: <i>All Users</i>
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="privacy-private"
                        name="privacy-level"
                        value="private"
                        onChange={() => setProjectDetail("privacyLevel", "private")}
                        checked={privacyLevel === "private"}
                    />
                    <label className="form-check-label" htmlFor="privacy-private">
                        Private: <i>Group Admins</i>
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio" id="privacy-institution"
                        name="privacy-level"
                        value="institution"
                        onChange={() => setProjectDetail("privacyLevel", "institution")}
                        checked={privacyLevel === "institution"}
                    />
                    <label className="form-check-label" htmlFor="privacy-institution">
                        Institution: <i>Group Members</i>
                    </label>
                </div>
                <div className="form-check form-check-inline">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="privacy-invitation"
                        name="privacy-level"
                        value="invitation"
                        onChange={() => setProjectDetail("privacyLevel", "invitation")} 
                        disabled
                        checked={privacyLevel === "invitation"}
                    />
                    <label className="form-check-label" htmlFor="privacy-invitation">
                        Invitation: <i>Coming Soon</i>
                    </label>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectAOI({ coordinates: { latMax, lonMin, lonMax, latMin } }) {
    return (
        <SectionBlock title="Project AOI">
            <div id="project-aoi">
                <div id="project-map">
                    <div className="col small text-center mb-2">Hold CTRL and click-and-drag a bounding box on the map</div>
                    <div className="form-group mx-4">
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm"
                                    type="number"
                                    id="lat-max"
                                    name="lat-max"
                                    value={latMax}
                                    placeholder="North"
                                    autoComplete="off"
                                    min="-90.0"
                                    max="90.0"
                                    step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm"
                                    type="number"
                                    id="lon-min"
                                    name="lon-min"
                                    value={lonMin}
                                    placeholder="West"
                                    autoComplete="off"
                                    min="-180.0"
                                    max="180.0"
                                    step="any"
                                />
                            </div>
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm"
                                    type="number"
                                    id="lon-max"
                                    name="lon-max"
                                    value={lonMax}
                                    placeholder="East"
                                    autoComplete="off"
                                    min="-180.0"
                                    max="180.0"
                                    step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm"
                                    type="number"
                                    id="lat-min"
                                    name="lat-min"
                                    value={latMin}
                                    placeholder="South"
                                    autoComplete="off"
                                    min="-90.0"
                                    max="90.0"
                                    step="any"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectImagery({ baseMapSource, imageryList, setProjectDetail }) {
    return (
        <SectionBlock title="Project Imagery">
            <div id="project-imagery">
                <div className="form-group">
                    <h3 htmlFor="base-map-source">Basemap Source</h3>
                    <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                        size="1"
                        value={baseMapSource || ""}
                        onChange={e => setProjectDetail("baseMapSource", e.target.value)}>
                        {
                            imageryList.map((imagery, uid) =>
                                <option key={uid} value={imagery.title}>{imagery.title}</option>
                            )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}

function PlotDesign ({
    projectDetails: { id, plotDistribution, plotShape, numPlots, plotSpacing, plotSize, plotFileName },
    setProjectDetail,
    toggleTemplatePlots,
    useTemplatePlots,
    }) {

    return (
      <SectionBlock title="Plot Design">
        <div id="plot-design">
          <div className="row">
            <div id="plot-design-col1" className="col">
                {id > 0 &&
                    <Fragment>
                    <h3>Template Plots</h3>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="use-template-plots"
                            name="use-template-plots"
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
                    <hr />
                    </Fragment>
                }
                {!useTemplatePlots && (
                    <Fragment>
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
                            onChange={e => setProjectDetail("plotFileName", e.target.files[0].name)}
                            style={{ display: "none" }}
                            disabled={plotDistribution != "csv"}
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
                            onChange={e => setProjectDetail("plotFileName", e.target.files[0].name)}
                            style={{ display: "none" }}
                            disabled={plotDistribution != "shp"}
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
                        disabled={plotDistribution != "random"}
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
                        disabled={plotDistribution != "gridded"}
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
                        {plotShape == "circle" ? "Diameter (m)" : "Width (m)"}
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
                    </Fragment>
                )}
            </div>
          </div>
        </div>
      </SectionBlock>
    );
}


function SampleDesign ({
    setProjectDetail, 
    projectDetails: { plotDistribution, sampleDistribution, samplesPerPlot, sampleResolution, sampleFileName }
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
                    <label className="form-check-label"
                        htmlFor="sample-distribution-random">
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
                    <label className="form-check-label"
                        htmlFor="sample-distribution-gridded">
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
                    <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                        style={{opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0"}}
                        id="sample-custom-csv-upload"
                        htmlFor="sample-distribution-csv-file">
                        Upload CSV
                        <input 
                            type="file" 
                            accept="text/csv" 
                            id="sample-distribution-csv-file"
                            name="sample-distribution-csv-file"
                            defaultValue=""
                            onChange={e => setProjectDetail("shapeFileName", e.target.files[0].name)}
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
                    <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                        style={{opacity: plotDistribution === "random" || plotDistribution === "gridded" ? "0.25" : "1.0"}}
                        id="sample-custom-shp-upload"
                        htmlFor="sample-distribution-shp-file">
                        Upload SHP
                        <input
                            type="file" 
                            accept="application/zip" 
                            id="sample-distribution-shp-file"
                            name="sample-distribution-shp-file"
                            defaultValue=""
                            onChange={() => setProjectDetail("sampleFileName", event.target.files[0].name)}
                            style={{ display: "none" }}
                            disabled={sampleDistribution != "shp"}
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
                        disabled={sampleDistribution != "random"}
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
                        disabled={sampleDistribution != "gridded"}
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