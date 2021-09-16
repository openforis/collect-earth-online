import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

class InstitutionDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            details: []
        };
    }

    componentDidMount() {
        this.getProjectList();
    }

    getProjectList = () => {
        fetch(`/get-institution-projects?institutionId=${this.props.institutionId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.setDetails(data);
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    setDetails = projects => {
        const {details} = this.state;
        projects.forEach(proj => {
            fetch(`/get-project-stats?projectId=${proj.id}`)
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(data => {
                    details.push({
                        id: proj.id,
                        name: proj.name,
                        numPlots: proj.numPlots,
                        unanalyzedPlots: data.unanalyzedPlots,
                        analyzedPlots: data.analyzedPlots,
                        flaggedPlots: data.flaggedPlots,
                        contributors: data.contributors,
                        members: data.members
                    });
                    this.setState({details});
                })
                .catch(response => {
                    console.log(response);
                    alert("Error retrieving the project stats. See console for details.");
                });
        });
    };

    render() {
        return (
            <div className="row justify-content-center">
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
                            <th>Members</th>
                            <th>Contributors</th>
                            <th>Total Plots</th>
                            <th>Flagged Plots</th>
                            <th>Analyzed Plots</th>
                            <th>Unanalyzed Plots</th>
                        </tr>
                    </thead>
                    <tbody>
                        <ProjectList details={this.state.details}/>
                    </tbody>
                </table>
            </div>
        );
    }
}

function ProjectList(props) {
    return props.details.map(project => (
        <tr key={project.id}>
            <td>{project.id}</td>
            <td>{project.name}</td>
            <td>{project.members}</td>
            <td>{project.contributors}</td>
            <td>{project.numPlots}</td>
            <td>{project.flaggedPlots}</td>
            <td>{project.analyzedPlots}</td>
            <td>{project.unanalyzedPlots}</td>
        </tr>
    ));
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
