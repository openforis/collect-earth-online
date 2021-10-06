import React from "react";
import ReactDOM from "react-dom";
import {LoadingModal, NavigationBar} from "./components/PageComponents";

class InstitutionDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectList: [],
            modalMessage: null
        };
    }

    /// Lifecycle

    componentDidMount() {
        this.processModal(
            "Loading project list",
            this.getProjectList()
                .then(projectList => this.setState({projectList}))
                .catch(response => {
                    console.error(response);
                    alert("Error retrieving the project list. See console for details.");
                })
        );
    }

    /// API Calls

    // TODO, These should probably be 1 API call on the backend to reduce the number of connections
    getProjectList = () => fetch(`/get-institution-projects?institutionId=${this.props.institutionId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => this.getProjectDetails(data));

    getProjectDetails = projects => Promise.all(projects.map(proj => fetch(`/get-project-stats?projectId=${proj.id}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => ({
            id: proj.id,
            name: proj.name,
            numPlots: proj.numPlots,
            unanalyzedPlots: data.unanalyzedPlots,
            analyzedPlots: data.analyzedPlots,
            flaggedPlots: data.flaggedPlots,
            contributors: data.contributors,
            members: data.members
        }))));

    /// Helpers

    processModal = (message, promise) => this.setState(
        {modalMessage: message},
        () => promise.finally(() => this.setState({modalMessage: null}))
    );

    render() {
        const {projectList} = this.state;
        return (
            <div className="row justify-content-center" id="institution-dashboard">
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
                <div
                    className="bg-darkgreen mb-3 no-container-margin"
                    style={{width: "100%", margin: "0 10px 0 10px"}}
                >
                    <h1>Institution Dashboard</h1>
                </div>
                <table id="srd" style={{width: "1000px", margin: "10px", color: "rgb(49, 186, 176)"}}>
                    <thead>
                        <tr>
                            <th>Project Id</th>
                            <th>Project Name</th>
                            <th>Contributors</th>
                            <th>Total Plots</th>
                            <th>Flagged Plots</th>
                            <th>Analyzed Plots</th>
                            <th>Unanalyzed Plots</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectList.map(project => (
                            <tr key={project.id}>
                                <td>{project.id}</td>
                                <td>{project.name}</td>
                                <td>{project.contributors}</td>
                                <td>{project.numPlots}</td>
                                <td>{project.flaggedPlots}</td>
                                <td>{project.analyzedPlots}</td>
                                <td>{project.unanalyzedPlots}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
            <InstitutionDashboard
                institutionId={args.institutionId || "0"}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
