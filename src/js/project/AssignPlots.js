import React from "react";

import {ProjectContext} from "./constants";
import Select from "../components/Select";
import UserSelect from "../components/UserSelect";
import {formatNumberWithCommas, removeAtIndex} from "../utils/generalUtils";
import {ButtonSvgIcon} from "../components/SvgIcon";

export default class AssignPlots extends React.Component {
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

    addUser = userId => {
        const {users, percents} = this.getUserAssignment();
        const newUsers = [...users, userId];
        const newPercents = [...percents, 0];
        this.setUserAssignment({users: newUsers, percents: newPercents});
    };

    removeUser = userId => {
        const {users, percents} = this.getUserAssignment();
        const idx = users.indexOf(userId);
        const newUsers = users.filter(u => u !== userId);
        this.setUserAssignment({
            users: newUsers,
            percents: removeAtIndex(percents, idx)
        });
    };

    assignPlotPercent = (userIndex, percent) => {
        const {percents} = this.getUserAssignment();
        percents[userIndex] = percent;
        this.setUserAssignment({percents});
    };

    renderAssignedUsers = (assignedUsers, isPercentage, percents, totalPlots) => (
        <div>
            {assignedUsers.map(({id, email}, userIndex) => {
                const numPlots = Math.round((percents[userIndex] / 100) * totalPlots);
                return (
                    <div key={id} className="form-row mt-1">
                        <div className="col-5">
                            {isPercentage && (
                                <div className="d-flex flex-column">
                                    <div className="ml-2">
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
                                    <div className="font-italic small ml-2">
                                        ~{formatNumberWithCommas(numPlots)} plots
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-5">
                            <div
                                style={{
                                    background: "white",
                                    border: "1px solid #ced4da",
                                    borderRadius: ".25rem",
                                    fontSize: ".875rem",
                                    overflow: "hidden",
                                    padding: ".25rem .5rem",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {email}
                            </div>
                        </div>
                        <div className="col-1">
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => this.removeUser(id)}
                                title={`Remove ${email}`}
                                type="button"
                            >
                                <ButtonSvgIcon icon="minus" size="0.75rem"/>
                            </button>
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
                <div className="form-row">
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
                        <UserSelect
                            addUser={this.addUser}
                            id="assigned-users"
                            label="Assigned Users"
                            possibleUsers={possibleUsers}
                        />
                        {this.renderAssignedUsers(assignedUsers, userMethod === "percent", percents, totalPlots)}
                        {userMethod === "equal" && assignedUsers.length > 0 && (
                            <p className="font-italic ml-2 mt-2 small">
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
