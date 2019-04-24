import React from 'react';
import ReactDOM from 'react-dom';

class InstitutionDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            details: []
        };
    };

    componentDidMount() {
        this.getProjectList();
    };

    getProjectList = () => {
        fetch(this.props.documentRoot + "/get-all-projects?userId="
            + this.props.userId + "&institutionId=" + this.props.institutionId
        )
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setDetails(data);
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    setDetails = (projects) => {
        const details = this.state.details;
        projects.map(proj => {
            fetch(this.props.documentRoot + "/get-project-stats/" + proj.id)
                .then(response => {
                    if (response.ok) {
                        return response.json()
                    } else {
                        console.log(response);
                        alert("Error retrieving project stats. See console for details.");
                    }
                })
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
                    this.setState({details: details});
                });
        });
    };

    render() {
        return (
            <div>
                <table id="srd" style={{width: "1000px", margin: "10px", color: "rgb(49, 186, 176)"}}>
                    <tbody>
                    <tr>
                        <td>
                            <h2>Project Name</h2>
                        </td>
                        <td>
                            <h2>Project Stats</h2>
                        </td>
                    </tr>
                    <Project details={this.state.details}/>
                    </tbody>
                </table>
            </div>
        );
    }
}

function Project(props) {
    return props.details.map((project, uid) =>
        <tr key={uid}>
            <td>
                {project.name}
            </td>
            <td>
                <div id="project-stats" className="header">
                    <div className="col">
                        <table className="table table-sm">
                            <tbody>
                            <tr>
                                <td>Members</td>
                                <td>{project.members}</td>
                            </tr>
                            <tr>
                                <td>Contributors</td>
                                <td>{project.contributors}</td>
                            </tr>
                            <tr>
                                <td>Total Plots</td>
                                <td>{project.numPlots}</td>
                            </tr>
                            <tr>
                                <td>Flagged Plots</td>
                                <td>{project.flaggedPlots}</td>
                            </tr>
                            <tr>
                                <td>Analyzed Plots</td>
                                <td>{project.analyzedPlots}</td>
                            </tr>
                            <tr>
                                <td>Unanalyzed Plots</td>
                                <td>{project.unanalyzedPlots}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </td>
        </tr>
    );
}

export function renderInstitutionDashboardPage(args) {
    ReactDOM.render(
        <InstitutionDashboard documentRoot={args.documentRoot} userId={args.userId}
                              institutionId={args.institutionId}/>,
        document.getElementById("institution_dashboard")
    );
}
