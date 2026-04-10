import React from "react";
import ReactDOM from "react-dom";

import "../css/project-wizard.css";

const ProjectWizard = ({}) => {
  return (<div></div>);
};

export function pageInit(params, session) {
  ReactDOM.render(
    <ProjectWizard />,
    document.getElementById("app")
  );
}
