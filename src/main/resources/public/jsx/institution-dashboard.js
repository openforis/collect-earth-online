import React from 'react';
import ReactDOM from 'react-dom';

class InstitutionDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectList: []
        };
    };

    componentDidMount() {
        this.getProjectList();
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

    render() {
        this.state.projectList.length > 0 && this.state.projectList.map(project => {
            return (
                <span>hello</span>
            );
        });
    }
}

export function renderInstitutionDashboardPage(args) {
    ReactDOM.render(
        <InstitutionDashboard documentRoot={args.documentRoot} userId={args.userId} institutionId={args.institutionId}/>,
        document.getElementById("institution_dashboard")
    );
}
