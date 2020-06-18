import React, { Fragment } from "react";
import ReactDOM from "react-dom";

import { FormLayout, SectionBlock, StatsCell, StatsRow } from "./components/FormComponents";

function Account(props) {
    return (
        <FormLayout title="Your account!" className="px-2 pb-2">
            <UserStats
                userId={props.userId}
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
        fetch(this.props.documentRoot + "/get-user-stats?userId=" + this.props.userId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(stats => this.setState({ stats: stats }))
            .catch(response => {
                console.log(response);
                alert("No user found with ID " + this.props.userName + ". See console for details.");
                window.location = this.props.documentRoot + "/home";
            });
    }

    render () {
        const { totalProjects, totalPlots, averageTime, perProject } = this.state.stats;
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
                                <StatsCell title="Average Analysis Duration">
                                    {averageTime} secs/plot
                                </StatsCell>
                                <StatsCell title="Average Plots per Project">
                                    {Number(((totalPlots / totalProjects)).toFixed(1)) || 0} plots
                                </StatsCell>
                            </div>
                        </div>
                    </div>

                    {perProject &&
                        <div className="ProjectStats__user-table">
                            <strong>User Stats:</strong>
                            {perProject.map((project, uid) => (
                                <StatsRow
                                    key={uid}
                                    title={`#${project.id} - ${project.name}`}
                                    plots={project.plotCount}
                                    analysisTime={project.analysisAverage}
                                />
                            ))}
                        </div>
                    }
                </div>
            </SectionBlock>
        );
    }
}

class AccountForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mailingListSubscription: false,
        };

    }

    componentDidMount() {
        this.getUserDetails();
    }

    getUserDetails = () => {
        fetch(this.props.documentRoot + "/get-user-details?userId=" + this.props.userId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(details => this.setState({ mailingListSubscription: details.mailingListSubscription }))
            .catch(response => {
                console.log(response);
                alert("No user found with ID " + this.props.userName + ". See console for details.");
                window.location = this.props.documentRoot + "/home";
            });
    };

    toggleMailingListSubsciprion = () => this.setState({ mailingListSubscription: !this.state.mailingListSubscription });

    render() {
        return (
            <SectionBlock title="Account Settings">
                {this.props.userId === this.props.accountId ?
                    <Fragment>
                        <h1>{this.props.userName}</h1>
                        <form action={this.props.documentRoot + "/account"} method="post">
                            <div className="form-group">
                                <label htmlFor="email">Reset email</label>
                                <input
                                    autoComplete="off"
                                    id="email"
                                    name="email"
                                    placeholder="New email"
                                    defaultValue=""
                                    type="email"
                                    className="form-control"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Reset password</label>
                                <div className="form-row">
                                    <div className="col">
                                        <input
                                            autoComplete="off"
                                            id="password"
                                            name="password"
                                            placeholder="New password"
                                            defaultValue=""
                                            type="password"
                                            className="form-control mb-1"
                                        />
                                    </div>
                                    <div className="col">
                                        <input
                                            autoComplete="off"
                                            id="password-confirmation"
                                            name="password-confirmation"
                                            placeholder="New password confirmation"
                                            defaultValue=""
                                            type="password"
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-check mb-3">
                                <input
                                    name="mailing-list-subscription"
                                    id="mailing-list-subscription"
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={this.state.mailingListSubscription}
                                    onChange={this.toggleMailingListSubsciprion}
                                />
                                <label className="form-check-label" htmlFor="mailing-list-subscription">
                                    Mailing List Subscription
                                </label>
                            </div>
                            <div className="form-group">
                                <label htmlFor = "current-password">Verify your identity</label>
                                <input
                                    autoComplete=" off"
                                    id="current-password"
                                    name="current-password"
                                    placeholder="Current password"
                                    defaultValue=""
                                    type="password"
                                    className="form-control"
                                />
                            </div>
                            <input
                                className="btn btn-outline-lightgreen btn-block"
                                name="update-account"
                                defaultValue="Update account settings"
                                type="submit"
                            />
                        </form>
                    </Fragment>
                :
                    <h1>{this.props.userName}</h1>
                }
            </SectionBlock>
        );
    }
}

export function renderAccountPage(args) {
    ReactDOM.render(
        <Account documentRoot={args.documentRoot} userId={args.userId} accountId={args.accountId} userName={args.userName}/>,
        document.getElementById("account")
    );
}
