import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";

function Account(props) {
    return (
        <FormLayout title="Your account!" className="px-2 pb-2">
            <UserStats 
                documentRoot={props.documentRoot}
                userName={props.userName}
            />
            <AccountForm 
                documentRoot={props.documentRoot} 
                userId={props.userId}
                accountId={props.accountId} 
                userName={props.userName}
            />
        </FormLayout>
    );
}

class UserStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {},
        };
        this.getUserStats = this.getUserStats.bind(this);

    }
    componentDidMount() {
        this.getUserStats();
    }

    getUserStats() {
        fetch(this.props.documentRoot + "/get-user-stats/" + this.props.userName)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the user stat info. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(stats => {
                if (stats == null) {
                    alert("No user found with ID " + this.props.userName + ".");
                    window.location = this.props.documentRoot + "/home";
                } else {
                    this.setState({stats: stats});
                }
            });
    }
    render () {
        let { totalProjects, totalPlots, averageTime, perProject } = this.state.stats;
        return (
            <SectionBlock title="User Stats">
            
                <div id="user-stats-table" className="table table-sm">

                <div className="ProjectStats__plots-table mb-2">
                        <strong>Project Total Stats:</strong>
                        <div className="row pl-2">
                            <div className="col-6">
                                <StatsCell title="Projects Worked">{totalProjects} projects</StatsCell>
                                <StatsCell title="Plots Completed">{totalPlots} plots</StatsCell>
                            </div>
                            <div className="col-6">
                                <StatsCell title="Average Analysis Duration">{averageTime} secs/plot</StatsCell>
                                <StatsCell title="Average Plots per Project">{Number(((totalPlots / totalProjects)).toFixed(1)) || 0} plots</StatsCell>
                            </div>
                        </div>
                    </div>

                {perProject &&
                    <div className="ProjectStats__user-table">
                        <strong>User Stats:</strong>
                        {perProject.map((project, uid) => {
                            return (
                            <StatsRow
                                key={uid}
                                title={`#${project.id} - ${project.name}`}
                                plots={project.plotCount}
                                analysisTime={project.analysisAverage}
                                wide
                            />);
                        })}
                    </div>
                }
            </div>
        </SectionBlock>
        )
    }
}

function AccountForm(props) {
    return (
        <SectionBlock title="Account Settings">
            {props.userId == props.accountId ?
                <Fragment>
                    <h1>{props.userName}</h1>
                    <form action={props.documentRoot + "/account/" + props.accountId} method="post">
                        <div className="form-group">
                            <label htmlFor="email">Reset email</label>
                            <input autoComplete="off" id="email" name="email" placeholder="New email" defaultValue=""
                                    type="email"
                                    className="form-control"/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Reset password</label>
                            <div className="form-row">
                                <div className="col">
                                    <input autoComplete="off" id="password" name="password" placeholder="New password"
                                            defaultValue=""
                                            type="password" className="form-control mb-1"/>
                                </div>
                                <div className="col">
                                    <input autoComplete="off" id="password-confirmation" name="password-confirmation"
                                            placeholder="New password confirmation" defaultValue="" type="password"
                                            className="form-control"/>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor = "current-password">Verify your identity</label>
                            <input autoComplete=" off" id="current-password" name="current-password"
                                    placeholder="Current password" defaultValue="" type="password" className="form-control"/>
                        </div>
                        <input className="btn btn-outline-lightgreen btn-block" name="update-account"
                                defaultValue="Update account settings" type="submit"/>
                    </form>
                </Fragment>
        : 
            <h1>{props.userName}</h1>
        }
        </SectionBlock>
    );
}

export function renderAccountPage(args) {
    ReactDOM.render(
        <Account documentRoot={args.documentRoot} userId={args.userId} accountId={args.accountId} userName={args.userName}/>,
        document.getElementById("account")
    );
}
