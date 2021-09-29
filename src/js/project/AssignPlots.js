import React from "react";

import {ProjectContext} from "./constants";
import Select from "../components/Select";
import {formatNumberWithCommas, removeAtIndex} from "../utils/generalUtils";

export default class AssignPlots extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedUserId: -1
        };
    }

    getQaqcAssignment = () => this.context.designSettings.qaqcAssignment;

    getUserAssignment = () => this.context.designSettings.userAssignment;

    setUserAssignment = (newUserAssignment, newQaqcAssignment) => {
        const qaqcAssignment = this.getQaqcAssignment();
        const userAssignment = this.getUserAssignment();
        this.context.setProjectDetails({
            designSettings: {
                ...this.context.designSettings,
                qaqcAssignment: {...qaqcAssignment, ...newQaqcAssignment},
                userAssignment: {...userAssignment, ...newUserAssignment}
            }
        });
    };

    setMethod = newUserMethod => this.setUserAssignment(
        {userMethod: newUserMethod},
        newUserMethod === "none" ? {qaqcMethod: "none"} : null
    );

    resetSelectedUser = () => {
        this.setState({selectedUserId: -1});
    };

    addUser = userId => {
        const {users, percents} = this.getUserAssignment();
        const newUsers = [...users, userId];
        const newPercents = [...percents, 0];
        this.setUserAssignment({users: newUsers, percents: newPercents});
        this.resetSelectedUser();
    };

    removeUser = userId => {
        const {users, percents} = this.getUserAssignment();
        const idx = users.indexOf(userId);
        const newUsers = users.filter(u => u !== userId);
        this.setUserAssignment({
            users: newUsers,
            percents: removeAtIndex(percents, idx)
        });
        this.resetSelectedUser();
    };

    assignPlotPercent = (userIndex, percent) => {
        const {percents} = this.getUserAssignment();
        percents[userIndex] = percent;
        this.setUserAssignment({percents});
    };

    renderAssignedUsers = (assignedUsers, isPercentage, percents, totalPlots) => (
        <div className="d-flex flex-column mt-3">
            {assignedUsers.map(({id, email}, userIndex) => {
                const numPlots = Math.round((percents[userIndex] / 100) * totalPlots);
                return (
                    <div key={id} className="d-flex justify-content-between mt-1">
                        <div className="d-flex">
                            <button
                                className="btn btn-sm btn-danger mx-2"
                                onClick={() => this.removeUser(id)}
                                title={`Remove ${email}`}
                                type="button"
                            >
                                -
                            </button>
                            <div
                                style={{
                                    background: "white",
                                    border: "1px solid #ced4da",
                                    borderRadius: ".25rem",
                                    fontSize: ".875rem",
                                    padding: ".25rem .5rem"
                                }}
                            >
                                {email}
                            </div>
                        </div>
                        <div className="mr-5">
                            {isPercentage && (
                                <div className="d-flex justify-content-center align-items-center">
                                    <div className="font-italic mx-1 small">
                                        - ~{formatNumberWithCommas(numPlots)} plots
                                    </div>
                                    <div>
                                        <input
                                            className="form-control form-control-sm"
                                            max="100"
                                            min="0"
                                            onChange={e => this.assignPlotPercent(userIndex, parseInt(e.target.value))}
                                            placeholder="%"
                                            style={{display: "inline-block", width: "3.5rem"}}
                                            type="number"
                                            value={percents[userIndex]}
                                        />
                                        &#37;
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    render() {
        const methods = [
            ["none", "No assignments"],
            ["equal", "Equal assignments"],
            ["percent", "Percentage of plots"]
        ];
        const {selectedUserId} = this.state;
        const {institutionUserList, totalPlots} = this.props;
        const {userMethod, users, percents} = this.getUserAssignment();
        const possibleUsers = [
            {id: -1, email: "Select user..."},
            ...institutionUserList.filter(u => !users.includes(u.id))
        ];
        const assignedUsers = institutionUserList.filter(u => users.includes(u.id));
        const plotsPerUser = Math.round(totalPlots / users.length);

        return (
            <div className="col-6">
                <h3 className="mb-3">Assign Plots</h3>
                <div className="d-flex">
                    <Select
                        id="user-assignment"
                        label="User Assignment"
                        onChange={e => this.setMethod(e.target.value)}
                        options={methods}
                        value={userMethod}
                    />
                </div>
                {userMethod !== "none" && (
                    <div className="mt-3">
                        <div className="d-flex">
                            <Select
                                disabled={possibleUsers.length === 1}
                                id="assigned-users"
                                label="Assigned Users"
                                labelKey="email"
                                onChange={e => this.setState({selectedUserId: parseInt(e.target.value)})}
                                options={possibleUsers.length > 1 ? possibleUsers : ["No users to assign."]}
                                value={this.state.selectedUserId}
                                valueKey="id"
                            />
                            <button
                                className="btn btn-sm btn-success mx-2"
                                disabled={possibleUsers.length === 1 || selectedUserId === -1}
                                onClick={() => this.addUser(selectedUserId)}
                                title="Add User"
                                type="button"
                            >
                                +
                            </button>
                        </div>
                        {this.renderAssignedUsers(assignedUsers, userMethod === "percent", percents, totalPlots)}
                        {userMethod === "equal" && (
                            <p className="font-italic mt-2 small">
                                - Each user will be assigned ~{formatNumberWithCommas(plotsPerUser)} plots
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
}

AssignPlots.contextType = ProjectContext;
