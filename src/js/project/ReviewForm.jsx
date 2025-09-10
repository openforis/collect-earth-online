import React from "react";

import AOIMap from "./AOIMap";
import { ImageryReview } from "./ImagerySelection";
import { OverviewReview } from "./Overview";
import { AOIReview, PlotReview } from "./PlotDesign";
import { SampleReview } from "./SampleDesign";
import SurveyCardList from "../survey/SurveyCardList";
import SurveyRulesList from "../survey/SurveyRulesList";
import SvgIcon from "../components/svg/SvgIcon";
import UserAssignmentReview from "./UserAssignmentReview";
import QAQCReview from "./QAQCReview";

import { ProjectContext } from "./constants";

export default function ReviewForm() {
  const context = React.useContext(ProjectContext);
  const renderSectionHeader = (title, step, showEditIcon) => (
    <div
      className="header my-2 p-2 d-flex flex-row justify-content-center align-items-center"
      style={{
        background: "var(--lightgreen)",
        margin: "0 -15px 10px -15px",
        padding: "1rem",
        fontSize: "1.1rem",
        fontWeight: 500,
      }}
    >
      <h2
        className="text-truncate"
        style={{
          color: "white",
          fontSize: "1.25rem",
          margin: "0 1rem",
        }}
      >
        {title}
      </h2>
      {showEditIcon ? (
        <button
          className="btn btn-sm btn-outline-info"
          onClick={() => context.setContextState({ designMode: "wizard", wizardStep: step })}
          type="button"
        >
          <SvgIcon color="white" icon="edit" size="1.1rem" />
        </button>
      ) : null}
    </div>
  );  
  return (
    <div className="px-2 pb-2" id="project-design-form">
      <div id="overview-review">
        {renderSectionHeader("Overview", "overview", true)}
        <OverviewReview />
      </div>
      <div id="collection-review">
        {renderSectionHeader("Collection Design", "imagery", true)}
        <AOIMap
          canDrag={false}
          context={context}
          imagery={[context.institutionImagery[0]]}
        />
        <div className="row" style={{ borderBottom: "1px solid lightgray" }}>
          <div className="col-6 pt-3" style={{ borderRight: "1px solid lightgray" }}>
            <h3>Imagery Selection</h3>
            <ImageryReview />
          </div>
          <div className="col-6 pt-3">
            <h3>AOI Boundary</h3>
            <AOIReview />
          </div>
        </div>
        <div className="row">
          <div className="col-6 pt-3" style={{ borderRight: "1px solid lightgray" }}>
            <h3>Plot Design</h3>
            <PlotReview />
          </div>
          <div className="col-6 pt-3">
            <h3>Sample Design</h3>
            <SampleReview />
          </div>
        </div>
        {context.designSettings?.userAssignment?.userMethod !== "none" && (
          <div className="row" style={{ borderTop: "1px solid lightgray" }}>
            <div className="col-6 pt-3" style={{ borderRight: "1px solid lightgray" }}>
              <h3>User Assignment</h3>
              <UserAssignmentReview
                designSettings={context.designSettings}
                institutionUserList={context.institutionUserList}
              />
            </div>
            <div className="col-6 pt-3">
              <h3>Quality Control</h3>
              <QAQCReview
                designSettings={context.designSettings}
                institutionUserList={context.institutionUserList}
              />
            </div>
          </div>
        )}
      </div>
      <div id="survey-review">
        {renderSectionHeader(
          "Survey Questions",
          "questions",
          !["closed", "archived"].includes(context.availability)
        )}
        <SurveyCardList editMode="review" />
      </div>
      <div id="survey-rules-review">
        {renderSectionHeader("Survey Rules", "rules", context.availability === "unpublished")}
        <SurveyRulesList inDesignMode={false} />
      </div>
    </div>
  );
}
