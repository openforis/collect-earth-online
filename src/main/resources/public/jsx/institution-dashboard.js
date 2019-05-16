import React from 'react';
import ReactDOM from 'react-dom';

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
        fetch(this.props.documentRoot + "/get-all-projects?userId="
            + this.props.userId + "&institutionId=" + this.props.institutionId)
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
        let details = this.state.details;
        projects.forEach(proj => {
            fetch(this.props.documentRoot + "/get-project-stats/" + proj.id)
                .then(response => response.ok ? response.json() : Promise.reject(response))
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
                })
                .catch(response => {
                    console.log(response);
                    alert("Error retrieving the project stats. See console for details.");
                });
        });
    };

    render() {
        return (
            <React.Fragment>
                <div className="bg-darkgreen mb-3 no-container-margin" style={{width: "100%", margin: "0 10px 0 10px"}}>
                    <h1>Institution Dashboard</h1>
                </div>
                <table id="srd" style={{width: "1000px", margin: "10px", color: "rgb(49, 186, 176)"}}>
                    <thead>
                    <tr>
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
            </React.Fragment>
        );
    }
}

function ProjectList(props) {
    return props.details.map((project, uid) =>
        <tr key={uid}>
            <td>{project.name}</td>
            <td>{project.members}</td>
            <td>{project.contributors}</td>
            <td>{project.numPlots}</td>
            <td>{project.flaggedPlots}</td>
            <td>{project.analyzedPlots}</td>
            <td>{project.unanalyzedPlots}</td>
        </tr>
    );
}

export function renderInstitutionDashboardPage(args) {
    ReactDOM.render(
        <InstitutionDashboard documentRoot={args.documentRoot} userId={args.userId}
                              institutionId={args.institutionId}/>,
        document.getElementById("institution-dashboard")
    );
}
