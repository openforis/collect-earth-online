import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

class UserDisagreement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            questions: []
        };
    }

    componentDidMount() {
        this.getProjectQuestions();
    }

    getProjectQuestions = () => {
        const {plotId, projectId} = this.props;
        return fetch(`/get-plot-disagreement?projectId=${projectId}&plotId=${plotId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(questions => {
                this.setState({questions});
            });
    };

    render() {
        const {questions} = this.state;
        const {visibleId, plotId, projectId} = this.props;
        return (
            <div style={{display: "flex", flexDirection: "column", margin: "5rem"}}>
                <p>This page is under construction.</p>
                <p>Project check: {projectId}</p>
                <p>Plot check: {plotId}</p>
                <p>Visible plot check: {visibleId}</p>
                <p>API Check: {JSON.stringify(questions)}</p>
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
