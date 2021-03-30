import React, {Fragment} from "react";
import ReactDOM from "react-dom";

import {FormLayout, SectionBlock, StatsCell, StatsRow} from "./components/FormComponents";
import {NavigationBar} from "./components/PageComponents";
import {getQueryString} from "./utils/generalUtils";

function Account(props) {
    const sameAsUser = props.userId === props.accountId;
    return (
        <FormLayout title={sameAsUser ? "Your account" : "User " + props.accountId} className="px-2 pb-2">
            <UserStats
                accountId={props.accountId}
                userName={props.userName}
            />
            {sameAsUser &&
                <AccountForm
                    accountId={props.accountId}
                    userName={props.userName}
                />
            }
        </FormLayout>
    );
}

class UserStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {},
        };
    }

    componentDidMount() {
        this.getUserStats();
    }

    getUserStats = () => {
        fetch("/get-user-stats?accountId=" + this.props.accountId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(stats => this.setState({stats: stats}))
            .catch(response => {
                console.log(response);
                alert("No user found with ID " + this.props.accountId);
                window.location = "/home";
            });
    };

    render () {
        const {totalProjects, totalPlots, averageTime, perProject} = this.state.stats;
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
                                    {averageTime
                                        ? averageTime >= 60
                                            ? `${(averageTime / 60).toFixed(2)} mins/plot`
                                            : `${averageTime} secs/plot`
                                        : "loading..."
                                    }
                                </StatsCell>
                                <StatsCell title="Average Plots per Project">
                                    {Number((totalPlots / totalProjects).toFixed(1)) || 0} plots
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
                                    titleHref={`/collection?projectId=${project.id}`}
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
            email: "",
            password: "",
            passwordConfirmation: "",
            onMailingList: false,
            currentPassword: "",
        };
    }

    componentDidMount() {
        this.getUserDetails();
    }

    getUserDetails = () => {
        fetch("/get-user-details")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(details => this.setState({onMailingList: details.onMailingList}))
            .catch(response => console.log(response));
    };

    updateAccount = () => {
        fetch("/account",
              {
                  method: "POST",
                  headers: {"Content-Type": "application/x-www-form-urlencoded"},
                  body: getQueryString(this.state),
              })
            .then(response => Promise.all([response.ok, response.json()]))
            .then(data => {
                if (data[0] && data[1] === "") {
                    alert("Your account details have been updated.");
                    // userName comes from the session, so we need to reload to update the props.
                    window.location.reload();
                } else {
                    alert(data[1]);
                }
            })
            .catch(err => console.log(err));
    };

    render() {
        return (
            <SectionBlock title="Account Settings">
                <Fragment>
                    <h1>{this.props.userName}</h1>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            this.updateAccount();
                        }}
                    >
                        <div className="form-group">
                            <label htmlFor="email">Reset email</label>
                            <input
                                id="email"
                                className="form-control"
                                autoComplete="off"
                                placeholder="New email"
                                type="email"
                                value={this.state.email}
                                onChange={e => this.setState({email: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Reset password</label>
                            <div className="form-row">
                                <div className="col">
                                    <input
                                        id="password"
                                        className="form-control mb-1"
                                        autoComplete="off"
                                        placeholder="New password"
                                        type="password"
                                        value={this.state.password}
                                        onChange={e => this.setState({password: e.target.value})}
                                    />
                                </div>
                                <div className="col">
                                    <input
                                        id="password-confirmation"
                                        className="form-control"
                                        autoComplete="off"
                                        placeholder="New password confirmation"
                                        type="password"
                                        value={this.state.passwordConfirmation}
                                        onChange={e => this.setState({passwordConfirmation: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* <div className="form-check mb-3">
                            <input
                                id="on-mailing-list"
                                type="checkbox"
                                className="form-check-input"
                                checked={this.state.onMailingList}
                                onChange={() => this.setState({onMailingList: !this.state.onMailingList})}
                            />
                            <label className="form-check-label" htmlFor="on-mailing-list">
                                Subscribe to Mailing List
                            </label>
                        </div> */}
                        <div className="form-group">
                            <label htmlFor="current-password">Verify your identity</label>
                            <input
                                id="current-password"
                                className="form-control"
                                autoComplete=" off"
                                placeholder="Current password"
                                type="password"
                                value={this.state.currentPassword}
                                onChange={e => this.setState({currentPassword: e.target.value})}
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
            </SectionBlock>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Account
                userId={args.userId}
                accountId={parseInt(args.accountId || args.userId)}
                userName={args.userName}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
