import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";
import {CollapsibleSectionBlock} from "./components/FormComponents";

class UserDisagreement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            questions: [],
            plotters: []
        };
    }

    componentDidMount() {
        Promise.all([this.getProjectQuestions(), this.getPlotters()])
            .catch(error => console.error(error));
    }

    getProjectQuestions = () => {
        const {plotId, projectId} = this.props;
        return fetch(`/get-plot-disagreement?projectId=${projectId}&plotId=${plotId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(questions => {
                this.setState({questions});
                return Promise.resolve("resolved");
            });
    };

    getPlotters = () => {
        const {plotId, projectId} = this.props;
        return fetch(`/get-plotters?projectId=${projectId}&plotId=${plotId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(plotters => {
                this.setState({plotters});
                return Promise.resolve("resolved");
            });
    };

    findByKey = (array, keyId, matchVal) => array.find(e => e[keyId] === matchVal);

    renderAnswers = (userAnswers, answers) => (
        <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
            {Object.keys(userAnswers).map(a => {
                const answer = this.findByKey(answers, "id", parseInt(a));
                return (
                    <div key={a} className="d-flex">
                        <div
                            className="circle mt-1 mr-3"
                            style={{backgroundColor: answer?.color, border: "solid 1px"}}
                        />
                        {`${answer?.answer} - ${userAnswers[a]}`}
                    </div>
                );
            })}
        </div>
    );

    renderUser = (user, userPlotInfo, answers) => {
        const plotInfo = this.findByKey(userPlotInfo, "userId", user.userId);
        const answered = Object.keys(plotInfo?.answers || {}).length > 0;
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
                    alignItems: "center"
                }}
            >
                <div style={{display: "flex", alignItems: "center", width: "100%", padding: ".5rem"}}>
                    {/* TODO, dynamically size this based on the longest email */}
                    <span style={{width: "40%"}}>{user.email}</span>
                    {plotInfo?.flagged
                        ? (
                            "This user flagged the plot"
                        ) : answered
                            ? (this.renderAnswers(plotInfo.answers, answers)) : (
                                "This user did not answer"
                            )}
                </div>
                {plotInfo?.confidence && answered && (
                    <div>Confidence: {plotInfo.confidence}</div>
                )}
            </div>
        );
    };

    renderQuestion = thisQuestion => {
        const {plotters} = this.state;
        const {threshold} = this.props;
        const {question, answers, disagreement, userPlotInfo} = thisQuestion;
        return (
            <div
                key={question}
                style={{
                    border: "1px solid black",
                    margin: "0 .5rem",
                    background: "#31bab0",
                    overflow: "hidden"
                }}
            >
                <CollapsibleSectionBlock
                    showContent={disagreement >= threshold}
                    title={`${question } - ${disagreement < 0 ? "N/A" : disagreement + "%"}`}
                >
                    <div
                        style={{
                            background: "white",
                            display: "flex",
                            flexDirection: "column",
                            gap: ".5rem",
                            padding: "1rem"
                        }}
                    >
                        {plotters.map(user => this.renderUser(user, userPlotInfo, answers))}
                    </div>
                </CollapsibleSectionBlock>
            </div>
        );
    };

    render() {
        const {questions} = this.state;
        return (
            <div style={{display: "flex", justifyContent: "center", width: "100%"}}>
                <div style={{display: "flex", flexDirection: "column", margin: "1rem", width: "50%"}}>
                    {questions.map(q => this.renderQuestion(q))}
                </div>
            </div>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <UserDisagreement
                plotId={args.plotId}
                projectId={args.projectId}
                threshold={args.threshold}
                visibleId={args.visibleId}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
