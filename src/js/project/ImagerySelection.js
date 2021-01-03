import React from "react";

import {ProjectContext} from "./constants";

const renderImageryRow = (filteredImageryList, defaultImageryId, projectImageryList, setProjectDetails, type) =>
    <div className="row mt-3 px-5">
        {filteredImageryList.length > 0
        ?
            filteredImageryList.map((imagery, idx) =>
                <div className="col-md-6 form-check" key={idx}>
                    <input
                        className="form-check-input"
                        id={imagery.id}
                        onChange={e => setProjectDetails({
                            projectImageryList: e.target.checked
                                ? [...projectImageryList, imagery.id]
                                : projectImageryList.filter(img => img !== imagery.id),
                        })}
                        type="checkbox"
                        disabled={imagery.id === defaultImageryId}
                        checked={projectImageryList.includes(imagery.id) || imagery.id === defaultImageryId}
                    />
                    <label htmlFor={imagery.id} className="form-check-label">{imagery.title}</label>
                </div>
            )
        : <label>{`No ${type} imagery found.`}</label>}
    </div>;

export function ImagerySelection() {
    return (
        <ProjectContext.Consumer>
            {({imageryId, institutionImagery, projectImageryList, setProjectDetails}) =>
                institutionImagery
                ?
                    <div id="project-imagery">
                        <div className="form-group" id="project-default-imagery">
                            <h3>Default Imagery</h3>
                            <select
                                className="form-control form-control-sm"
                                size="1"
                                value={imageryId || -1}
                                onChange={e => setProjectDetails({imageryId: parseInt(e.target.value)})}
                            >
                                {institutionImagery.map((imagery, uid) =>
                                    <option key={uid} value={imagery.id}>{imagery.title}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <h3>Public Imagery</h3>
                            {renderImageryRow(
                                institutionImagery.filter(imagery => imagery.visibility === "public"),
                                imageryId,
                                projectImageryList,
                                setProjectDetails,
                                "public"
                            )}
                            <h3>Private Institution Imagery*</h3>
                            {renderImageryRow(
                                institutionImagery.filter(imagery => imagery.visibility === "private"),
                                imageryId,
                                projectImageryList,
                                setProjectDetails,
                                "institution"
                            )}
                        </div>
                        <p id="project-imagery-text" className="font-italic ml-2 small">
                            * Institution imagery will only be visible to institution members, no matter the project visibility.
                        </p>
                    </div>
                :
                    <div id="project-loading-imagery">
                        <div className="form-group">
                            <h3>Default Imagery</h3>
                            <p>Loading Imagery...</p>
                        </div>
                    </div>
            }
        </ProjectContext.Consumer>
    );
}

const findImageryName = (id, institutionImagery) => {
    const imagery = institutionImagery.find(ii => ii.id === id);
    return imagery ? imagery.title : "Imagery Error";
};

export function ImageryReview() {
    return (
        <ProjectContext.Consumer>
            {({imageryId, projectImageryList, institutionImagery}) =>
                <div className="d-flex flex-column">
                    <label><b>Default Imagery:</b>  {findImageryName(imageryId, institutionImagery)}</label>
                    <label><b>Additional Imagery:</b>  {projectImageryList.length === 0 && "None"}</label>
                    {projectImageryList.length > 0 &&
                        <ul>
                            {projectImageryList
                                .filter(id => id !== imageryId)
                                .map(id => <li key={id}>{findImageryName(id, institutionImagery)}</li>)
                            }
                        </ul>
                    }
                </div>
            }
        </ProjectContext.Consumer>
    );
}
