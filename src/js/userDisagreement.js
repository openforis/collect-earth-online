import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
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

    renderQuestion = (thisQuestion, childrenQuestions, level) => {
        const {id, question, answers, disagreement, answerFrequencies} = thisQuestion;
        const children = childrenQuestions.filter(q => q.parentQuestion === id);
        const {threshold} = this.props;
        return (
            <div
                key={id}
                style={{
                    borderLeft: "1px solid rgba(0,0,0,0.2)",
                    borderRight: level === 0 ? "1px solid rgba(0,0,0,0.2)" : "",
                    borderBottom: level === 0 ? "1px solid rgba(0,0,0,0.2)" : "",
                    marginLeft: level > 0 ? "0.75rem" : "",
                    marginTop: level === 0 ? "1.5rem" : ""
                }}
            >
                <div
                    style={{overflow: "hidden"}}
                >
                    <CollapsibleSectionBlock
                        showContent={disagreement >= threshold}
                        title={`${question } - ${disagreement < 0 ? "N/A" : disagreement + "%"}`}
                    >
                        <div style={{display: "flex", flexWrap: "wrap", padding: "0 .5rem"}}>
                            {answerFrequencies.map(as => this.renderUser(as, answers))}
                        </div>
                    </CollapsibleSectionBlock>
                </div>
                {children.length > 0 && children.map(q => this.renderQuestion(q, childrenQuestions, level + 1))}
            </div>
        );
    };

    render() {
        const {questions} = this.state;
        const [topQuestions, childrenQuestions] = _.partition(questions, q => q.parentQuestion < 0);
        // this.sortQuestions(questions);
        return (
            <div style={{display: "flex", justifyContent: "center", width: "100%"}}>
                <div style={{display: "flex", flexDirection: "column", margin: "1rem", width: "50%"}}>
                    {topQuestions.map(q => this.renderQuestion(q, childrenQuestions, 0))}
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
