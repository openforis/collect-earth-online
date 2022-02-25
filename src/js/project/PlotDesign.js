import React, {useContext} from "react";
import shp from "shpjs";

import {formatNumberWithCommas, readFileAsArrayBuffer, readFileAsBase64Url} from "../utils/generalUtils";
import {ProjectContext, plotLimit} from "./constants";
import {mercator} from "../utils/mercator";
import Select from "../components/Select";

export class PlotDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            boundaryInputType: "manual",
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
        if (this.props.aoiFeatures && prevProps.aoiFeatures !== this.props.aoiFeatures) {
            this.setCoordsFromBoundary();
        }
    }

    setCoordsFromBoundary = () => {
        const {aoiFeatures} = this.props;
        if (aoiFeatures?.length === 1) {
            const boundaryExtent = mercator.parseGeoJson(aoiFeatures[0], false).getExtent();
            this.setState({
                lonMin: boundaryExtent[0],
                latMin: boundaryExtent[1],
                lonMax: boundaryExtent[2],
                latMax: boundaryExtent[3]
            });
        } else {
            this.setState({
                lonMin: "",
                latMin: "",
                lonMax: "",
                latMax: ""
            });
        }
    };

    updateBoundaryFromCoords = newCoord => {
        this.setState(
            newCoord,
            () => {
                const {latMin, latMax, lonMin, lonMax} = this.state;
                this.setPlotDetails({
                    aoiFeatures: [mercator.generateGeoJSON(latMin, latMax, lonMin, lonMax)]
                });
            }
        );
    };

    setPlotDetails = newDetail => {
        const resetAOI = ["csv", "shp"].includes(newDetail.plotDistribution);
        if (resetAOI) {
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
            resetAOI ? {aoiFeatures: [], aoiFileName: ""} : {}
        ));
    };

    /// Render Functions

    renderLabeledInput = (label, property) => (
        <div className="form-group" style={{width: "fit-content"}}>
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

    renderShufflePlots = () => {
        const {shufflePlots} = this.context;
        return (
            <div className="form-check">
                <input
                    checked={shufflePlots}
                    className="form-check-input"
                    id="shufflePlots"
                    onChange={() => this.setPlotDetails({shufflePlots: !shufflePlots})}
                    type="checkbox"
                />
                <label className="form-check-label" htmlFor="shufflePlots">
                    Shuffle plot order
                </label>
            </div>
        );
    };

    renderPlotShape = () => {
        const {plotShape} = this.context;
        return (
            <div className="form-group" style={{display: "flex", flexDirection: "column"}}>
                <label>Plot shape</label>
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
            <div style={{width: "20rem"}}>
                <div className="form-group ml-3">
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

    loadGeoJson = shpFile => {
        try {
            shp(shpFile).then(g => {
                this.context.setProjectDetails({
                    aoiFeatures: g.features.map(f => f.geometry),
                    aoiFileName: g.fileName
                });
            });
        } catch {
            alert("Unknown error loading shape file.");
        }
    };

    renderBoundaryFileInput = () => (
        <div className="d-flex">
            <label
                className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
                htmlFor="project-boundary-file"
                id="custom-upload"
                style={{display: "flex", alignItems: "center", width: "fit-content"}}
            >
                    Upload project boundary
                <input
                    accept="application/zip"
                    defaultValue=""
                    id="project-boundary-file"
                    onChange={e => {
                        const file = e.target.files[0];
                        readFileAsArrayBuffer(file, this.loadGeoJson);
                    }}
                    style={{display: "none"}}
                    type="file"
                />
            </label>
            <label className="ml-3 text-nowrap">
                    File: {this.context.aoiFileName}
            </label>
        </div>
    );

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
                            readFileAsBase64Url(file, base64 => this.setPlotDetails({
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
        const {boundaryInputType} = this.state;
        const {plotDistribution, plotShape} = this.context;
        const {totalPlots, setIsMapInactive} = this.props;
        const plotUnits = plotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";

        const plotOptions = {
            random: {
                display: "Random",
                description: "Plot centers will be randomly distributed within the project boundary.",
                inputs: [() => this.renderLabeledInput("Number of plots", "numPlots"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput(plotUnits, "plotSize"),
                         this.renderShufflePlots],
                showAOI: true
            },
            gridded: {
                display: "Gridded",
                description: "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below.",
                inputs: [() => this.renderLabeledInput("Plot spacing (m)", "plotSpacing"),
                         this.renderPlotShape,
                         () => this.renderLabeledInput(plotUnits, "plotSize"),
                         this.renderShufflePlots],
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
                <h3 className="mb-3">Plot Generation</h3>
                <div className="ml-3">
                    <div className="d-flex flex-column">
                        <div className="form-group" style={{width: "fit-content"}}>
                            <label>Spatial distribution</label>
                            <select
                                className="form-control form-control-sm"
                                onChange={e => this.setPlotDetails({plotDistribution: e.target.value})}
                                value={plotDistribution}
                            >
                                {Object.entries(plotOptions).map(([key, options]) =>
                                    <option key={key} value={key}>{options.display}</option>)}
                            </select>
                        </div>
                        <p className="font-italic ml-2">{`- ${plotOptions[plotDistribution].description}`}</p>
                    </div>
                    <div>
                        <div style={{display: "flex"}}>
                            {plotOptions[plotDistribution].inputs.map((i, idx) => (
                            // eslint-disable-next-line react/no-array-index-key
                                <div key={idx} className="mr-3">
                                    {i()}
                                </div>
                            ))}
                        </div>
                        {plotOptions[plotDistribution].showAOI && (
                            <div>
                                <div className="mb-3">
                                    <Select
                                        id="aoi"
                                        label="Boundary type"
                                        onChange={e => {
                                            const newBoundaryInputType = e.target.value;
                                            this.setState({boundaryInputType: newBoundaryInputType});
                                            setIsMapInactive(newBoundaryInputType === "file");
                                        }}
                                        options={[{value: "manual", label: "Input boundary coordinates"},
                                                  {value: "file", label: "Upload boundary file"}]}
                                        value={boundaryInputType}
                                    />
                                </div>
                                {boundaryInputType === "manual" ? this.renderAOICoords() : this.renderBoundaryFileInput()}
                            </div>
                        )}
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
    const {
        numPlots,
        plotDistribution,
        plotFileName,
        plotShape,
        plotSize,
        plotSpacing,
        useTemplatePlots
    } = useContext(ProjectContext);
    return (
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
                                            {plotFileName
                                                ? plotFileName.length > 13 ? `${plotFileName.substring(0, 13)}...` : plotFileName
                                                : "null"}
                                            {plotFileName && <div className="tooltip_content">{plotFileName}</div>}
                                        </span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function AOIReview() {
    const {aoiFeatures, aoiFileName} = useContext(ProjectContext);
    const boundaryExtent = mercator.parseGeoJson(aoiFeatures[0], false).getExtent();
    return (
        <div id="aoi-review">
            {aoiFileName.length
                ? <label>Boundary will be calculated from {aoiFileName}</label>
                : (
                    <>
                        <label>Boundary Coordinates</label>
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
                    </>
                )}
        </div>
    );
}
