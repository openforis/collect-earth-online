import React from "react";

import {formatNumberWithCommas, encodeFileAsBase64, truncate} from "../utils/generalUtils";
import {ProjectContext, perPlotLimit, sampleLimit} from "./constants";

export class SampleDesign extends React.Component {
    /// Render Functions

    renderLabeledInput = (label, property) => (
        <div className="form-group">
            <label htmlFor={property}>{label}</label>
            <input
                className="form-control form-control-sm"
                id={property}
                min="0"
                onChange={e => this.context.setProjectDetails({[property]: Number(e.target.value)})}
                step="1"
                type="number"
                value={this.context[property] || ""}
            />
        </div>
    );

    renderFileInput = fileType => (
        <div>
            <div style={{display: "flex"}}>
                <label
                    className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
                    htmlFor="sample-distribution-file"
                    id="custom-upload"
                    style={{display: "flex", alignItems: "center", width: "fit-content"}}
                >
                    Upload sample file
                    <input
                        accept={fileType === "csv" ? "text/csv" : "application/zip"}
                        defaultValue=""
                        id="sample-distribution-file"
                        onChange={e => {
                            const file = e.target.files[0];
                            encodeFileAsBase64(file, base64 => this.context.setProjectDetails({
                                sampleFileName: file.name,
                                sampleFileBase64: base64
                            }));
                        }}
                        style={{display: "none"}}
                        type="file"
                    />
                </label>
                <label className="ml-3 text-nowrap">
                    File: {this.context.sampleFileName
                            || ((this.context.projectId === -1 || this.context.plotFileName) ? " None" : " Use existing data")}
                </label>
            </div>
            <a href={fileType === "csv" ? "test_data/sample-csv-example.csv" : "test_data/sample-shape-example.zip"}>
                Download example sample {fileType === "csv" ? "csv" : "shape"} file
            </a>
        </div>
    );

    toggleSampleGeometry = geometry => {
        const {sampleGeometries} = this.context.designSettings;
        this.context.setProjectDetails({
            designSettings: {
                sampleGeometries: {...sampleGeometries, [geometry]: !sampleGeometries[geometry]}
            }
        });
    };

