import React from "react";

import {formatNumberWithCommas, encodeFileAsBase64, truncate} from "../utils/generalUtils";
import {ProjectContext, plotLimit} from "./constants";
import {mercator} from "../utils/mercator";
import AssignPlots from "./AssignPlots";
import QualityControl from "./QualityControl";

export class PlotDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: ""
        };
    }

    componentDidMount() {
        this.setCoordsFromBoundary();
    }

    componentDidUpdate(prevProps) {
        if (this.props.boundary && prevProps.boundary !== this.props.boundary) {
            this.setCoordsFromBoundary();
        }
    }

    setCoordsFromBoundary = () => {
        const boundaryExtent = mercator.parseGeoJson(this.props.boundary, false).getExtent();
        this.setState({
            lonMin: boundaryExtent[0],
            latMin: boundaryExtent[1],
            lonMax: boundaryExtent[2],
            latMax: boundaryExtent[3]
        });
    };

    generateGeoJSON = () => {
        const {latMin, latMax, lonMin, lonMax} = this.state;
        return mercator.hasValidBounds(latMin, latMax, lonMin, lonMax)
            ? {
                type: "Polygon",
                coordinates: [[
                    [lonMin, latMin],
                    [lonMin, latMax],
                    [lonMax, latMax],
                    [lonMax, latMin],
                    [lonMin, latMin]
                ]]
            }
            : null;
    };

    setPlotDetails = newDetail => {
        const resetBoundary = ["csv", "shp"].includes(newDetail.plotDistribution);
        if (resetBoundary) {
            this.setState({
                lonMin: "",
                latMin: "",
                lonMax: "",
                latMax: ""
            });
        }
        this.context.setProjectDetails(Object.assign(
            newDetail,
            {plots: []},
            resetBoundary ? {boundary: null} : {}
        ));
    };

    updateBoundaryFromCoords = newCoord => this.setState(
        newCoord,
        () => this.setPlotDetails({boundary: this.generateGeoJSON()})
    );

    /// Render Functions

    renderLabeledInput = (label, property) => (
        <div className="form-group">
            <label htmlFor={property}>{label}</label>
            <input
                className="form-control form-control-sm"
                id={property}
                min="0"
                onChange={e => this.setPlotDetails({[property]: Number(e.target.value)})}
                step="1"
                type="number"
                value={this.context[property] || ""}
            />
        </div>
    );

    renderPlotShape = () => {
        const {plotShape} = this.context;
        return (
            <div className="form-group" style={{display: "flex", flexDirection: "column"}}>
                <label>Plot Shape</label>
                <div>
                    <div className="form-check form-check-inline">
                        <input
                            checked={plotShape === "circle"}
                            className="form-check-input"
                            id="plot-shape-circle"
                            onChange={() => this.setPlotDetails({plotShape: "circle"})}
                            type="radio"
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
                            checked={plotShape === "square"}
                            className="form-check-input"
                            id="plot-shape-square"
                            onChange={() => this.setPlotDetails({plotShape: "square"})}
                            type="radio"
                        />
                        <label
                            className="form-check-label"
                            htmlFor="plot-shape-square"
                        >
                            Square
                        </label>
                    </div>
                </div>
            </div>
        );
    };

    renderAOICoords = () => {
        const {latMax, lonMin, lonMax, latMin} = this.state;
        return (
            <div>
                <label>Boundary Coordinates</label>
                <div className="form-group mx-4">
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input
                                className="form-control form-control-sm"
                                max="90.0"
                                min="-90.0"
                                onChange={e => this.updateBoundaryFromCoords({latMax: parseFloat(e.target.value)})}
                                placeholder="North"
                                step="any"
                                type="number"
                                value={latMax}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                max="180.0"
                                min="-180.0"
                                onChange={e => this.updateBoundaryFromCoords({lonMin: parseFloat(e.target.value)})}
                                placeholder="West"
                                step="any"
                                type="number"
                                value={lonMin}
                            />
                        </div>
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                max="180.0"
                                min="-180.0"
                                onChange={e => this.updateBoundaryFromCoords({lonMax: parseFloat(e.target.value)})}
                                placeholder="East"
                                step="any"
                                type="number"
                                value={lonMax}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input
                                className="form-control form-control-sm"
                                max="90.0"
                                min="-90.0"
                                onChange={e => this.updateBoundaryFromCoords({latMin: parseFloat(e.target.value)})}
                                placeholder="South"
                                step="any"
                                type="number"
                                value={latMin}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    renderFileInput = fileType => (
        <div>
            <div style={{display: "flex"}}>
                <label
                    className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
                    htmlFor="plot-distribution-file"
                    id="custom-upload"
                    style={{display: "flex", alignItems: "center", width: "fit-content"}}
                >
                    Upload plot file
                    <input
                        accept={fileType === "csv" ? "text/csv" : "application/zip"}
                        defaultValue=""
                        id="plot-distribution-file"
                        onChange={e => {
                            const file = e.target.files[0];
                            encodeFileAsBase64(file, base64 => this.setPlotDetails({
                                plotFileName: file.name,
                                plotFileBase64: base64
                            }));
                        }}
                        style={{display: "none"}}
                        type="file"
                    />
                </label>
                <label className="ml-3 text-nowrap">
                    File: {this.context.plotFileName || (this.context.projectId > 0 ? "Use existing data" : "None")}
                </label>
            </div>
            <a href={fileType === "csv" ? "test_data/plot-csv-example.csv" : "test_data/plot-shape-example.zip"}>
                Download example plot {fileType === "csv" ? "csv" : "shape"} file
            </a>
        </div>
    );

    renderCSV = plotUnits => (
        <div style={{display: "flex", flexDirection: "column"}}>
            {this.renderFileInput("csv")}
            <div style={{display: "flex"}}>
                {this.renderPlotShape()}
                {this.renderLabeledInput(plotUnits, "plotSize")}
            </div>
        </div>
    );

    render() {
        const {plotDistribution, plotShape} = this.context;
        const {institutionUserList} = this.props;
        const totalPlots = this.props.getTotalPlots();
        const plotUnits = plotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";

        const plotOptions = {
            random: {
                display: "Random",
                description: "Plot centers will be randomly distributed within the project boundary.",
                inputs: [() => this.renderLabeledInput("Number of plots", "numPlots"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput(plotUnits, "plotSize")],
                showAOI: true
            },
            gridded: {
                display: "Gridded",
                description: "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below.",
                inputs: [() => this.renderLabeledInput("Plot spacing (m)", "plotSpacing"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput(plotUnits, "plotSize")],
                showAOI: true
            },
            csv: {
                display: "CSV File",
                description: "Specify your own plot centers by uploading a CSV with these fields: LON,LAT,PLOTID.",
                inputs: [() => this.renderCSV(plotUnits)],
                showAOI: false
            },
            shp: {
                display: "SHP File",
                description: "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID field.",
                inputs: [() => this.renderFileInput("shp")],
                showAOI: false
            }
        };

        return (
            <div id="plot-design">
                <div className="row">
                    <div className="col" id="plot-design-col1">
                        <h2 className="mb-3">Plot Generation</h2>
                        <div className="d-flex">
                            <div className="d-flex flex-column">
                                <div className="d-flex">
                                    <label>Spatial Distribution</label>
                                    <select
                                        className="form-control form-control-sm ml-3"
                                        onChange={e => this.setPlotDetails({plotDistribution: e.target.value})}
                                        style={{width: "initial"}}
                                        value={plotDistribution}
                                    >
                                        {Object.entries(plotOptions).map(([key, options]) =>
                                            <option key={key} value={key}>{options.display}</option>)}
                                    </select>
                                </div>
                                <p className="font-italic ml-2 small" id="plot-design-text">
                                    - {plotOptions[plotDistribution].description}
                                </p>
                                <div style={{display: "flex"}}>
                                    {plotOptions[plotDistribution].inputs.map((i, idx) => (
                                        // eslint-disable-next-line react/no-array-index-key
                                        <div key={idx} className="mr-3">
                                            {i()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {plotOptions[plotDistribution].showAOI && this.renderAOICoords()}
                        </div>
                    </div>
                </div>
                <p
                    className="font-italic ml-2 small"
                    style={{
                        color: totalPlots > plotLimit ? "#8B0000" : "#006400",
                        fontSize: "1rem",
                        whiteSpace: "pre-line"
                    }}
                >
                    {totalPlots > 0 && `This project will contain around ${formatNumberWithCommas(totalPlots)} plots.`}
                    {totalPlots > 0 && totalPlots > plotLimit
                        && `\n* The maximum allowed number for the selected plot distribution is ${formatNumberWithCommas(plotLimit)}.`}
                </p>
                <div className="row mr-1">
                    <AssignPlots institutionUserList={institutionUserList} totalPlots={totalPlots}/>
                    <QualityControl institutionUserList={institutionUserList} totalPlots={totalPlots}/>
                </div>
            </div>
        );
    }
}
PlotDesign.contextType = ProjectContext;

export function PlotDesignReview() {
    return (
        <div className="d-flex">
            <div className="col-6">
                <PlotReview/>
            </div>
            <div className="col-6">
                <AOIReview/>
            </div>
        </div>
    );
}

export function PlotReview() {
    return (
        <ProjectContext.Consumer>
            {({
                numPlots,
                plotDistribution,
                plotFileName,
                plotShape,
                plotSize,
                plotSpacing,
                useTemplatePlots
            }) => (
                <div id="plot-review">
                    {useTemplatePlots && <h3 className="mb-3">Plots will be copied from template project</h3>}
                    <div className="d-flex">
                        <div id="plot-review-col1">
                            <table className="table table-sm" id="plot-review-table">
                                <tbody>
                                    <tr>
                                        <td className="w-80 pr-5">Spatial distribution</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{plotDistribution}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="w-80">Number of plots</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{numPlots} plots</span>
                                        </td>
                                    </tr>
                                    {plotDistribution === "gridded" && (
                                        <tr>
                                            <td className="w-80">Plot spacing</td>
                                            <td className="w-20 text-center">
                                                <span className="badge badge-pill bg-lightgreen">{plotSpacing} m</span>
                                            </td>
                                        </tr>
                                    )}
                                    {plotDistribution !== "shp" && (
                                        <>
                                            <tr>
                                                <td className="w-80">Plot shape</td>
                                                <td className="w-20 text-center">
                                                    <span className="badge badge-pill bg-lightgreen">{plotShape}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="w-80">Plot size</td>
                                                <td className="w-20 text-center">
                                                    <span className="badge badge-pill bg-lightgreen">{plotSize} m</span>
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                    {["shp", "csv"].includes(plotDistribution) && (
                                        <tr>
                                            <td className="w-80">Plot file</td>
                                            <td className="w-20 text-center">
                                                <span className="badge badge-pill bg-lightgreen tooltip_wrapper" style={{color: "white"}}>
                                                    {plotFileName.split(".").map(s => truncate(s, 13)).join("")}
                                                    <div className="tooltip_content">{plotFileName}</div>
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </ProjectContext.Consumer>
    );
}

export function AOIReview() {
    return (
        <ProjectContext.Consumer>
            {({boundary}) => {
                const boundaryExtent = mercator.parseGeoJson(boundary, false).getExtent();
                return (
                    <div id="aoi-review">
                        <h3>Boundary Coordinates</h3>
                        <div className="form-group mx-4">
                            <div className="row">
                                <div className="col-md-6 offset-md-3">
                                    <label><b>North: </b>{boundaryExtent[3]}</label>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <label><b>West: </b>{boundaryExtent[0]}</label>
                                </div>
                                <div className="col-md-6">
                                    <label><b>East: </b>{boundaryExtent[2]}</label>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 offset-md-3">
                                    <label><b>South: </b>{boundaryExtent[1]}</label>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }}
        </ProjectContext.Consumer>
    );
}
