import React from "react";

import {ProjectContext} from "./constants";
import {Select} from "../components/Select";

export default class AssignPlots extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selectedUser:  null};
    }

    UNSAFE_componentWillReceiveProps(props) {
        const {allUsers} = props;

        if (allUsers.length > 0) {
            this.setState({selectedUser: allUsers[0]});
        }
    }

    setUserAssignment = userAssignment =>
        this.context.setProjectDetails({designSettings: {...this.context.designSettings, userAssignment}});

    addUser = user => {
        const {designSettings: {assignedUsers}} = this.context;

        this.context.setProjectDetails({
            designSettings: {
                ...this.context.designSettings,
                assignedUsers: [...assignedUsers, {id: user[0], email: user[1]}]
            }
        });
    };

    removeUser = user => {
        const {designSettings: {assignedUsers}} = this.context;
        this.context.setProjectDetails({
            designSettings: {
                ...this.context.designSettings,
                assignedUsers: assignedUsers.filter(u => u.id !== user.id)
            }
        });
    };

    assignPlotPercent = (user, percent) => {
        console.log("Assigning percentage: ", user, percent);
        const {designSettings: {assignedUsers}} = this.context;
        this.context.setProjectDetails({
            designSettings: {
                ...this.context.designSettings,
                // eslint-disable-next-line no-confusing-arrow
                assignedUsers: assignedUsers.map(u => u.id === user.id ? {...u, percent} : u)
            }
        });
    };

    renderUsers = (users, isPercentage) => (
        <div className="d-flex flex-column mt-3">
            {users.map(u => (
                <div key={u.id} className="d-flex justify-content-end">
                    {isPercentage && (
                        <div className="mr-5">
                            <input
                                className="form-control form-control-sm"
                                max="100"
                                min="0"
                                onChange={e => this.assignPlotPercent(u, parseInt(e.target.value))}
                                placeholder="%"
                                style={{display: "inline-block", width: "3.5rem"}}
                                type="number"
                                value={u.percent}
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
                        {u.email}
                    </div>
                    <button
                        className="btn btn-sm btn-danger mx-2"
                        onClick={() => this.removeUser(u)}
                        title={`Remove ${u}`}
                        type="button"
                    >
                        -
                    </button>
                </div>
            ))}
        </div>
    );

    render() {
        const assignments = [
            ["none", "No assignments"],
            ["equal", "Equal assignments"],
            ["percent", "Percentage of plots"]
        ];
        const {userAssignment, assignedUsers} = this.context.designSettings;
        const assignedUserIds = assignedUsers.map(user => user.id);
        const {allUsers} = this.props;
        const assignableUsers = allUsers.filter(u => !assignedUserIds.includes(u[0]));

        return (
            <div className="mr-3" style={{maxWidth: "50%"}}>
                <h3 className="mb-3">Assign Plots</h3>
                <div className="d-flex">
                    <Select
                        id="user-assignment"
                        label="User Assignment"
                        onChange={e => this.setUserAssignment(e.target.value)}
                        options={assignments}
                        value={userAssignment || "none"}
                    />
                </div>
                {userAssignment !== "none" && (
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
                                onClick={() => this.addUser(this.state.selectedUser)}
                                title="Add User"
                                type="button"
                            >
                                +
                            </button>
                        </div>
                        {this.renderUsers(assignedUsers, userAssignment === "percent")}
                    </div>
                )}
            </div>
        );
    }
}

AssignPlots.contextType = ProjectContext;
