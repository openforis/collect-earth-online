import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

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
                        ? (Object.keys(user.answers).map(a => (
                            <li key={a}>
                                {`${this.findByKey(answers, "id", parseInt(a))?.answer} - ${user.answers[a]}`}
                            </li>
                        ))) : (
                            "This user did not answer"
                        )}
                </ul>
            </div>
        );
    };

    renderQuestion = thisQuestion => {
        const {question, answers, disagreement, answerFrequencies} = thisQuestion;
        return (
            <div
                key={question}
                style={{
                    border: "1px solid rgba(0, 0, 0, 0.2)",
                    borderRadius: "6px",
                    boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.2)",
                    margin: ".5rem",
                    overflow: "hidden"
                }}
            >
                <div
                    className="bg-lightgreen"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "1rem"
                    }}
                >
                    <h3 style={{margin: 0}}>{question}</h3>
                    <h3 style={{margin: 0}}>{disagreement < 0 ? "N\\A" : disagreement + "%"}</h3>
                </div>
                <div style={{display: "flex"}}>
                    {answerFrequencies.map(as => this.renderUser(as, answers))}
                </div>
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
                visibleId={args.visibleId}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
