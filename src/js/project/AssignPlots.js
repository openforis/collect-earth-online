import React from "react";

import {ProjectContext} from "./constants";
import Select from "../components/Select";
import UserSelect from "../components/UserSelect";
import {formatNumberWithCommas, removeAtIndex} from "../utils/generalUtils";
import {ButtonSvgIcon} from "../components/svg/SvgIcon";

// TODO, two arrays for user and percent is probably not the best data structure.
//      Originally we had the percent array only added for by percent assignments.
//      Since making the component generic, we send percent for all type.  Therefore
//      There is no meaningful separate and a single array of objects makes more sense.
export default class AssignPlots extends React.Component {
    getQaqcAssignment = () => this.context.designSettings.qaqcAssignment;

    getUserAssignment = () => this.context.designSettings.userAssignment;

    setUserAssignment = (newUserAssignment, newQaqcAssignment = {}) => {
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
        const newUsers = [userId, ...users];
        const newPercents = [0, ...percents];
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

    assignPlotPercent = (userIdx, percent) => {
        const {percents} = this.getUserAssignment();
        percents[userIdx] = percent;
        this.setUserAssignment({percents});
    };

    renderUserRow = (idx, id, email, userMethod, percent = 0, totalPlots = 0) => (
        <div key={id} className="form-row mt-1">
            <div className="col-5">
                {userMethod === "percent" && (
                    <div className="d-flex flex-column">
                        <div className="ml-2">
                            <input
                                className="form-control form-control-sm"
                                max="100"
                                min="0"
                                onChange={e => this.assignPlotPercent(idx, parseInt(e.target.value))}
                                placeholder="%"
                                style={{display: "inline-block", width: "3.5rem"}}
                                type="number"
                                value={percent}
                            />
                                &#37;
                        </div>
                        <div className="font-italic small ml-2">
                                ~{formatNumberWithCommas(Math.round((percent / 100) * totalPlots))} plots
                        </div>
                    </div>
                )}
            </div>
            <div className="col-6">
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
                    <ButtonSvgIcon icon="minus" size="0.9rem"/>
                </button>
            </div>
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
        const {qaqcMethod, smes} = this.getQaqcAssignment();
        const possibleUsers = [
            {id: -1, email: "Select user..."},
            ...institutionUserList.filter(u => !users.includes(u.id) && (qaqcMethod !== "sme" || !smes.includes(u.id)))
        ];

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
                        <div>
                            {users.map((userId, idx) => {
                                const {email} = (institutionUserList.find(({id}) => userId === id) || {});
                                return this.renderUserRow(
                                    idx,
                                    userId,
                                    email,
                                    userMethod,
                                    percents[idx],
                                    totalPlots
                                );
                            })}
                        </div>
                        {userMethod === "equal" && users.length > 0 && (
                            <p className="font-italic ml-2 mt-2 small">
                                {`- Each user will be assigned ~${
                                    formatNumberWithCommas(Math.round(totalPlots / users.length))
                                    } plots.`}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
}

AssignPlots.contextType = ProjectContext;
