import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";
import {CollapsibleTitle} from "./components/FormComponents";

class UserDisagreement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            questions: [],
            plotters: [],
            showQuestions: {}
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
                this.setState({questions, showQuestions: Object.fromEntries(questions.map(q => [q.id, true]))});
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

    renderQuestion = thisQuestion => {
        const {id, question, answers, disagreement, answerFrequencies} = thisQuestion;
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
                <CollapsibleTitle
                    showGroup={this.state.showQuestions[id]}
                    title={`${question } - ${disagreement < 0 ? "N\\A" : disagreement + "%"}`}
                    toggleShow={() => {
                        const showQuestions = {...this.state.showQuestions};
                        showQuestions[id] = !showQuestions[id];
                        console.log(showQuestions);
                        this.setState({showQuestions});
                    }}
                />

                {this.state.showQuestions[id] && (
                    <div style={{display: "flex", flexWrap: "wrap", background: "white"}}>
                        {answerFrequencies.map(as => this.renderUser(as, answers))}
                    </div>
                )}
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
