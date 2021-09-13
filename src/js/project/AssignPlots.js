import React from "react";

import {ProjectContext} from "./constants";
import {Select} from "../components/Select";
import {removeAtIndex} from "../utils/generalUtils";

export default class AssignPlots extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedUserIdId: -1
        };
    }

    getUserAssignment = () => this.context.designSettings.userAssignment;

    setUserAssignment = newUserAssignment => {
        const userAssignment = this.getUserAssignment();
        this.context.setProjectDetails({
            designSettings: {
                ...this.context.designSettings,
                userAssignment: {...userAssignment, ...newUserAssignment}
            }
        });
    };

    setMethod = userMethod => this.setUserAssignment({userMethod});

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

    renderAssignedUsers = (users, isPercentage, percents) => (
        <div className="d-flex flex-column mt-3">
            {users.map((user, userIndex) => (
                <div key={user.id} className="d-flex justify-content-between mt-1">
                    <div className="mr-5">
                        {isPercentage && (
                            <>
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
                            </>
                        )}
                    </div>
                    <div className="d-flex">
                        <div
                            style={{
                                background: "white",
                                border: "1px solid #ced4da",
                                borderRadius: ".25rem",
                                fontSize: ".875rem",
                                padding: ".25rem .5rem"
                            }}
                        >
                            {user.email}
                        </div>
                        <button
                            className="btn btn-sm btn-danger mx-2"
                            onClick={() => this.removeUser(user.id)}
                            title={`Remove ${user.email}`}
                            type="button"
                        >
                            -
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    render() {
        const methods = [
            ["none", "No assignments"],
            ["equal", "Equal assignments"],
            ["percent", "Percentage of plots"]
        ];
        const {selectedUserId} = this.state;
        // allUsers is a positional array of [id, email]
        const {allUsers} = this.props;
        const {userMethod, users, percents} = this.getUserAssignment();
        const possibleUsers = [[-1, "Select user..."],
                               ...Object.keys(allUsers)
                                   .map(id => [parseInt(id), allUsers[id]])
                                   .filter(u => !users.includes(u[0]))]; // Comparing user ids
        const assignedUsers = users.map(id => ({id, email: allUsers[id]}));

        return (
            <div className="mr-3" style={{maxWidth: "50%"}}>
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
                                onChange={e => this.setState({selectedUserId: parseInt(e.target.value)})}
                                options={possibleUsers.length > 1 ? possibleUsers : ["No users to assign."]}
                                value={this.state.selectedUserId}
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
                        {this.renderAssignedUsers(assignedUsers, userMethod === "percent", percents)}
                    </div>
                )}
            </div>
        );
    }
}

AssignPlots.contextType = ProjectContext;
