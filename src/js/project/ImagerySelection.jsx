import React, { useContext } from "react";

import { ProjectContext } from "./constants";

const renderImageryRow = (
  filteredImageryList,
  defaultImageryId,
  projectImageryList,
  setProjectDetails,
  type
) => (
  <div className="row px-3">
    {filteredImageryList.length > 0 ? (
      filteredImageryList.map((imagery) => (
        <div key={imagery.id} className="col-md-6 form-check">
          <input
            checked={projectImageryList.includes(imagery.id) || imagery.id === defaultImageryId}
            className="form-check-input"
            disabled={imagery.id === defaultImageryId}
            id={imagery.id}
            onChange={(e) =>
              setProjectDetails({
                projectImageryList: e.target.checked
                  ? [...projectImageryList, imagery.id]
                  : projectImageryList.filter((img) => img !== imagery.id),
              })
            }
            type="checkbox"
          />
          <label className="form-check-label" htmlFor={imagery.id}>
            {imagery.title}
          </label>
        </div>
      ))
    ) : (
      <label>{`No ${type} imagery found.`}</label>
    )}
  </div>
);

export function ImagerySelection() {
  const { imageryId, institutionImagery, projectImageryList, setProjectDetails } =
    useContext(ProjectContext);
  return institutionImagery ? (
    <div id="project-imagery">
      <h3>Default Imagery</h3>
      <div className="form-group ml-3">
        <label>Base Map</label>
        <select
          className="form-control form-control-sm"
          onChange={(e) => setProjectDetails({ imageryId: parseInt(e.target.value) })}
          size="1"
          value={imageryId || -1}
        >
          {institutionImagery.map((imagery) => (
            <option key={imagery.id} value={imagery.id}>
              {imagery.title}
            </option>
          ))}
        </select>
      </div>
      <h3>Additional Imagery</h3>
      <div className="ml-3">
        <div className="form-group">
          <label>Public Imagery</label>
          {renderImageryRow(
            institutionImagery.filter((imagery) => imagery.visibility === "public"),
            imageryId,
            projectImageryList,
            setProjectDetails,
            "public"
          )}
        </div>
        <div className="form-group">
          <label>Private Institution Imagery</label>
          <p className="font-italic ml-1" style={{ marginTop: "-.5rem" }}>
            * Institution imagery will only be visible to institution members, no matter the project
            visibility.
          </p>
          {renderImageryRow(
            institutionImagery.filter((imagery) => imagery.visibility === "private"),
            imageryId,
            projectImageryList,
            setProjectDetails,
            "institution"
          )}
        </div>
      </div>
    </div>
  ) : (
    <div>
      <div className="form-group">
        <h3>Default Imagery</h3>
        <p>Loading Imagery...</p>
      </div>
    </div>
  );
}

const findImageryName = (id, institutionImagery) => {
  const imagery = institutionImagery.find((ii) => ii.id === id);
  return imagery ? imagery.title : "Imagery Error";
};

export function ImageryReview() {
  const { imageryId, projectImageryList, institutionImagery } = useContext(ProjectContext);
  return (
    <div className="d-flex flex-column">
      <label>
        <b>Default Imagery:</b> {findImageryName(imageryId, institutionImagery)}
      </label>
      <label>
        <b>Additional Imagery:</b> {projectImageryList.length === 0 && "None"}
      </label>
      {projectImageryList.length > 0 && (
        <ul>
          {projectImageryList
            .filter((id) => id !== imageryId)
            .map((id) => (
              <li key={id}>{findImageryName(id, institutionImagery)}</li>
            ))}
        </ul>
      )}
    </div>
  );
}