    render() {
        const {
            allowDrawnSamples,
            designSettings: {sampleGeometries},
            plotDistribution,
            sampleDistribution,
            setProjectDetails
        } = this.context;
        const totalPlots = this.props.getTotalPlots();
        const samplesPerPlot = this.props.getSamplesPerPlot();

        const sampleOptions = {
            random: {
                display: "Random",
                description: "Sample points will be randomly distributed within the plot boundary.",
                inputs: [() => this.renderLabeledInput("Number of samples", "samplesPerPlot")],
                disabled: plotDistribution === "shp"
            },
            gridded: {
                display: "Gridded",
                description: "Sample points will be arranged on a grid within the plot boundary using the sample spacing selected below.",
                inputs: [() => this.renderLabeledInput("Sample spacing (m)", "sampleResolution")],
                disabled: plotDistribution === "shp"
            },
            center: {
                display: "Center",
                description: "A single sample point will be placed in the center of the plot.",
                inputs: []
            },
            csv: {
                display: "CSV File",
                description: "Specify your own sample points by uploading a CSV with these fields: LON,LAT,PLOTID,SAMPLEID.",
                inputs: [() => this.renderFileInput("csv")],
                disabled: !["csv", "shp"].includes(plotDistribution)
            },
            shp: {
                display: "SHP File",
                description: "Specify your own sample shapes by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have PLOTID and SAMPLEID fields.",
                inputs: [() => this.renderFileInput("shp")],
                disabled: !["csv", "shp"].includes(plotDistribution)
            },
            none: {
                display: "None",
                description: "Do not predefine any samples. Requires users to draw their own samples during collection.",
                inputs: [() => <h3>Users will draw samples at collection time.</h3>]

            }
        };

        const geometries = {
            points: {
                display: "Points",
                alwaysEnabled: ["random", "gridded", "center"]
            },
            lines: {
                display: "Lines"
            },
            polygons: {
                display: "Polygons"
            }
        };

        return (
            <div id="sample-design">
                <h2>Sample Generation</h2>
                <div className="form-check form-check-inline">
                    <label>Spatial Distribution</label>
                    <select
                        className="form-control form-control-sm ml-3"
                        onChange={e => {
                            const newDistributionType = e.target.value;
                            const pointRequired = ["random", "gridded", "center"].includes(newDistributionType);
                            const {points} = sampleGeometries;
                            setProjectDetails({
                                allowDrawnSamples: (newDistributionType === "none") || allowDrawnSamples,
                                sampleDistribution: newDistributionType,
                                designSettings: {
                                    sampleGeometries: {
                                        ...sampleGeometries,
                                        points: points || pointRequired
                                    }
                                }
                            });
                        }}
                        style={{width: "initial"}}
                        value={sampleDistribution}
                    >
                        {Object.entries(sampleOptions).map(([key, options]) => (
                            <option key={key} disabled={options.disabled} value={key}>
                                {options.display}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="font-italic ml-2 small" id="sample-design-text">
                    - {sampleOptions[sampleDistribution].description}
                </p>
                <div style={{display: "flex"}}>
                    {sampleOptions[sampleDistribution].inputs.map((i, idx) => (
                        <div key={idx} className="mr-3">
                            {i()}
                        </div>
                    ))}
                </div>
                <p
                    className="font-italic ml-2"
                    style={{
                        color: samplesPerPlot > perPlotLimit ? "#8B0000" : "#006400",
                        fontSize: "1rem",
                        whiteSpace: "pre-line"
                    }}
                >
                    {samplesPerPlot > 0 && `Each plot will contain around ${formatNumberWithCommas(samplesPerPlot)} samples.`}
                    {totalPlots > 0 && samplesPerPlot > 0
                        ? `  There will be around ${formatNumberWithCommas(totalPlots * samplesPerPlot)} total samples in the project.`
                        : sampleDistribution === "none"
                            ? "  No samples will be added to the plot."
                            : ""}
                    {totalPlots > 0 && samplesPerPlot > 0 && samplesPerPlot > perPlotLimit
                        && `* The maximum allowed for the selected sample distribution is ${formatNumberWithCommas(perPlotLimit)}`
                            + ` samples per plot. * The maximum allowed samples per project is ${formatNumberWithCommas(sampleLimit)}.`}
                </p>
                <div className="mb-3">
                    <div className="form-check form-check-inline">
                        <input
                            checked={allowDrawnSamples || sampleDistribution === "none"}
                            className="form-check-input"
                            disabled={sampleDistribution === "none"}
                            id="allow-drawn-samples"
                            onChange={() => setProjectDetails({allowDrawnSamples: !allowDrawnSamples})}
                            type="checkbox"
                        />
                        <label
                            className="form-check-label"
                            htmlFor="allow-drawn-samples"
                        >
                            Allow users to draw their own samples
                        </label>
                    </div>
                    <p className="font-italic ml-2 small">
                        - Enable this to allow users to draw and label points, lines,
                        and polygons during data collection.
                    </p>
                    {allowDrawnSamples && (
                        <div className="form-group">
                            <label
                                htmlFor="restrict-sample-geometry"
                            >
                                Allowed sample geometries:
                            </label>
                            <p className="font-italic ml-2 small">
                                - Allow sample geometries to points, lines, and/or polygons.
                            </p>
                            {Object.entries(geometries).map(([geometry, options]) => (
                                <div key={geometry} className="form-check">
                                    <input
                                        checked={sampleGeometries[geometry]}
                                        className="form-check-input"
                                        disabled={options.alwaysEnabled?.includes(sampleDistribution)}
                                        id={geometry}
                                        onChange={() => this.toggleSampleGeometry(geometry)}
                                        type="checkbox"
                                        value={geometry}
                                    />
                                    <label htmlFor={geometry}>
                                        {options.display}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
SampleDesign.contextType = ProjectContext;

export function SampleReview() {
    return (
        <ProjectContext.Consumer>
            {({
                allowDrawnSamples,
                sampleDistribution,
                sampleFileName,
                sampleResolution,
                samplesPerPlot,
                useTemplatePlots
            }) => (
                <div id="sample-review">
                    {useTemplatePlots && <h3 className="mb-3">Samples will be copied from template project</h3>}
                    {sampleDistribution === "none"
                        ? <h3>No samples are predefined.</h3>
                        : (
                            <div className="d-flex">
                                <div id="sample-review-col1">
                                    <table className="table table-sm" id="sample-review-table">
                                        <tbody>
                                            <tr>
                                                <td className="w-80 pr-5">Spatial Distribution</td>
                                                <td className="w-20 text-center">
                                                    <span className="badge badge-pill bg-lightgreen">{sampleDistribution}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="w-80">Samples Per Plot</td>
                                                <td className="w-20 text-center">
                                                    <span className="badge badge-pill bg-lightgreen">{samplesPerPlot} / plot</span>
                                                </td>
                                            </tr>
                                            {sampleDistribution === "gridded" && (
                                                <tr>
                                                    <td className="w-80">Sample Spacing</td>
                                                    <td className="w-20 text-center">
                                                        <span className="badge badge-pill bg-lightgreen">{sampleResolution} m</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {sampleFileName && (
                                                <tr>
                                                    <td className="w-80">Sample File</td>
                                                    <td className="w-20 text-center">
                                                        <span className="badge badge-pill bg-lightgreen tooltip_wrapper" style={{color: "white"}}>
                                                            {sampleFileName.split(".").map(s => truncate(s, 13)).join("")}
                                                            <div className="tooltip_content">{sampleFileName}</div>
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    {allowDrawnSamples && <h3>Users can draw additional samples at collection time.</h3>}
                </div>
            )}
        </ProjectContext.Consumer>
    );
}

export function SamplePreview() {
    // TODO: Update messaging so it's more clear when shp is defined at the plot level, especially with CSV samples
    return (
        <ProjectContext.Consumer>
            {({plotDistribution, sampleDistribution, plotShape}) => (
                <div className="p-3">
                    {(plotDistribution === "shp")
                        ? <h3>The system cannot currently generate a preview of plot shp files.</h3>
                        : (sampleDistribution === "csv")
                            ? <h3>The system cannot currently generate a preview of sample csv files.</h3>
                            : (sampleDistribution === "shp")
                                ? <h3>The system cannot currently generate a preview of sample shp files.</h3>
                                : (
                                    <div>
                                        <h3>
                                            The following is a mock up of a {plotShape}
                                            plot with {sampleDistribution} samples.
                                        </h3>
                                        <img
                                            alt="distribution"
                                            className="w-100 h-100"
                                            src={"/img/examples/" + plotShape + "-" + sampleDistribution + ".webp"}
                                        />
                                    </div>
                                )}
                </div>
            )}
        </ProjectContext.Consumer>
    );
}
