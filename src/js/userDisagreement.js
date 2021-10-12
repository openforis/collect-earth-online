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

    renderUser = (user, answers) => {
        const {plotters} = this.state;
        return (
            <div
                key={user.userId}
                style={{
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    borderRadius: "6px",
                    boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    margin: ".5rem",
                    padding: ".5rem"
                }}
            >
                <label>{this.findByKey(plotters, "userId", user.userId)?.email}</label>
                <ul>
                    {Object.keys(user.answers).length > 0
                        ? (Object.keys(user.answers).map(a => {
                            const answer = this.findByKey(answers, "id", parseInt(a));
                            return (
                                <div key={a} className="d-flex">
                                    <div
                                        className="circle mt-1 mr-3"
                                        style={{backgroundColor: answer?.color, border: "solid 1px"}}
                                    />
                                    {`${answer?.answer} - ${user.answers[a]}`}
                                </div>
                            );
                        })) : (
                            "This user did not answer"
                        )}
                </ul>
            </div>
        );
    };

    renderQuestion = (thisQuestion, questions, level) => {
        const {id, question, answers, disagreement, answerFrequencies} = thisQuestion;
        const children = questions.filter(q => q.parentQuestion === id);
        const {threshold} = this.props;

        return (
            <>
                <CollapsibleSectionBlock
                    showContent={disagreement >= threshold}
                    title={`${disagreement < 0 ? "N/A" : disagreement + "%"} - ${question}`}
                >
                    <div style={{display: "flex", flexWrap: "wrap", padding: "0 .5rem"}}>
                        {answerFrequencies.map(as => this.renderUser(as, answers))}
                    </div>
                </CollapsibleSectionBlock>
                {children.length > 0 && children.map(q => this.renderQuestion(q, questions, level + 1))}
            </>
        );
    };

    render() {
        const {questions} = this.state;
        const parentQuestions = questions.filter(q => q.parentQuestion < 0);
        return (
            <div style={{display: "flex", justifyContent: "center", width: "100%"}}>
                <div style={{display: "flex", flexDirection: "column", margin: "1rem", width: "50%"}}>
                    {parentQuestions.map((q, idx) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <div key={idx}>
                            <h2 className="m-3">{`Survey Card Number ${idx + 1}`}</h2>
                            <div
                                style={{
                                    border: "1px solid rgba(0, 0, 0, 0.2)",
                                    borderRadius: "6px",
                                    boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.2)",
                                    overflow: "hidden"
                                }}
                            >
                                {this.renderQuestion(q, questions, 0)}
                            </div>
                        </div>
                    ))}
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
