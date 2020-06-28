import React, { Fragment } from "react";

import { SectionBlock } from "./FormComponents";

export function ProjectInfo({ name, description, privacyLevel, setProjectDetail }) {
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
                        <label
                            className="form-check-label"
                            htmlFor="privacy-public"
                            title="All users including those who are not logged in"
                        >
                            Public: <i>All</i>
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="privacy-users"
                            name="privacy-level"
                            value="users"
                            checked={privacyLevel === "users"}
                            onChange={() => setProjectDetail("privacyLevel", "users")}
                        />
                        <label className="form-check-label" htmlFor="privacy-users">
                            Users: <i>Logged In Users</i>
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="privacy-institution"
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
                </div>
            </div>
        </SectionBlock>
    );
}

export function ProjectAOI({
    coordinates: { latMax, lonMin, lonMax, latMin },
    inDesignMode,
    imageryId,
    imageryList,
    setProjectDetail,
    projectImageryList,
    setProjectImageryList,
}) {
    return (
        <SectionBlock title="Project AOI">
            <div id="project-aoi">
                <div id="project-map"></div>
                {inDesignMode &&
                <div className="col small text-center mb-2">
                    Hold CTRL and click-and-drag a bounding box on the map
                </div>}
                <div className="form-group mx-4">
                    <div className="row">
                        <div className="col-md-6 offset-md-3">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                defaultValue={latMax}
                                placeholder="North"
                                min="-90.0"
                                max="90.0"
                                step="any"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                defaultValue={lonMin}
                                placeholder="West"
                                min="-180.0"
                                max="180.0"
                                step="any"
                                disabled
                            />
                        </div>
                        <div className="col-md-6">
                            <input
                                className="form-control form-control-sm"
                                type="number"
                                defaultValue={lonMax}
                                placeholder="East"
                                min="-180.0"
                                max="180.0"
                                step="any"
                                disabled
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
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>
            {imageryList
                ? <div id="project-imagery">
                    <div className="form-group" id="project-default-imagery">
                        <h3 htmlFor="project-default-imagery">Default Imagery</h3>
                        <select
                            className="form-control form-control-sm"
                            size="1"
                            value={imageryId || -1}
                            onChange={e => setProjectDetail("imageryId", parseInt(e.target.value))}
                        >
                            {
                                imageryList.filter(layerConfig => layerConfig.sourceConfig.type !== "PlanetDaily")
                                    .map((imagery, uid) =>
                                        <option key={uid} value={imagery.id}>{imagery.title}</option>
                                    )
                            }
                        </select>
                    </div>
                    <hr />
                    <div className="form-group" id="additional-imagery">
                        <h3 htmlFor="additional-imagery">Additional Imagery</h3>
                        <div className="row mt-3">
                            {imageryList.map((imagery, uid) =>
                                <div className="col-md-5 offset-md-1 form-check" key={uid}>
                                    <input
                                        className="form-check-input"
                                        id={imagery.id}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setProjectImageryList([...projectImageryList, imagery.id]);
                                            } else {
                                                setProjectImageryList(projectImageryList.filter(img => img !== imagery.id));
                                            }
                                        }}
                                        type="checkbox"
                                        disabled={imagery.id === imageryId}
                                        checked={projectImageryList.includes(imagery.id) || imagery.id === imageryId}
                                    />
                                    <label htmlFor={imagery.id} className="form-check-label">{imagery.title}</label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                : <div id="project-loading-imagery">
                    <div className="form-group">
                        <h3 htmlFor="project-loading-imagery">Default Imagery</h3>
                        <p>Loading Imagery...</p>
                    </div>
                </div>
            }
        </SectionBlock>
    );
}

export function ProjectOptions( { showGEEScript, onShowGEEScriptClick } ) {
    return (
        <SectionBlock title="Project Options">
            <div className="form-check">
                <input
                    className="form-check-input"
                    checked={showGEEScript}
                    id="showGEEScript"
                    onChange={onShowGEEScriptClick}
                    type="checkbox"
                />
                <label htmlFor="showGEEScript" className="form-check-label">Show GEE Script in Collection Page?</label>
            </div>
        </SectionBlock>
    );
}

export function PlotReview({ projectDetails: { plotDistribution, numPlots, plotSpacing, plotShape, plotSize }}) {
    return (
        <SectionBlock title="Plot Review">
            <div id="plot-design">
                <div className="row">
                    <div id="plot-design-col1" className="col">
                        <table id="plot-review-table" className="table table-sm">
                            <tbody>
                                <tr>
                                    <td className="w-80">Spatial Distribution</td>
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
                                    <Fragment>
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
                                    </Fragment>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

export function SampleReview({ projectDetails: { sampleDistribution, samplesPerPlot, sampleResolution }}) {
    return (
        <SectionBlock title="Sample Design">
            <div id="sample-design">
                <table id="plot-review-table" className="table table-sm">
                    <tbody>
                        <tr>
                            <td className="w-80">Spatial Distribution</td>
                            <td className="w-20 text-center">
                                <span className="badge badge-pill bg-lightgreen">{sampleDistribution} distribution</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="w-80">Samples Per Plot</td>
                            <td className="w-20 text-center">
                                <span className="badge badge-pill bg-lightgreen">{samplesPerPlot} /plot</span>
                            </td>
                        </tr>
                        {sampleDistribution === "gridded" &&
                            <tr>
                                <td className="w-80">Sample Resolution</td>
                                <td className="w-20 text-center">
                                    <span className="badge badge-pill bg-lightgreen">{sampleResolution} m</span>
                                </td>
                            </tr>
                        }

                    </tbody>
                </table>
            </div>
        </SectionBlock>
    );
}
