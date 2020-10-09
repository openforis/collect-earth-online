import React from "react";

import {formatNumberWithCommas, encodeFileAsBase64} from "../utils/generalUtils";
import {ProjectContext, plotLimit} from "./constants";
import {mercator} from "../utils/mercator.js";

export class PlotDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            boundaryMode: "draw",
        };
    }

    componentDidMount() {
        this.setCoordsFromBoundary();
    }

    componentDidUpdate(prevProps) {
        if (this.state.boundaryMode === "draw" && this.props.boundary && prevProps.boundary !== this.props.boundary) {
            this.setCoordsFromBoundary();
        }
    }

    setCoordsFromBoundary() {
        const boundaryExtent = mercator.parseGeoJson(this.props.boundary, false).getExtent();
        this.setState({
            lonMin: boundaryExtent[0],
            latMin: boundaryExtent[1],
            lonMax: boundaryExtent[2],
            latMax: boundaryExtent[3],
        });
    }

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
                    [lonMin, latMin],
                ]],
            }
            : null;
    };

    updateBoundaryFromCoords = (newCoord) => {
        this.setState(newCoord,
                      () => this.context.setProjectState({boundary: this.generateGeoJSON()}));
    }

    /// Render Functions

    renderLabeledInput = (label, property) => (
        <div className="form-group">
            <label htmlFor={property}>{label}</label>
            <input
                className="form-control form-control-sm"
                type="number"
                id={property}
                min="0"
                step="1"
                value={this.context[property] || ""}
                onChange={e => this.context.setProjectState({[property]: e.target.value})}
            />
        </div>
    )

    renderPlotShape = () => {
        const {plotShape, setProjectState} = this.context;
        return (
            <div className="form-group" style={{display: "flex", flexDirection: "column"}}>
                <label>Plot Shape</label>
                <div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="plot-shape-circle"
                            checked={plotShape === "circle"}
                            onChange={() => setProjectState({plotShape: "circle"})}
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
                            checked={plotShape === "square"}
                            onChange={() => setProjectState({plotShape: "square"})}
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
    }

    renderAOICoords = () => {
        const {latMax, lonMin, lonMax, latMin} = this.state;
        const inEditMode = this.context.designMode === "wizard";
        return (
            <div>
                <label>Boundary Coordinates</label>
                <div className="form-group mx-4">
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                value={latMax}
                                placeholder="North"
                                min="-90.0"
                                max="90.0"
                                step="any"
                                disabled={!inEditMode}
                                onChange={(e) => this.updateBoundaryFromCoords({latMax: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                value={lonMin}
                                placeholder="West"
                                min="-180.0"
                                max="180.0"
                                step="any"
                                disabled={!inEditMode}
                                onChange={(e) => this.updateBoundaryFromCoords({lonMin: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                value={lonMax}
                                placeholder="East"
                                min="-180.0"
                                max="180.0"
                                step="any"
                                disabled={!inEditMode}
                                onChange={(e) => this.updateBoundaryFromCoords({lonMax: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                defaultValue={latMin}
                                placeholder="South"
                                min="-90.0"
                                max="90.0"
                                step="any"
                                disabled={!inEditMode}
                                onChange={(e) => this.updateBoundaryFromCoords({latMin: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    renderFileInput = (fileType) => (
        <div style={{display: "flex"}}>
            <label
                className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
                style={{display: "flex", alignItems: "center", width: "fit-content"}}
                id="custom-upload"
                htmlFor="plot-distribution-file"
            >
                Upload File
                <input
                    type="file"
                    accept={fileType === "csv" ? "text/csv" : "application/zip"}
                    id="plot-distribution-file"
                    defaultValue=""
                    name="plot-distribution-file"
                    onChange={e => {
                        this.context.setProjectState({plotFileName: e.target.files[0].name});
                        encodeFileAsBase64(e.target.files[0], base64 => this.context.setProjectState({plotFileBase64: base64}));
                    }}
                    style={{display: "none"}}
                />
            </label>
            <label className="ml-3 text-nowrap">
                File: {!this.context.plotFileName ? <span className="font-italic">None</span> : this.context.plotFileName}
            </label>
        </div>
    );

    renderCSV = () => (
        <div style={{display: "flex", flexDirection: "column"}}>
            {this.renderFileInput("csv")}
            <div style={{display: "flex"}}>
                {this.renderPlotShape()}
                {this.renderLabeledInput("Diameter (m)", "plotSize")}
            </div>
        </div>
    )

    render() {
        const {plotDistribution} = this.context;
        const totalPlots = this.props.getTotalPlots();

        const plotOptions = {
            random: {
                display: "Random",
                description: "Plot centers will be randomly distributed within the project boundary.",
                inputs: [() => this.renderLabeledInput("Number of plots", "numPlots"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput("Diameter (m)", "plotSize")],
                showAOI: true,
            },
            gridded: {
                display: "Gridded",
                description: "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below.",
                inputs: [() => this.renderLabeledInput("Plot spacing (m)", "plotSpacing"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput("Diameter (m)", "plotSize")],
                showAOI: true,
            },
            csv: {
                display: "CSV File",
                description: "Specify your own plot centers by uploading a CSV with these fields: LON,LAT,PLOTID.",
                inputs: [this.renderCSV],
            },
            shp: {
                display: "SHP File",
                description: "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID field.",
                inputs: [() => this.renderFileInput("shp")],
            },
        };

        return (
            <div id="plot-design">
                <div className="row">
                    <div id="plot-design-col1" className="col mb-3">
                        <h2 className="mb-3">Plot Generation</h2>
                        <div className="d-flex">
                            <div className="d-flex flex-column">
                                <div className="d-flex">
                                    <label>Spatial Distribution</label>
                                    <select
                                        className="form-control form-control-sm ml-3"
                                        style={{width: "initial"}}
                                        onChange={(e) => this.context.setProjectState({plotDistribution: e.target.value})}
                                        value={plotDistribution}
                                    >
                                        {Object.entries(plotOptions).map(([key, options]) =>
                                            <option key={key} value={key}>{options.display}</option>
                                        )}
                                    </select>
                                </div>
                                <p id="plot-design-text" className="font-italic ml-2 small">-
                                    {plotOptions[plotDistribution].description}
                                </p>
                                <div style={{display: "flex"}}>
                                    {plotOptions[plotDistribution].inputs.map((i, idx)=>
                                        <div key={idx} className="mr-3">
                                            {i.call(this)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {plotOptions[plotDistribution].showAOI && this.renderAOICoords()}
                        </div>
                    </div>
                </div>
                {/* TODO have default message.  Warn for no boundary. */}
                <p
                    className="font-italic ml-2 small"
                    style={{
                        marginTop: "10px",
                        color: totalPlots > plotLimit ? "#8B0000" : "#006400",
                        fontSize: "1rem",
                        whiteSpace: "pre-line",
                    }}
                >
                    {totalPlots
                        ? `This project will contain around ${formatNumberWithCommas(totalPlots)} plots.`
                        : ""
                    }
                    {totalPlots && totalPlots > plotLimit
                        ? `\n * The maximum allowed number for the selected plot distribution is ${formatNumberWithCommas(plotLimit)}.`
                        : ""
                    }
                </p>
            </div>
        );
    }
}
PlotDesign.contextType = ProjectContext;

export function PlotReview() {
    return (
        <ProjectContext.Consumer>
            {({plotDistribution, numPlots, plotSpacing, plotShape, plotSize}) =>
                <div id="plot-review">
                    <h3 className="mb-3">Plots will be copied from template project</h3>
                    <div className="row">
                        <div id="plot-review-col1">
                            <table id="plot-review-table" className="table table-sm">
                                <tbody>
                                    <tr>
                                        <td className="w-80 pr-3">Spatial Distribution</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{plotDistribution} distribution</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="w-80">Number of plots</td>
                                        <td className="w-20 text-center">
                                            <span className="badge badge-pill bg-lightgreen">{numPlots} plots</span>
                                        </td>
                                    </tr>
                                    {plotDistribution === "gridded" &&
                                        <tr>
                                            <td className="w-80">Plot spacing</td>
                                            <td className="w-20 text-center">
                                                <span className="badge badge-pill bg-lightgreen">{plotSpacing} m</span>
                                            </td>
                                        </tr>
                                    }
                                    {plotDistribution !== "shp" &&
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
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            }
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
