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
                .catch(response => {
                    console.error(response);
                    alert("Error retrieving the project list. See console for details.");
                })
        );
    }

    /// API Calls

    getProjectList = () =>
        fetch(`/get-institution-project-stats?institutionId=${this.props.institutionId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({projectList: data}));

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
                {projectList.length > 0 && (
                    <table id="srd" style={{width: "1000px", margin: "10px", color: "rgb(49, 186, 176)"}}>
                        <thead>
                            <tr style={{whiteSpace: "nowrap"}}>
                                <th className="pr-2">Project Id</th>
                                <th className="pr-2">Project Name</th>
                                <th className="pr-2">Contributors</th>
                                <th className="pr-2">Total Plots</th>
                                <th className="pr-2">Flagged Plots</th>
                                <th className="pr-2">Analyzed Plots</th>
                                <th className="pr-2">Unanalyzed Plots</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectList && projectList.map(project => (
                                <tr key={project.id}>
                                    <td>{project.id}</td>
                                    <td>{project.name}</td>
                                    <td style={{textAlign: "center"}}>{project.stats.contributors}</td>
                                    <td style={{textAlign: "center"}}>{project.numPlots}</td>
                                    <td style={{textAlign: "center"}}>{project.stats.flaggedPlots}</td>
                                    <td style={{textAlign: "center"}}>{project.stats.analyzedPlots}</td>
                                    <td style={{textAlign: "center"}}>{project.stats.unanalyzedPlots}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
