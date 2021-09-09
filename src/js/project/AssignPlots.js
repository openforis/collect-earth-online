import React from "react";

import {ProjectContext} from "./constants";
import {Select} from "../components/Select";

export default class AssignPlots extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedUser: null
        };
    }

    getUserAssignment = () => this.context.designSettings["user-assignment"];

    setUserAssignment = newUserAssignment => {
        const {"user-assignment": userAssignment} = this.context.designSettings;
        this.context.setProjectDetails({
            designSettings: {...this.context.designSettings, "user-assignment": Object.assign(userAssignment, newUserAssignment)}
        });
    };

    setMethod = method => this.setUserAssignment({"user-method": method});

    addUser = user => {
        const {users, percents} = this.getUserAssignment();
        const newUsers = [...users, user[0]];
        const newPercents = [...percents, 0];
        this.setUserAssignment({users: newUsers, percents: newPercents});
    };

    removeUser = user => {
        const {users, percents} = this.getUserAssignment();
        const idx = users.indexOf(user);
        users.splice(idx);
        percents.splice(idx);
        this.setUserAssignment({
            users,
            percents
        });
    };

    assignPlotPercent = (user, percent) => {
        const {users, percents} = this.getUserAssignment();
        percents[users.indexOf(user)] = percent;
        this.setUserAssignment({percents});
    };

    renderUsers = (users, isPercentage, percents) => (
        <div className="d-flex flex-column mt-3">
            {users.map((user, idx) => (
                <div key={user.id} className="d-flex justify-content-end">
                    {isPercentage && (
                        <div className="mr-5">
                            <input
                                className="form-control form-control-sm"
                                max="100"
                                min="0"
                                onChange={e => this.assignPlotPercent(user.id, parseInt(e.target.value))}
                                placeholder="%"
                                style={{display: "inline-block", width: "3.5rem"}}
                                type="number"
                                value={percents[idx]}
                            />
                            &#37;
                        </div>
                    )}
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
            ))}
        </div>
    );

    render() {
        const methods = [
            ["none", "No assignments"],
            ["equal", "Equal assignments"],
            ["percent", "Percentage of plots"]
        ];
        const {"user-method": userMethod, users, percents} = this.getUserAssignment();
        const {allUsers} = this.props;
        const possibleUsers = Object.keys(allUsers).map(id => [parseInt(id), allUsers[id]]);
        const assignedUsers = users.map(id => ({id, email: allUsers[id]}));
        const assignableUsers = possibleUsers.filter(u => !users.includes(u[0]));

        return (
            <div className="mr-3" style={{maxWidth: "50%"}}>
                <h3 className="mb-3">Assign Plots</h3>
                <div className="d-flex">
                    <Select
                        id="user-assignment"
                        label="User Assignment"
                        onChange={e => this.setMethod(e.target.value)}
                        options={methods}
                        value={userMethod || "none"}
                    />
                </div>
                {userMethod !== "none" && (
                    <div className="mt-3">
                        <div className="d-flex">
                            <Select
                                disabled={assignableUsers.length === 0}
                                id="assigned-users"
                                label="Assigned Users"
                                onChange={e => this.setState({selectedUser: e.target.value})}
                                options={assignableUsers.length ? assignableUsers : ["No Users to Assign"]}
                            />
                            <button
                                className="btn btn-sm btn-success mx-2"
                                disabled={assignableUsers.length === 0}
                                onClick={() => this.addUser(this.state.selectedUser || assignableUsers[0])}
                                title="Add User"
                                type="button"
                            >
                                +
                            </button>
                        </div>
                        {this.renderUsers(assignedUsers, userMethod === "percent", percents)}
                    </div>
                )}
            </div>
        );
    }
}

AssignPlots.contextType = ProjectContext;
