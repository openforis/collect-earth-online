import React from "react";

import {ProjectContext} from "./ProjectContext";

export function ImagerySelection() {
    return (
        <ProjectContext.Consumer>
            {({imageryId, institutionImagery, projectImageryList, setProjectState}) => {

                const renderImageryRow = (imageryIds) => imageryIds.map((imagery, uid) =>
                    <div className="col-md-5 offset-md-1 form-check" key={uid}>
                        <input
                            className="form-check-input"
                            id={imagery.id}
                            onChange={e => setProjectState({
                                projectImageryList: e.target.checked
                            ? [...projectImageryList, imagery.id]
                            : projectImageryList.filter(img => img !== imagery.id),
                            })}
                            type="checkbox"
                            disabled={imagery.id === imageryId}
                            checked={projectImageryList.includes(imagery.id) || imagery.id === imageryId}
                        />
                        <label htmlFor={imagery.id} className="form-check-label">{imagery.title}</label>
                    </div>
                );

                return (
                    <>
                        {institutionImagery
                        ?
                            <div id="project-imagery">
                                <div className="form-group" id="project-default-imagery">
                                    <h3 htmlFor="project-default-imagery">Default Imagery</h3>
                                    <select
                                        className="form-control form-control-sm"
                                        size="1"
                                        value={imageryId || -1}
                                        onChange={e => setProjectState({imageryId: parseInt(e.target.value)})}
                                    >
                                        {institutionImagery.filter(layerConfig => layerConfig.sourceConfig.type !== "PlanetDaily")
                                            .map((imagery, uid) =>
                                                <option key={uid} value={imagery.id}>{imagery.title}</option>
                                            )
                                        }
                                    </select>
                                </div>
                                <div className="form-group">
                                    <h3 htmlFor="additional-public-imagery">Public Imagery</h3>
                                    <div className="row mt-3" id="additional-public-imagery">
                                        {renderImageryRow(institutionImagery.filter(imagery => imagery.visibility === "public"))}
                                    </div>
                                    <br />
                                    <h3 htmlFor="additional-private-imagery">Institution Private Imagery*</h3>
                                    <div className="row mt-3" id="additional-private-imagery">
                                        {renderImageryRow(institutionImagery.filter(imagery => imagery.visibility === "private"))}
                                    </div>
                                </div>
                                <p id="project-imagery-text" className="font-italic ml-2 small">
                                    * Institution imagery will only be visible to institution members, no matter the project visibility.
                                </p>
                            </div>
                        :
                            <div id="project-loading-imagery">
                                <div className="form-group">
                                    <h3 htmlFor="project-loading-imagery">Default Imagery</h3>
                                    <p>Loading Imagery...</p>
                                </div>
                            </div>
                        }
                    </>
                );
            }}
        </ProjectContext.Consumer>
    );
}
