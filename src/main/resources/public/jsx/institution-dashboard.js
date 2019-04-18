import React from 'react';
import ReactDOM from 'react-dom';
import {convertSampleValuesToSurveyQuestions} from "./utils/surveyUtils";
class InstitutionDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectList: [],
            details:[]
        };
    };

    componentDidMount() {
        this.getProjectList();
        if (this.state.projectList.length>0) {
            this.setDetails();
        }
    }

    getProjectList = () => {
        //get projects
        fetch(this.props.documentRoot + "/get-all-projects?userId="
            + this.props.userId + "&institutionId=" + this.props.institutionId
        )
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ projectList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    }

    getProjectStats = (projectId) => {
        alert("hello");
        fetch(this.props.documentRoot + "/get-project-stats/" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving project stats. See console for details.");
                }
            })
            .then(data => {
                const details = this.state.details;
                let x = {id:projectId, stats: data};
                details.push({ id:projectId, stats: data});
                this.setState({ details: details });
            });
        alert("project stats");

    };

    getProjectById = (projectId) => {
        alert("hey");
        fetch(this.props.documentRoot + "/get-project-by-id/" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                if (data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.props.documentRoot + "/home";
                } else {
                    const details = this.state.details;
                    details.push({ id:projectId, numPlots:data.numPlots});
                    this.setState({details: details});
                }
            });
        alert(this.state.details);

    };

    setDetails = () => {
        let details = this.state.details;

        this.state.projectList.map( proj => {
            let x = {id:proj.id,projectDetails: {},stats:[]};
            fetch(this.props.documentRoot + "/get-project-by-id/" + proj.id)
                .then(response => {
                    if (response.ok) {
                        return response.json()
                    } else {
                        console.log(response);
                        alert("Error retrieving the project info. See console for details.");
                    }
                })
                .then(data => {
                    if (data == "") {
                        alert("No project found with ID " + proj.id + ".");
                        window.location = this.props.documentRoot + "/home";
                    } else {
                        x.projectDetails = data;
                    }
                });
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
                    x.stats = data;
                });
            details.push(x);
        });
        this.setState({details: details});

    };

    render() {
        return (
            <div>
                <table id="srd">
                    <tbody>
                    <tr>
                        <td>
                            <h2>Project Name</h2>
                        </td>
                        <td>
                            <h2>Project Stats</h2>
                        </td>
                    </tr>
                        <Project projects={this.state.projectList} details={this.state.details}/>
                    </tbody>
                </table>
            </div>
        );
    }
}

function Project(props) {
    return props.projects.map((p, uid) =>
        <tr key={uid}>
            <td>{p.name}</td>
            <td>
                <ProjectStats details={props.details}/>
            </td>
        </tr>
    );
}

function ProjectStats(props) {
    return (
        <div id="project-stats" className="header">
            <div className="col">
                <table className="table table-sm">
                    <tbody>
                    <tr>
                        <td>Members</td>
                        <td>{props.details.stats? props.details.stats.members:""}</td>
                    </tr>
                    <tr>
                        <td>Contributors</td>
                        <td>{props.details.stats? props.details.stats.contributors:""}</td>
                    </tr>
                    <tr>
                        <td>Total Plots</td>
                        <td>{props.details.stats? props.details.projectDetails.numPlots:""}</td>
                    </tr>
                    <tr>
                        <td>Flagged Plots</td>
                        <td>{props.details.stats? props.details.stats.flaggedPlots:""}</td>
                    </tr>
                    <tr>
                        <td>Analyzed Plots</td>
                        <td>{props.details.stats? props.details.stats.analyzedPlots:""}</td>
                    </tr>
                    <tr>
                        <td>Unanalyzed Plots</td>
                        <td>{props.details.stats? props.details.stats.unanalyzedPlots:""}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}


export function renderInstitutionDashboardPage(args) {
    ReactDOM.render(
        <InstitutionDashboard documentRoot={args.documentRoot} userId={args.userId} institutionId={args.institutionId}/>,
        document.getElementById("institution_dashboard")
    );
}
