import React, { useState } from "react";

import GeoDashModal from "./GeoDashModal";

export default function CopyDialog(props) {
  const [projectFilter, setProjectFilter] = useState("");
  const [templateId, setTemplateId] = useState(0);

  const { projectTemplateList, copyProjectWidgets, closeDialogs } = props;

  const dialogBody = (
    <form>
      <div className="form-group">
        <label htmlFor="project-filter">Template Filter (Name or ID)</label>
        <input
          className="form-control"
          id="project-filter"
          onChange={(e) => setProjectFilter(e.target.value)}
          type="text"
          value={projectFilter}
        />
      </div>
      <div className="form-group">
        <label htmlFor="project-template">From Project</label>
        <select
          className="form-control"
          id="project-template"
          onChange={(e) => setTemplateId(parseInt(e.target.value))}
          value={templateId}
        >
          <option key={0} value={0}>
            None
          </option>
          {projectTemplateList
            .filter(({ id, name }) =>
              (id + name.toLocaleLowerCase()).includes(projectFilter.toLocaleLowerCase())
            )
            .map(({ id, name }) => (
              <option key={id} value={id}>
                {id} - {name}
              </option>
            ))}
        </select>
      </div>
    </form>
  );

  const dialogButtons = (
    <>
      <button className="btn btn-red" onClick={closeDialogs} type="button">
        Close
      </button>
      <button
        className="btn btn-yellow"
        onClick={() => copyProjectWidgets(templateId)}
        type="button"
      >
        Copy
      </button>
    </>
  );
  return (
    <GeoDashModal
      body={dialogBody}
      closeDialogs={closeDialogs}
      footer={dialogButtons}
      title="Copy Widget Layout"
    />
  );
}
