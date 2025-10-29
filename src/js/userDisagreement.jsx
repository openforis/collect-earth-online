import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import { CollapsibleSectionBlock } from "./components/FormComponents";
import { lengthObject, mapObjectArray } from "./utils/sequence";

class UserDisagreement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      surveyQuestions: [],
      plotters: [],
    };
  }

  componentDidMount() {
    Promise.all([this.getProjectQuestions(), this.getPlotters()]).catch((error) =>
      console.error(error)
    );
  }

  getProjectQuestions = () => {
    const { plotId, projectId } = this.props;
    return fetch(`/get-plot-disagreement?projectId=${projectId}&plotId=${plotId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((surveyQuestions) => {
        this.setState({ surveyQuestions });
        return Promise.resolve("resolved");
      });
  };

  getPlotters = () => {
    const { plotId, projectId } = this.props;
    return fetch(`/get-plotters?projectId=${projectId}&plotId=${plotId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((plotters) => {
        this.setState({ plotters });
        return Promise.resolve("resolved");
      });
  };

  findByKey = (array, keyId, matchVal) => array.find((e) => e[keyId] === matchVal);

  renderAnswers = (userAnswers, answers) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {mapObjectArray(userAnswers, ([uaId]) => {
        const { answer, color } = answers[uaId];
        return (
          <div key={uaId} className="d-flex">
            <div
              className="circle mt-1 mr-3"
              style={{ backgroundColor: color, border: "solid 1px" }}
            />
            {`${answer} - ${userAnswers[uaId]}`}
          </div>
        );
      })}
    </div>
  );

  renderUser = (user, userPlotInfo, answers) => {
    const plotInfo = this.findByKey(userPlotInfo, "userId", user.userId);
    const unanswered = !plotInfo
      ? "plot"
      : lengthObject(plotInfo?.answers || {}) === 0
      ? "question"
      : null;
    return (
      <div
        key={user.userId}
        style={{
          border: "1px solid rgba(0, 0, 0, 0.2)",
          borderRadius: "6px",
          boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          padding: ".25rem",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", width: "100%", padding: ".5rem" }}>
          {/* TODO, dynamically size this based on the longest email */}
          <span style={{ width: "40%" }}>{user.email}</span>
          {plotInfo?.flagged
            ? "This user flagged the plot"
            : unanswered
            ? "This user did not answer this " + unanswered
            : this.renderAnswers(plotInfo.answers, answers)}
        </div>
        {plotInfo?.confidence && !unanswered && <div>Confidence: {plotInfo.confidence}</div>}
      </div>
    );
  };

  renderQuestion = (thisQuestion, surveyQuestions, level) => {
    const { plotters } = this.state;
    const { threshold } = this.props;
    const { questionId, question, answers, disagreement, userPlotInfo } = thisQuestion;
    const children = surveyQuestions.filter((q) => q.parentQuestionId === questionId);
    return (
      <>
        <CollapsibleSectionBlock
          showContent={disagreement >= threshold}
          title={`${disagreement < 0 ? "N/A" : disagreement.toFixed(1) + "%"} - ${question}`}
        >
          <div
            style={{
              background: "white",
              display: "flex",
              flexDirection: "column",
              gap: ".5rem",
              padding: "1rem",
            }}
          >
            {plotters.map((user) => this.renderUser(user, userPlotInfo, answers))}
          </div>
        </CollapsibleSectionBlock>
        {children.length > 0 &&
          children.map((cq) => this.renderQuestion(cq, surveyQuestions, level + 1))}
      </>
    );
  };

  render() {
    const { surveyQuestions } = this.state;
    const parentQuestions = surveyQuestions.filter((q) => q.parentQuestionId < 0);
    return (
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", margin: "1rem", width: "50%" }}>
          {parentQuestions.map((pq, idx) => (
            <div key={pq.questionId}>
              <h2 className="m-3">{`Survey Card Number ${idx + 1}`}</h2>
              <div
                style={{
                  border: "1px solid rgba(0, 0, 0, 0.2)",
                  borderRadius: "6px",
                  boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.2)",
                  overflow: "hidden",
                }}
              >
                {this.renderQuestion(pq, surveyQuestions, 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumb={{display: "User Disagreement",
                id:"user-disagreement",
                onClick:()=>{}}}
      />
      <UserDisagreement
        plotId={params.plotId}
        projectId={params.projectId}
        threshold={params.threshold}
        visibleId={params.visibleId}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}
